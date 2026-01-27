"""
API views for admin dashboard functionality
"""
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.contrib.auth.decorators import login_required, user_passes_test
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth import get_user_model
from django.db.models import Count, Q, Avg
from django.utils import timezone
from datetime import timedelta
import json

from .models import (
    InstructorProfile, Course, Lesson, Enrollment, 
    Category, LessonProgress
)

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
        'category': course.category.name if course.category else None,
        'level': course.level,
        'lesson_count': course.lessons.count(),
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
        'is_instructor': hasattr(user, 'instructor_profile'),
        'date_joined': user.date_joined.isoformat(),
        'last_login': user.last_login.isoformat() if user.last_login else None
    } for user in users]
    
    return JsonResponse({'users': data})
