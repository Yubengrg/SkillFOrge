import json
import re
from decimal import Decimal

from django.http import JsonResponse, HttpResponseNotAllowed
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.db import models

from .models import Course, Lesson, Enrollment, LessonProgress, Report


def parse_json(request):
    try:
        if not request.body:
            return {}
        return json.loads(request.body.decode())
    except json.JSONDecodeError:
        return {}


def require_auth(request):
    if not request.user.is_authenticated:
        return JsonResponse({"error": "authentication required"}, status=401)
    return None


def _youtube_thumbnail(url):
    if not url:
        return None
    match = re.search(
        r"(?:youtu\.be\/|youtube\.com(?:\/embed\/|\/v\/|\/watch\?v=|\/watch\?.+&v=))([^&\n?#]+)",
        url,
    )
    if not match:
        return None
    return f"https://img.youtube.com/vi/{match.group(1)}/hqdefault.jpg"


def serialize_lesson(lesson):
    thumbnail_url = lesson.thumbnail_url
    if not thumbnail_url and lesson.video_source == "youtube":
        thumbnail_url = _youtube_thumbnail(lesson.video_url)

    return {
        "id": lesson.id,
        "title": lesson.title,
        "description": lesson.description,
        "order": lesson.order,
        "is_published": lesson.is_published,
        "is_free": lesson.is_free,
        "video_url": lesson.video_url,
        "video_file": lesson.video_file.url if lesson.video_file else None,
        "video_source": lesson.video_source,
        "duration_minutes": lesson.duration_minutes,
        "thumbnail_url": thumbnail_url,
        "quiz_required": lesson.quiz_required,
    }


def serialize_course(course, include_modules=True, include_lessons=False):
    data = {
        "id": course.id,
        "title": course.title,
        "slug": course.slug,
        "description": course.description,
        "category": course.category.name if course.category else None,
        "level": course.level,
        "price_npr": course.price_npr,
        "price_paisa": course.price_npr * 100,
        "is_published": course.is_published,
        "created_at": course.created_at.isoformat(),
    }

    if include_modules:
        lessons = (
            [serialize_lesson(l) for l in course.lessons.all().order_by("order")]
            if include_lessons
            else []
        )
        data["modules"] = [
            {
                "id": None,
                "title": "Lessons",
                "order": 1,
                "lessons": lessons,
            }
        ]
    return data


# GET /api/courses/
def course_list(request):
    if request.method != "GET":
        return HttpResponseNotAllowed(["GET"])

    qs = Course.objects.filter(is_published=True).select_related("category")
    data = [serialize_course(c, include_modules=False) for c in qs]
    return JsonResponse({"courses": data}, status=200)


# GET /api/courses/<slug>/
def course_detail(request, slug):
    if request.method != "GET":
        return HttpResponseNotAllowed(["GET"])

    course = get_object_or_404(
        Course.objects.filter(is_published=True).select_related("category"),
        slug=slug,
    )
    data = serialize_course(course, include_modules=True, include_lessons=True)
    if request.user.is_authenticated:
        enrollment = Enrollment.objects.filter(
            user=request.user, course=course
        ).first()
        data["is_enrolled"] = bool(enrollment)
        if enrollment and data.get("modules"):
            lesson_ids = [
                lesson["id"]
                for module in data["modules"]
                for lesson in module.get("lessons", [])
                if lesson.get("id") is not None
            ]
            completed_ids = set(
                LessonProgress.objects.filter(
                    enrollment=enrollment,
                    lesson_id__in=lesson_ids,
                    is_completed=True,
                ).values_list("lesson_id", flat=True)
            )
            for module in data["modules"]:
                for lesson in module.get("lessons", []):
                    lesson["is_completed"] = lesson.get("id") in completed_ids
        elif data.get("modules"):
            for module in data["modules"]:
                for lesson in module.get("lessons", []):
                    lesson["is_completed"] = False
    else:
        data["is_enrolled"] = False
        if data.get("modules"):
            for module in data["modules"]:
                for lesson in module.get("lessons", []):
                    lesson["is_completed"] = False
    return JsonResponse(data, status=200)


# POST /api/courses/<slug>/enroll/
@csrf_exempt  # dev-only; for production, handle CSRF properly
def enroll_course(request, slug):
    if request.method != "POST":
        return HttpResponseNotAllowed(["POST"])

    auth_error = require_auth(request)
    if auth_error:
        return auth_error

    course = get_object_or_404(Course, slug=slug, is_published=True)
    if course.price_npr and course.price_npr > 0:
        return JsonResponse(
            {
                "error": "payment_required",
                "price_npr": course.price_npr,
                "price_paisa": course.price_npr * 100,
            },
            status=402,
        )
    enrollment, created = Enrollment.objects.get_or_create(
        user=request.user, course=course
    )
    return JsonResponse(
        {
            "id": enrollment.id,
            "course_id": course.id,
            "user_id": request.user.id,
            "progress_percent": float(enrollment.progress_percent),
            "started_at": enrollment.started_at.isoformat(),
            "completed_at": enrollment.completed_at.isoformat()
            if enrollment.completed_at
            else None,
            "created": created,
        },
        status=201 if created else 200,
    )


# GET /api/my/enrollments/
def my_enrollments(request):
    if request.method != "GET":
        return HttpResponseNotAllowed(["GET"])

    auth_error = require_auth(request)
    if auth_error:
        return auth_error

    qs = (
        Enrollment.objects.filter(user=request.user)
        .select_related("course", "course__category")
        .order_by("-started_at")
    )

    data = [
        {
            "course": serialize_course(e.course, include_modules=False),
            "progress_percent": float(e.progress_percent),
            "started_at": e.started_at.isoformat(),
            "completed_at": e.completed_at.isoformat()
            if e.completed_at
            else None,
        }
        for e in qs
    ]

    return JsonResponse({"enrollments": data}, status=200)


# POST /api/lessons/<id>/complete/
@csrf_exempt
def complete_lesson(request, lesson_id):
    if request.method != "POST":
        return HttpResponseNotAllowed(["POST"])

    auth_error = require_auth(request)
    if auth_error:
        return auth_error

    try:
        lesson = get_object_or_404(Lesson, id=lesson_id, is_published=True)
        course = lesson.course
        if not course:
            return JsonResponse(
                {"error": "Lesson is not linked to a course"},
                status=400,
            )

        # ensure enrollment exists
        enrollment, _ = Enrollment.objects.get_or_create(
            user=request.user, course=course
        )

        progress_qs = LessonProgress.objects.filter(
            enrollment=enrollment, lesson=lesson
        ).order_by("-id")
        lp = progress_qs.first()
        if lp is None:
            lp = LessonProgress(enrollment=enrollment, lesson=lesson)

        lp.is_completed = True
        lp.completed_at = timezone.now()
        lp.save()

        # recalc course progress
        total_lessons = Lesson.objects.filter(
            course=course, is_published=True
        ).count()
        completed_lessons = LessonProgress.objects.filter(
            enrollment=enrollment,
            lesson__course=course,
            is_completed=True,
        ).count()

        if total_lessons > 0:
            progress = (
                Decimal(completed_lessons) / Decimal(total_lessons)
            ) * 100
        else:
            progress = Decimal(0)

        enrollment.progress_percent = progress
        if progress >= 100 and enrollment.completed_at is None:
            enrollment.completed_at = timezone.now()
        enrollment.save()

        return JsonResponse(
            {
                "lesson_id": lesson.id,
                "course_id": course.id,
                "progress_percent": float(enrollment.progress_percent),
                "completed_lessons": completed_lessons,
                "total_lessons": total_lessons,
            },
            status=200,
        )
    except Exception as exc:
        return JsonResponse({"error": str(exc)}, status=500)


# POST /api/reports/
@csrf_exempt
def create_report(request):
    if request.method != "POST":
        return HttpResponseNotAllowed(["POST"])

    auth_error = require_auth(request)
    if auth_error:
        return auth_error

    data = parse_json(request)

    course_id = data.get("course_id")
    lesson_id = data.get("lesson_id")
    type_ = data.get("type", "other")
    message = data.get("message", "")

    if not course_id and not lesson_id:
        return JsonResponse(
            {"error": "course_id or lesson_id is required"}, status=400
        )

    course = None
    lesson = None
    if course_id:
        course = get_object_or_404(Course, id=course_id)
    if lesson_id:
        lesson = get_object_or_404(Lesson, id=lesson_id)

    report = Report.objects.create(
        reporter=request.user,
        course=course,
        lesson=lesson,
        type=type_,
        message=message,
    )

    return JsonResponse(
        {
            "id": report.id,
            "type": report.type,
            "message": report.message,
            "course_id": report.course_id,
            "lesson_id": report.lesson_id,
        },
        status=201,
    )


# GET /api/categories/
def category_list(request):
    """Get all categories that have at least one published course"""
    if request.method != "GET":
        return HttpResponseNotAllowed(["GET"])
    
    from .models import Category
    from django.db.models import Count
    
    # Only show categories that have at least one published course
    categories = Category.objects.annotate(
        course_count=Count('courses', filter=models.Q(courses__is_published=True))
    ).filter(course_count__gt=0).order_by('name')
    
    data = [{'id': cat.id, 'name': cat.name, 'slug': cat.slug} for cat in categories]
    
    return JsonResponse({'categories': data}, status=200)
