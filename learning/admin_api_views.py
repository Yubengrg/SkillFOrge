"""
API views for admin dashboard functionality
"""
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.contrib.auth.decorators import login_required, user_passes_test
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth import get_user_model
from django.contrib.sessions.models import Session
from django.utils.crypto import get_random_string
from django.db.models import Count, Q, Avg
from django.db.models.functions import TruncDate
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from datetime import timedelta
import json

from .models import (
    InstructorProfile, Course, Lesson, Enrollment,
    Category, LessonProgress, Report, Payment, Certificate,
    AdminActionLog
)
from profiles.models import Activity, UserProfile

User = get_user_model()


def is_admin(user):
    """Check if user is admin/staff"""
    return user.is_staff or user.is_superuser


# ============================================
# ADMIN STATS API
# ============================================
@login_required
@user_passes_test(is_admin)
@require_http_methods(["GET"])
def admin_stats(request):
    """Get platform statistics for admin dashboard"""
    
    # Calculate date ranges
    today = timezone.now().date()
    last_month = today - timedelta(days=30)
    
    # Total counts
    total_users = User.objects.count()
    total_courses = Course.objects.filter(is_published=True).count()
    total_enrollments = Enrollment.objects.count()
    total_instructors = InstructorProfile.objects.filter(is_approved=True).count()
    
    # Growth calculations (last 30 days)
    new_users_last_month = User.objects.filter(date_joined__gte=last_month).count()
    new_enrollments_last_month = Enrollment.objects.filter(started_at__gte=last_month).count()
    
    # Pending approvals
    pending_instructors = InstructorProfile.objects.filter(is_approved=False).count()
    pending_courses = Course.objects.filter(is_approved=False).count()
    
    # Average completion rate
    completed_enrollments = Enrollment.objects.filter(completed_at__isnull=False).count()
    completion_rate = (completed_enrollments / total_enrollments * 100) if total_enrollments > 0 else 0
    
    # Popular categories
    popular_categories = list(
        Course.objects.filter(is_published=True)
        .values('category__name')
        .annotate(count=Count('id'))
        .order_by('-count')[:5]
    )
    
    return JsonResponse({
        'stats': {
            'total_users': total_users,
            'total_courses': total_courses,
            'total_enrollments': total_enrollments,
            'total_instructors': total_instructors,
            'new_users_last_month': new_users_last_month,
            'new_enrollments_last_month': new_enrollments_last_month,
            'pending_instructors': pending_instructors,
            'pending_courses': pending_courses,
            'completion_rate': round(completion_rate, 1)
        },
        'popular_categories': popular_categories
    })


@login_required
@user_passes_test(is_admin)
@require_http_methods(["GET"])
def admin_overview(request):
    """Expanded admin dashboard payload."""
    today = timezone.now().date()
    start_day = today - timedelta(days=13)

    def date_series(qs, date_field):
        rows = (
            qs.annotate(day=TruncDate(date_field))
            .values("day")
            .annotate(count=Count("id"))
            .order_by("day")
        )
        counts = {row["day"]: row["count"] for row in rows}
        series = []
        for i in range(14):
            day = start_day + timedelta(days=i)
            series.append({"date": day.isoformat(), "count": counts.get(day, 0)})
        return series

    total_users = User.objects.count()
    total_courses = Course.objects.filter(is_published=True).count()
    total_enrollments = Enrollment.objects.count()
    total_instructors = InstructorProfile.objects.filter(is_approved=True).count()
    pending_instructors_count = InstructorProfile.objects.filter(is_approved=False).count()
    pending_courses_count = Course.objects.filter(is_approved=False).count()
    completed_enrollments = Enrollment.objects.filter(completed_at__isnull=False).count()
    completion_rate = (completed_enrollments / total_enrollments * 100) if total_enrollments > 0 else 0

    stats = {
        "total_users": total_users,
        "total_courses": total_courses,
        "total_enrollments": total_enrollments,
        "total_instructors": total_instructors,
        "pending_instructors": pending_instructors_count,
        "pending_courses": pending_courses_count,
        "completion_rate": round(completion_rate, 1),
    }

    trends = {
        "users": date_series(User.objects.all(), "date_joined"),
        "enrollments": date_series(Enrollment.objects.all(), "started_at"),
        "courses": date_series(Course.objects.all(), "created_at"),
    }

    instructors = InstructorProfile.objects.filter(is_approved=False).select_related("user")[:8]
    pending_instructors = [{
        "id": instructor.id,
        "user_id": instructor.user.id,
        "name": f"{instructor.user.first_name} {instructor.user.last_name}".strip() or instructor.user.email,
        "email": instructor.user.email,
        "bio": instructor.bio,
        "expertise": instructor.expertise,
        "profile_image_url": instructor.profile_image_url,
        "years_of_experience": instructor.years_of_experience,
        "linkedin_url": instructor.linkedin_url,
        "portfolio_url": instructor.portfolio_url,
        "resume_url": instructor.resume.url if instructor.resume else None,
        "certifications": instructor.certifications,
        "teaching_experience": instructor.teaching_experience,
        "why_teach": instructor.why_teach,
        "sample_course_topic": instructor.sample_course_topic,
        "created_at": instructor.created_at.isoformat()
    } for instructor in instructors]

    courses = Course.objects.filter(is_approved=False).select_related("instructor__user", "category").prefetch_related("lessons")[:8]
    pending_courses = [{
        "id": course.id,
        "title": course.title,
        "description": course.description,
        "instructor_name": f"{course.instructor.user.first_name} {course.instructor.user.last_name}".strip() if course.instructor else "Unknown",
        "instructor_email": course.instructor.user.email if course.instructor else None,
        "category": course.category.name if course.category else None,
        "level": course.level,
        "lesson_count": course.lessons.count(),
        "learning_objectives": course.learning_objectives,
        "estimated_duration_hours": course.estimated_duration_hours,
        "price_npr": course.price_npr,
        "is_published": course.is_published,
        "is_approved": course.is_approved,
        "created_at": course.created_at.isoformat()
    } for course in courses]

    reports = Report.objects.filter(is_resolved=False).select_related("course", "lesson", "reporter")[:6]
    report_data = [{
        "id": report.id,
        "type": report.type,
        "message": report.message,
        "created_at": report.created_at.isoformat(),
        "course_title": report.course.title if report.course else None,
        "lesson_title": report.lesson.title if report.lesson else None,
        "reporter": report.reporter.email,
    } for report in reports]

    return JsonResponse({
        "stats": stats,
        "trends": trends,
        "pending_instructors": pending_instructors,
        "pending_courses": pending_courses,
        "reports": report_data,
    })


# ============================================
# INSTRUCTOR MANAGEMENT APIs
# ============================================
@login_required
@user_passes_test(is_admin)
@require_http_methods(["GET"])
def pending_instructors(request):
    """Get list of pending instructor applications"""
    
    instructors = InstructorProfile.objects.filter(is_approved=False).select_related('user')
    
    data = [{
        'id': instructor.id,
        'user_id': instructor.user.id,
        'name': f"{instructor.user.first_name} {instructor.user.last_name}".strip() or instructor.user.email,
        'email': instructor.user.email,
        'bio': instructor.bio,
        'expertise': instructor.expertise,
        'profile_image_url': instructor.profile_image_url,
        'years_of_experience': instructor.years_of_experience,
        'linkedin_url': instructor.linkedin_url,
        'portfolio_url': instructor.portfolio_url,
        'resume_url': instructor.resume.url if instructor.resume else None,
        'certifications': instructor.certifications,
        'teaching_experience': instructor.teaching_experience,
        'why_teach': instructor.why_teach,
        'sample_course_topic': instructor.sample_course_topic,
        'created_at': instructor.created_at.isoformat()
    } for instructor in instructors]
    
    return JsonResponse({'instructors': data})


@csrf_exempt
@login_required
@user_passes_test(is_admin)
@require_http_methods(["POST"])
def approve_instructor(request, instructor_id):
    """Approve an instructor application"""
    
    try:
        instructor = InstructorProfile.objects.get(id=instructor_id)
        instructor.is_approved = True
        instructor.save()
        
        return JsonResponse({
            'success': True,
            'message': f'Instructor {instructor.user.email} approved successfully'
        })
    except InstructorProfile.DoesNotExist:
        return JsonResponse({'error': 'Instructor not found'}, status=404)


@csrf_exempt
@login_required
@user_passes_test(is_admin)
@require_http_methods(["POST"])
def reject_instructor(request, instructor_id):
    """Reject an instructor application"""
    
    try:
        instructor = InstructorProfile.objects.get(id=instructor_id)
        # For now, just delete the profile. You could also add a 'rejected' status
        instructor.delete()
        
        return JsonResponse({
            'success': True,
            'message': 'Instructor application rejected'
        })
    except InstructorProfile.DoesNotExist:
        return JsonResponse({'error': 'Instructor not found'}, status=404)


# ============================================
# COURSE APPROVAL APIs
# ============================================
@login_required
@user_passes_test(is_admin)
@require_http_methods(["GET"])
def pending_courses(request):
    """Get list of courses pending approval"""
    
    courses = Course.objects.filter(
        is_approved=False
    ).select_related('instructor__user', 'category').prefetch_related('lessons')
    
    data = [{
        'id': course.id,
        'title': course.title,
        'description': course.description,
        'instructor_name': f"{course.instructor.user.first_name} {course.instructor.user.last_name}".strip() if course.instructor else 'Unknown',
        'instructor_email': course.instructor.user.email if course.instructor else None,
        'category': course.category.name if course.category else None,
        'level': course.level,
        'lesson_count': course.lessons.count(),
        'learning_objectives': course.learning_objectives,
        'estimated_duration_hours': course.estimated_duration_hours,
        'price_npr': course.price_npr,
        'is_published': course.is_published,
        'is_approved': course.is_approved,
        'created_at': course.created_at.isoformat()
    } for course in courses]
    
    return JsonResponse({'courses': data})


@csrf_exempt
@login_required
@user_passes_test(is_admin)
@require_http_methods(["POST"])
def approve_course(request, course_id):
    """Approve a course"""
    
    try:
        course = Course.objects.get(id=course_id)
        course.is_approved = True
        course.is_published = True  # Also publish when approving
        course.save()
        
        return JsonResponse({
            'success': True,
            'message': f'Course "{course.title}" approved and published'
        })
    except Course.DoesNotExist:
        return JsonResponse({'error': 'Course not found'}, status=404)


@csrf_exempt
@login_required
@user_passes_test(is_admin)
@require_http_methods(["POST"])
def reject_course(request, course_id):
    """Reject a course"""
    
    try:
        data = json.loads(request.body)
        reason = data.get('reason', 'No reason provided')
        
        course = Course.objects.get(id=course_id)
        # You could store the rejection reason in a new field or just unpublish
        course.is_approved = False
        course.is_published = False
        course.save()
        
        return JsonResponse({
            'success': True,
            'message': f'Course "{course.title}" rejected'
        })
    except Course.DoesNotExist:
        return JsonResponse({'error': 'Course not found'}, status=404)
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON'}, status=400)


# ============================================
# USER MANAGEMENT API
# ============================================
@login_required
@user_passes_test(is_admin)
@require_http_methods(["GET"])
def all_users(request):
    """Get all users with filtering"""
    
    # Get query parameters
    search = request.GET.get('search', '')
    role = request.GET.get('role', '')  # 'admin', 'instructor', 'learner'
    
    users = User.objects.all()
    
    # Apply search filter
    if search:
        users = users.filter(
            Q(email__icontains=search) |
            Q(first_name__icontains=search) |
            Q(last_name__icontains=search)
        )
    
    # Apply role filter
    if role == 'admin':
        users = users.filter(is_staff=True)
    elif role == 'instructor':
        users = users.filter(instructor_profile__isnull=False)
    elif role == 'learner':
        users = users.filter(is_staff=False, instructor_profile__isnull=True)
    
    # Limit to 100 users for performance
    users = users[:100]
    
    data = [{
        'id': user.id,
        'email': user.email,
        'name': f"{user.first_name} {user.last_name}".strip() or user.email,
        'is_staff': user.is_staff,
        'is_superuser': user.is_superuser,
        'is_instructor': hasattr(user, 'instructor_profile'),
        'is_active': user.is_active,
        'date_joined': user.date_joined.isoformat(),
        'last_login': user.last_login.isoformat() if user.last_login else None
    } for user in users]
    
    return JsonResponse({'users': data})


def _log_admin_action(admin_user, target_user, action, metadata=None):
    AdminActionLog.objects.create(
        admin_user=admin_user,
        target_user=target_user,
        action=action,
        metadata=metadata or {},
    )


@login_required
@user_passes_test(is_admin)
@require_http_methods(["GET"])
def admin_user_detail(request, user_id):
    """Get detailed user profile for admin actions"""
    try:
        user = User.objects.get(id=user_id)
        instructor_profile = getattr(user, "instructor_profile", None)
        profile = UserProfile.objects.filter(user=user).first()

        enrollments = (
            Enrollment.objects.filter(user=user)
            .select_related("course")
            .order_by("-started_at")[:10]
        )
        payments = (
            Payment.objects.filter(user=user)
            .select_related("course")
            .order_by("-created_at")[:10]
        )
        certificates = (
            Certificate.objects.filter(user=user)
            .select_related("course")
            .order_by("-issued_at")[:10]
        )
        activities = Activity.objects.filter(user=user).order_by("-created_at")[:10]
        admin_actions = AdminActionLog.objects.filter(target_user=user).select_related("admin_user")[:10]

        return JsonResponse({
            "user": {
                "id": user.id,
                "email": user.email,
                "name": f"{user.first_name} {user.last_name}".strip() or user.email,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "is_staff": user.is_staff,
                "is_superuser": user.is_superuser,
                "is_active": user.is_active,
                "is_instructor": bool(instructor_profile),
                "instructor_approved": instructor_profile.is_approved if instructor_profile else False,
                "date_joined": user.date_joined.isoformat(),
                "last_login": user.last_login.isoformat() if user.last_login else None,
            },
            "profile": {
                "bio": profile.bio if profile else "",
                "location": profile.location if profile else "",
                "website": profile.website if profile else "",
                "profile_photo": profile.profile_photo.url if profile and profile.profile_photo else None,
                "social_links": profile.social_links if profile else {},
            },
            "enrollments": [{
                "course_id": e.course.id,
                "course_title": e.course.title,
                "progress_percent": float(e.progress_percent),
                "started_at": e.started_at.isoformat(),
                "completed_at": e.completed_at.isoformat() if e.completed_at else None,
            } for e in enrollments],
            "payments": [{
                "id": p.id,
                "course_title": p.course.title,
                "amount": float(p.amount),
                "currency": p.currency,
                "status": p.status,
                "provider": p.provider,
                "paid_at": p.paid_at.isoformat() if p.paid_at else None,
                "created_at": p.created_at.isoformat(),
            } for p in payments],
            "certificates": [{
                "id": c.certificate_id,
                "course_title": c.course.title,
                "completion_date": c.completion_date.isoformat(),
                "issued_at": c.issued_at.isoformat(),
                "final_score": c.final_score,
            } for c in certificates],
            "activities": [{
                "type": a.activity_type,
                "description": a.description,
                "created_at": a.created_at.isoformat(),
            } for a in activities],
            "admin_actions": [{
                "admin": action.admin_user.email,
                "action": action.action,
                "created_at": action.created_at.isoformat(),
                "metadata": action.metadata,
            } for action in admin_actions],
        })
    except User.DoesNotExist:
        return JsonResponse({"error": "User not found"}, status=404)


@csrf_exempt
@login_required
@user_passes_test(is_admin)
@require_http_methods(["POST"])
def admin_set_user_active(request, user_id):
    try:
        user = User.objects.get(id=user_id)
        data = json.loads(request.body)
        is_active = bool(data.get("is_active", True))
        user.is_active = is_active
        user.save()
        _log_admin_action(request.user, user, "set_active", {"is_active": is_active})
        return JsonResponse({"success": True})
    except User.DoesNotExist:
        return JsonResponse({"error": "User not found"}, status=404)
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON"}, status=400)


@csrf_exempt
@login_required
@user_passes_test(is_admin)
@require_http_methods(["POST"])
def admin_make_admin(request, user_id):
    try:
        user = User.objects.get(id=user_id)
        user.is_staff = True
        user.save()
        _log_admin_action(request.user, user, "make_admin")
        return JsonResponse({"success": True})
    except User.DoesNotExist:
        return JsonResponse({"error": "User not found"}, status=404)


@csrf_exempt
@login_required
@user_passes_test(is_admin)
@require_http_methods(["POST"])
def admin_remove_admin(request, user_id):
    try:
        user = User.objects.get(id=user_id)
        if user.id == request.user.id:
            return JsonResponse({"error": "You cannot remove your own admin role"}, status=400)
        user.is_staff = False
        user.save()
        _log_admin_action(request.user, user, "remove_admin")
        return JsonResponse({"success": True})
    except User.DoesNotExist:
        return JsonResponse({"error": "User not found"}, status=404)


@csrf_exempt
@login_required
@user_passes_test(is_admin)
@require_http_methods(["POST"])
def admin_approve_instructor(request, user_id):
    try:
        user = User.objects.get(id=user_id)
        instructor, _ = InstructorProfile.objects.get_or_create(user=user)
        instructor.is_approved = True
        instructor.save()
        _log_admin_action(request.user, user, "approve_instructor")
        return JsonResponse({"success": True})
    except User.DoesNotExist:
        return JsonResponse({"error": "User not found"}, status=404)


@csrf_exempt
@login_required
@user_passes_test(is_admin)
@require_http_methods(["POST"])
def admin_revoke_instructor(request, user_id):
    try:
        user = User.objects.get(id=user_id)
        instructor = InstructorProfile.objects.filter(user=user).first()
        if instructor:
            instructor.is_approved = False
            instructor.save()
        _log_admin_action(request.user, user, "revoke_instructor")
        return JsonResponse({"success": True})
    except User.DoesNotExist:
        return JsonResponse({"error": "User not found"}, status=404)


@csrf_exempt
@login_required
@user_passes_test(is_admin)
@require_http_methods(["POST"])
def admin_force_logout(request, user_id):
    try:
        user = User.objects.get(id=user_id)
        sessions = Session.objects.all()
        count = 0
        for session in sessions:
            data = session.get_decoded()
            if str(user.id) == str(data.get("_auth_user_id")):
                session.delete()
                count += 1
        _log_admin_action(request.user, user, "force_logout", {"sessions": count})
        return JsonResponse({"success": True, "sessions_cleared": count})
    except User.DoesNotExist:
        return JsonResponse({"error": "User not found"}, status=404)


@csrf_exempt
@login_required
@user_passes_test(is_admin)
@require_http_methods(["POST"])
def admin_reset_password(request, user_id):
    try:
        user = User.objects.get(id=user_id)
        temp_password = get_random_string(12)
        user.set_password(temp_password)
        user.save()
        _log_admin_action(request.user, user, "reset_password")
        return JsonResponse({"success": True, "temp_password": temp_password})
    except User.DoesNotExist:
        return JsonResponse({"error": "User not found"}, status=404)


@csrf_exempt
@login_required
@user_passes_test(is_admin)
@require_http_methods(["DELETE"])
def admin_delete_user(request, user_id):
    try:
        user = User.objects.get(id=user_id)
        if user.id == request.user.id:
            return JsonResponse({"error": "You cannot delete your own account"}, status=400)
        _log_admin_action(request.user, user, "delete_user", {"email": user.email})
        user.delete()
        return JsonResponse({"success": True})
    except User.DoesNotExist:
        return JsonResponse({"error": "User not found"}, status=404)


@login_required
@user_passes_test(is_admin)
@require_http_methods(["GET"])
def admin_export_user(request, user_id):
    try:
        user = User.objects.get(id=user_id)
        instructor_profile = getattr(user, "instructor_profile", None)
        profile = UserProfile.objects.filter(user=user).first()
        enrollments = Enrollment.objects.filter(user=user).select_related("course")
        payments = Payment.objects.filter(user=user).select_related("course")
        certificates = Certificate.objects.filter(user=user).select_related("course")
        activities = Activity.objects.filter(user=user)

        _log_admin_action(request.user, user, "export_user")

        return JsonResponse({
            "user": {
                "id": user.id,
                "email": user.email,
                "name": f"{user.first_name} {user.last_name}".strip() or user.email,
                "is_staff": user.is_staff,
                "is_superuser": user.is_superuser,
                "is_active": user.is_active,
                "is_instructor": bool(instructor_profile),
                "instructor_approved": instructor_profile.is_approved if instructor_profile else False,
                "date_joined": user.date_joined.isoformat(),
                "last_login": user.last_login.isoformat() if user.last_login else None,
            },
            "profile": {
                "bio": profile.bio if profile else "",
                "location": profile.location if profile else "",
                "website": profile.website if profile else "",
                "profile_photo": profile.profile_photo.url if profile and profile.profile_photo else None,
                "social_links": profile.social_links if profile else {},
            },
            "enrollments": [{
                "course_title": e.course.title,
                "progress_percent": float(e.progress_percent),
                "started_at": e.started_at.isoformat(),
                "completed_at": e.completed_at.isoformat() if e.completed_at else None,
            } for e in enrollments],
            "payments": [{
                "course_title": p.course.title,
                "amount": float(p.amount),
                "currency": p.currency,
                "status": p.status,
                "provider": p.provider,
                "paid_at": p.paid_at.isoformat() if p.paid_at else None,
                "created_at": p.created_at.isoformat(),
            } for p in payments],
            "certificates": [{
                "id": c.certificate_id,
                "course_title": c.course.title,
                "completion_date": c.completion_date.isoformat(),
                "issued_at": c.issued_at.isoformat(),
                "final_score": c.final_score,
            } for c in certificates],
            "activities": [{
                "type": a.activity_type,
                "description": a.description,
                "created_at": a.created_at.isoformat(),
            } for a in activities],
        })
    except User.DoesNotExist:
        return JsonResponse({"error": "User not found"}, status=404)


# ============================================
# PAYMENT MANAGEMENT API
# ============================================
@login_required
@user_passes_test(is_admin)
@require_http_methods(["GET"])
def admin_payments(request):
    """Get payments with filtering"""
    
    search = request.GET.get('search', '')
    status = request.GET.get('status', '')
    course_id = request.GET.get('course_id', '')
    limit = min(int(request.GET.get('limit', 100)), 200)

    payments = Payment.objects.select_related("user", "course", "enrollment")

    if search:
        payments = payments.filter(
            Q(user__email__icontains=search) |
            Q(course__title__icontains=search) |
            Q(provider_reference__icontains=search)
        )

    if status:
        payments = payments.filter(status=status)

    if course_id:
        payments = payments.filter(course_id=course_id)

    payments = payments[:limit]

    data = [{
        "id": payment.id,
        "user_id": payment.user.id,
        "user_email": payment.user.email,
        "course_id": payment.course.id,
        "course_title": payment.course.title,
        "enrollment_id": payment.enrollment.id,
        "amount": float(payment.amount),
        "currency": payment.currency,
        "status": payment.status,
        "provider": payment.provider,
        "provider_reference": payment.provider_reference,
        "paid_at": payment.paid_at.isoformat() if payment.paid_at else None,
        "created_at": payment.created_at.isoformat(),
        "updated_at": payment.updated_at.isoformat(),
    } for payment in payments]

    return JsonResponse({"payments": data})


@csrf_exempt
@login_required
@user_passes_test(is_admin)
@require_http_methods(["PUT", "POST"])
def admin_update_payment(request, payment_id):
    """Update a payment record"""
    try:
        payment = Payment.objects.select_related("user", "course").get(id=payment_id)
        data = json.loads(request.body)

        if "status" in data:
            payment.status = data["status"]
            if payment.status == "paid" and payment.paid_at is None:
                payment.paid_at = timezone.now()

        if "amount" in data:
            payment.amount = data["amount"]

        if "currency" in data:
            payment.currency = data["currency"]

        if "provider" in data:
            payment.provider = data["provider"]

        if "provider_reference" in data:
            payment.provider_reference = data["provider_reference"]

        if "paid_at" in data:
            paid_at = data["paid_at"]
            if isinstance(paid_at, str):
                parsed = parse_datetime(paid_at)
                payment.paid_at = parsed
            else:
                payment.paid_at = paid_at

        payment.save()

        return JsonResponse({
            "success": True,
            "message": "Payment updated successfully"
        })
    except Payment.DoesNotExist:
        return JsonResponse({"error": "Payment not found"}, status=404)
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON"}, status=400)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)
