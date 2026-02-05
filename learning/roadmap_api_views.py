"""
API views for roadmap functionality
"""
import uuid
import json
from django.http import JsonResponse, HttpResponseNotAllowed
from django.views.decorators.http import require_http_methods
from django.contrib.auth.decorators import login_required
from django.db.models import Q
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt

from .models import Course, Lesson, Enrollment, LessonProgress, RoadmapSlot, RoadmapCertificate
from profiles.models import Achievement
from .ai_services import RoadmapGenerator

MAX_SLOTS = 5
ROLE_OPTIONS = [
    {"role": "Frontend Developer", "tracks": ["JavaScript", "TypeScript", "React", "Vue", "Angular"]},
    {"role": "Backend Developer", "tracks": ["Python", "Node.js", "Java", "Go", "PHP"]},
    {"role": "Full Stack Developer", "tracks": ["JavaScript", "TypeScript", "Python", "Node.js"]},
    {"role": "Data Analyst", "tracks": ["Python", "SQL", "Excel", "Power BI", "Tableau"]},
    {"role": "Data Scientist", "tracks": ["Python", "R", "SQL", "Machine Learning"]},
    {"role": "UI/UX Designer", "tracks": ["Product Design", "UX Research", "UI Design"]},
    {"role": "DevOps Engineer", "tracks": ["AWS", "GCP", "Azure", "Kubernetes"]},
    {"role": "Mobile Developer", "tracks": ["React Native", "Flutter", "iOS (Swift)", "Android (Kotlin)"]},
]


def _normalize_words(text):
    return [w for w in ''.join([c.lower() if c.isalnum() else ' ' for c in text]).split() if len(w) > 3]


def _find_lesson_match(title):
    if not title:
        return None
    direct = Lesson.objects.filter(is_published=True, title__icontains=title).select_related("course").first()
    if direct:
        return direct
    words = _normalize_words(title)
    if not words:
        return None
    q = Q()
    for w in words:
        q |= Q(title__icontains=w)
    return Lesson.objects.filter(is_published=True).filter(q).select_related("course").first()


def _find_course_match(title):
    if not title:
        return None
    direct = Course.objects.filter(is_published=True, title__icontains=title).select_related("category").first()
    if direct:
        return direct
    words = _normalize_words(title)
    if not words:
        return None
    q = Q()
    for w in words:
        q |= Q(title__icontains=w) | Q(description__icontains=w)
    return Course.objects.filter(is_published=True).filter(q).select_related("category").first()


def _link_lesson_item(item):
    title = item.get("title", "")
    lesson = _find_lesson_match(title)
    if lesson:
        return {
            "title": title,
            "link_type": "lesson",
            "lesson_id": lesson.id,
            "course_id": lesson.course.id if lesson.course else None,
            "course_slug": lesson.course.slug if lesson.course else None,
            "course_title": lesson.course.title if lesson.course else None,
        }
    course = _find_course_match(title)
    if course:
        return {
            "title": title,
            "link_type": "course",
            "course_id": course.id,
            "course_slug": course.slug,
            "course_title": course.title,
        }
    return {
        "title": title,
        "link_type": "none",
    }


def _sync_completion(user, roadmap):
    completed_courses = set(
        Enrollment.objects.filter(user=user, completed_at__isnull=False).values_list("course_id", flat=True)
    )
    completed_lessons = set(
        LessonProgress.objects.filter(
            enrollment__user=user
        ).filter(
            Q(is_completed=True) | Q(quiz_passed=True)
        ).values_list("lesson_id", flat=True)
    )

    total_items = 0
    completed_items = 0

    for level in roadmap.get("levels", []):
        for module in level.get("modules", []):
            for lesson in module.get("lessons", []):
                total_items += 1
                link_type = lesson.get("link_type")
                is_done = False
                if link_type == "course" and lesson.get("course_id") in completed_courses:
                    is_done = True
                if link_type == "lesson" and lesson.get("lesson_id") in completed_lessons:
                    is_done = True
                lesson["completed"] = is_done
                if is_done:
                    completed_items += 1
            module_items = module.get("lessons", [])
            if module_items:
                module["progress"] = round(
                    sum(1 for l in module_items if l.get("completed")) / len(module_items) * 100, 1
                )
        level_items = [l for m in level.get("modules", []) for l in m.get("lessons", [])]
        if level_items:
            level["progress"] = round(
                sum(1 for l in level_items if l.get("completed")) / len(level_items) * 100, 1
            )

    roadmap["progress"] = round((completed_items / total_items * 100), 1) if total_items else 0
    roadmap["total_items"] = total_items
    roadmap["completed_items"] = completed_items
    return roadmap


def _refresh_links(roadmap):
    changed = False
    for level in roadmap.get("levels", []):
        for module in level.get("modules", []):
            refreshed = []
            for lesson in module.get("lessons", []):
                title = lesson.get("title", "")
                updated = _link_lesson_item({"title": title})
                if (
                    lesson.get("link_type") != updated.get("link_type")
                    or lesson.get("course_id") != updated.get("course_id")
                    or lesson.get("lesson_id") != updated.get("lesson_id")
                ):
                    changed = True
                refreshed.append(updated)
            module["lessons"] = refreshed
    return roadmap, changed


def _maybe_award_badges(user, slot, roadmap):
    badges = []
    completed = roadmap.get("completed_items", 0)
    total = roadmap.get("total_items", 0)

    def award(title, description, icon):
        Achievement.objects.get_or_create(
            user=user,
            achievement_type="milestone",
            title=title,
            defaults={"description": description, "icon": icon},
        )
        badges.append({"title": title, "description": description, "icon": icon})

    if completed >= 1:
        award(
            f"Roadmap Starter: {slot.name}",
            "Completed the first roadmap item.",
            "✨",
        )
    if completed >= 5:
        award(
            f"Roadmap Builder: {slot.name}",
            "Completed 5 roadmap items.",
            "🧩",
        )
    if total > 0 and completed == total:
        award(
            f"Roadmap Finisher: {slot.name}",
            "Completed the full roadmap.",
            "🏁",
        )

    return badges


def _maybe_issue_certificate(user, slot, roadmap):
    total = roadmap.get("total_items", 0)
    completed = roadmap.get("completed_items", 0)
    if total == 0 or completed < total:
        return None
    cert = getattr(slot, "certificate", None)
    if cert:
        return {
            "certificate_id": cert.certificate_id,
            "issued_at": cert.issued_at.isoformat(),
        }
    cert = RoadmapCertificate.objects.create(
        user=user,
        slot=slot,
        role=slot.role,
        certificate_id=str(uuid.uuid4()),
    )
    return {
        "certificate_id": cert.certificate_id,
        "issued_at": cert.issued_at.isoformat(),
    }


def _parse_json(request):
    try:
        if not request.body:
            return {}
        return json.loads(request.body.decode())
    except Exception:
        return {}


@login_required
@require_http_methods(["GET"])
def roadmap_roles(request):
    return JsonResponse({"roles": ROLE_OPTIONS})


@csrf_exempt
@login_required
@require_http_methods(["GET", "POST"])
def roadmap_slots(request):
    if request.method == "GET":
        slots = RoadmapSlot.objects.filter(user=request.user)
        data = [
            {
                "id": slot.id,
                "name": slot.name,
                "role": slot.role,
                "track": slot.track,
                "has_roadmap": bool(slot.roadmap_data),
                "created_at": slot.created_at.isoformat(),
            }
            for slot in slots
        ]
        return JsonResponse({"slots": data})

    if request.method == "POST":
        if RoadmapSlot.objects.filter(user=request.user).count() >= MAX_SLOTS:
            return JsonResponse({"error": "Maximum slots reached"}, status=400)
        payload = _parse_json(request)
        name = payload.get("name", "")
        role = payload.get("role", "")
        track = payload.get("track", "")
        if not name or not role:
            return JsonResponse({"error": "name and role are required"}, status=400)
        role_names = [r["role"] for r in ROLE_OPTIONS]
        if role not in role_names:
            return JsonResponse({"error": "Invalid role"}, status=400)
        slot = RoadmapSlot.objects.create(user=request.user, name=name, role=role, track=track)
        return JsonResponse({
            "id": slot.id,
            "name": slot.name,
            "role": slot.role,
            "track": slot.track,
            "has_roadmap": False,
        }, status=201)

    return HttpResponseNotAllowed(["GET", "POST"])


@csrf_exempt
@login_required
@require_http_methods(["PATCH", "DELETE", "GET"])
def roadmap_slot_detail(request, slot_id):
    try:
        slot = RoadmapSlot.objects.get(id=slot_id, user=request.user)
    except RoadmapSlot.DoesNotExist:
        return JsonResponse({"error": "Slot not found"}, status=404)

    if request.method == "GET":
        if not slot.roadmap_data:
            return JsonResponse({"slot": {"id": slot.id, "name": slot.name, "role": slot.role, "track": slot.track}, "roadmap": None})
        base_roadmap = json.loads(json.dumps(slot.roadmap_data))
        base_roadmap, changed = _refresh_links(base_roadmap)
        if changed:
            slot.roadmap_data = base_roadmap
            slot.save(update_fields=["roadmap_data", "updated_at"])
        roadmap = _sync_completion(request.user, dict(base_roadmap))
        badges = _maybe_award_badges(request.user, slot, roadmap)
        certificate = _maybe_issue_certificate(request.user, slot, roadmap)
        return JsonResponse({
            "slot": {"id": slot.id, "name": slot.name, "role": slot.role, "track": slot.track},
            "roadmap": roadmap,
            "badges": badges,
            "certificate": certificate,
        })

    if request.method == "PATCH":
        payload = _parse_json(request)
        name = payload.get("name")
        if name:
            slot.name = name
            slot.save(update_fields=["name", "updated_at"])
        return JsonResponse({"id": slot.id, "name": slot.name, "role": slot.role, "track": slot.track})

    if request.method == "DELETE":
        slot.delete()
        return JsonResponse({"success": True})

    return HttpResponseNotAllowed(["GET", "PATCH", "DELETE"])


@csrf_exempt
@login_required
@require_http_methods(["POST"])
def roadmap_generate(request, slot_id):
    try:
        slot = RoadmapSlot.objects.get(id=slot_id, user=request.user)
    except RoadmapSlot.DoesNotExist:
        return JsonResponse({"error": "Slot not found"}, status=404)

    generator = RoadmapGenerator()
    role_label = f"{slot.role} ({slot.track})" if slot.track else slot.role
    roadmap = generator.generate_roadmap(role_label)

    # Link roadmap items to courses/lessons
    for level in roadmap.get("levels", []):
        for module in level.get("modules", []):
            linked_lessons = []
            for lesson in module.get("lessons", []):
                linked_lessons.append(_link_lesson_item(lesson))
            module["lessons"] = linked_lessons

    slot.roadmap_data = roadmap
    slot.save()

    synced = _sync_completion(request.user, dict(roadmap))
    badges = _maybe_award_badges(request.user, slot, synced)
    certificate = _maybe_issue_certificate(request.user, slot, synced)

    return JsonResponse({
        "slot": {"id": slot.id, "name": slot.name, "role": slot.role, "track": slot.track},
        "roadmap": synced,
        "badges": badges,
        "certificate": certificate,
    })
