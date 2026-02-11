"""
API views for instructor dashboard functionality
"""
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.contrib.auth.decorators import login_required
from django.views.decorators.csrf import csrf_exempt
from django.db.models import Count, Avg, Prefetch, Q
from django.db.models.functions import TruncDate
from django.utils import timezone
from django.conf import settings
from datetime import timedelta
import json

from .models import (
    InstructorProfile, Course, Lesson, Enrollment,
    Category, LessonProgress, QuizAttempt, Quiz, Payment, Certificate
)


def is_approved_instructor(user):
    """Check if user is an approved instructor"""
    try:
        return user.instructor_profile.is_approved
    except:
        return False


# ============================================
# INSTRUCTOR STATS API
# ============================================
@login_required
@require_http_methods(["GET"])
def instructor_stats(request):
    """Get instructor's statistics"""
    
    # Check if user is an approved instructor
    try:
        instructor = request.user.instructor_profile
        if not instructor.is_approved:
            return JsonResponse({'error': 'Not an approved instructor'}, status=403)
    except:
        return JsonResponse({'error': 'Not an instructor'}, status=403)
    
    # Get instructor's courses
    courses = Course.objects.filter(instructor=instructor)
    
    # Calculate stats
    total_courses = courses.count()
    published_courses = courses.filter(is_published=True).count()
    pending_courses = courses.filter(is_approved=False).count()
    
    # Total students across all courses
    total_students = Enrollment.objects.filter(course__instructor=instructor).count()
    
    # Average rating (placeholder - you can implement ratings later)
    avg_rating = 4.5  # Placeholder
    
    return JsonResponse({
        'stats': {
            'total_courses': total_courses,
            'published_courses': published_courses,
            'pending_courses': pending_courses,
            'total_students': total_students,
            'avg_rating': avg_rating
        }
    })


@login_required
@require_http_methods(["GET"])
def instructor_overview(request):
    """Expanded instructor dashboard payload."""
    try:
        instructor = request.user.instructor_profile
        if not instructor.is_approved:
            return JsonResponse({'error': 'Not an approved instructor'}, status=403)
    except:
        return JsonResponse({'error': 'Not an instructor'}, status=403)

    courses = Course.objects.filter(instructor=instructor).select_related("category")
    total_courses = courses.count()
    published_courses = courses.filter(is_published=True).count()
    pending_courses = courses.filter(is_approved=False).count()
    total_students = Enrollment.objects.filter(course__instructor=instructor).count()

    avg_rating = 4.5

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

    enrollments = Enrollment.objects.filter(course__instructor=instructor)
    trends = {
        "enrollments": date_series(enrollments, "started_at"),
    }

    course_data = []
    for course in courses:
        course_enrollments = Enrollment.objects.filter(course=course)
        total_enrollments = course_enrollments.count()
        completed = course_enrollments.filter(completed_at__isnull=False).count()
        completion_rate = (completed / total_enrollments * 100) if total_enrollments > 0 else 0

        avg_progress = course_enrollments.aggregate(avg=Avg("progress_percent"))["avg"] or 0
        last_enrollment = course_enrollments.order_by("-started_at").values_list("started_at", flat=True).first()

        quizzes = Quiz.objects.filter(course=course)
        attempts = QuizAttempt.objects.filter(quiz__in=quizzes)
        total_attempts = attempts.count()
        passed_attempts = attempts.filter(passed=True).count()
        quiz_pass_rate = (passed_attempts / total_attempts * 100) if total_attempts > 0 else 0

        lesson_progress = LessonProgress.objects.filter(lesson__course=course)
        avg_watch = lesson_progress.aggregate(avg=Avg("watch_time_seconds"))["avg"] or 0

        course_data.append({
            "id": course.id,
            "title": course.title,
            "slug": course.slug,
            "category": course.category.name if course.category else None,
            "level": course.level,
            "is_published": course.is_published,
            "is_approved": course.is_approved,
            "price_npr": course.price_npr,
            "lesson_count": course.lessons.count(),
            "enrollments": total_enrollments,
            "completion_rate": round(completion_rate, 1),
            "avg_progress": round(float(avg_progress), 1),
            "quiz_pass_rate": round(quiz_pass_rate, 1),
            "avg_watch_seconds": round(avg_watch, 0),
            "last_enrollment": last_enrollment.isoformat() if last_enrollment else None,
        })

    top_courses = sorted(course_data, key=lambda c: c["enrollments"], reverse=True)[:6]

    return JsonResponse({
        "stats": {
            "total_courses": total_courses,
            "published_courses": published_courses,
            "pending_courses": pending_courses,
            "total_students": total_students,
            "avg_rating": avg_rating,
        },
        "trends": trends,
        "courses": top_courses,
    })


# ============================================
# INSTRUCTOR COURSES APIs
# ============================================
@login_required
@require_http_methods(["GET"])
def instructor_courses(request):
    """Get instructor's courses"""
    
    try:
        instructor = request.user.instructor_profile
        if not instructor.is_approved:
            return JsonResponse({'error': 'Not an approved instructor'}, status=403)
    except:
        return JsonResponse({'error': 'Not an instructor'}, status=403)
    
    courses = Course.objects.filter(instructor=instructor).select_related('category').prefetch_related('lessons')
    
    data = [{
        'id': course.id,
        'title': course.title,
        'slug': course.slug,
        'description': course.description,
        'category': course.category.name if course.category else None,
        'level': course.level,
        'is_published': course.is_published,
        'is_approved': course.is_approved,
        'price_npr': course.price_npr,
        'lesson_count': course.lessons.count(),
        'enrollment_count': course.enrollments.count(),
        'created_at': course.created_at.isoformat(),
        'updated_at': course.updated_at.isoformat()
    } for course in courses]
    
    return JsonResponse({'courses': data})


@csrf_exempt
@login_required
@require_http_methods(["POST"])
def create_course(request):
    """Create a new course"""
    
    try:
        instructor = request.user.instructor_profile
        if not instructor.is_approved:
            return JsonResponse({'error': 'Not an approved instructor'}, status=403)
    except:
        return JsonResponse({'error': 'Not an instructor'}, status=403)
    
    try:
        data = json.loads(request.body)
        
        # Get or create category
        category = None
        if data.get('category'):
            category, _ = Category.objects.get_or_create(name=data['category'])
        
        # Create course
        course = Course.objects.create(
            instructor=instructor,
            title=data['title'],
            description=data.get('description', ''),
            category=category,
            level=data.get('level', 'beginner'),
            learning_objectives=data.get('learning_objectives', []),
            estimated_duration_hours=data.get('estimated_duration_hours', 0),
            price_npr=int(data.get('price_npr', 0) or 0),
            is_published=False,  # Not published until approved
            is_approved=False  # Needs admin approval
        )
        
        return JsonResponse({
            'success': True,
            'course_id': course.id,
            'message': 'Course created successfully. Awaiting admin approval.'
        })
        
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON'}, status=400)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)


@csrf_exempt
@login_required
@require_http_methods(["PUT"])
def update_course(request, course_id):
    """Update a course"""
    
    try:
        instructor = request.user.instructor_profile
        if not instructor.is_approved:
            return JsonResponse({'error': 'Not an approved instructor'}, status=403)
    except:
        return JsonResponse({'error': 'Not an instructor'}, status=403)
    
    try:
        course = Course.objects.get(id=course_id, instructor=instructor)
        data = json.loads(request.body)
        
        # Update fields
        if 'title' in data:
            course.title = data['title']
        if 'description' in data:
            course.description = data['description']
        if 'category' in data:
            category, _ = Category.objects.get_or_create(name=data['category'])
            course.category = category
        if 'level' in data:
            course.level = data['level']
        if 'learning_objectives' in data:
            course.learning_objectives = data['learning_objectives']
        if 'estimated_duration_hours' in data:
            course.estimated_duration_hours = data['estimated_duration_hours']
        if 'price_npr' in data:
            course.price_npr = int(data.get('price_npr') or 0)
        
        # If course was previously approved and is being edited, mark as needing re-approval
        if course.is_approved:
            course.is_approved = False
            course.is_published = False
        
        course.save()
        
        return JsonResponse({
            'success': True,
            'message': 'Course updated successfully. Awaiting admin re-approval.'
        })
        
    except Course.DoesNotExist:
        return JsonResponse({'error': 'Course not found or not owned by you'}, status=404)
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON'}, status=400)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)


@csrf_exempt
@login_required
@require_http_methods(["DELETE"])
def delete_course(request, course_id):
    """Delete a course"""
    
    try:
        instructor = request.user.instructor_profile
        course = Course.objects.get(id=course_id, instructor=instructor)
        course.delete()
        
        return JsonResponse({
            'success': True,
            'message': 'Course deleted successfully'
        })
        
    except Course.DoesNotExist:
        return JsonResponse({'error': 'Course not found or not owned by you'}, status=404)


# ============================================
# LESSON MANAGEMENT APIs
# ============================================
@csrf_exempt
@login_required
@require_http_methods(["POST"])
def add_lesson(request, course_id):
    """Add a lesson to a course (supports both URL and file upload)"""

    try:
        def _parse_int(value, default=0):
            if value is None:
                return default
            if isinstance(value, int):
                return value
            text = str(value).strip()
            if not text:
                return default
            try:
                return int(text)
            except ValueError:
                return default

        instructor = request.user.instructor_profile
        course = Course.objects.get(id=course_id, instructor=instructor)
        
        # Check if this is a file upload (multipart/form-data) or JSON (URL)
        is_file_upload = request.content_type and 'multipart/form-data' in request.content_type
        
        if is_file_upload:
            # File upload - data comes from request.POST
            data = request.POST
            video_file = request.FILES.get('video_file')
            
            # Validate file if present
            if video_file:
                import os
                
                # Check file size
                if video_file.size > settings.MAX_VIDEO_FILE_SIZE:
                    return JsonResponse({
                        'error': f'File too large. Maximum size: {settings.MAX_VIDEO_FILE_SIZE / 1048576:.0f}MB'
                    }, status=400)
                
                # Check file extension
                ext = os.path.splitext(video_file.name)[1].lower()
                if ext not in settings.ALLOWED_VIDEO_EXTENSIONS:
                    return JsonResponse({
                        'error': f'Invalid file type. Allowed: {", ".join(settings.ALLOWED_VIDEO_EXTENSIONS)}'
                    }, status=400)
        else:
            # JSON data (URL-based)
            data = json.loads(request.body)
            video_file = None
        
        # Get the next order number
        max_order = course.lessons.aggregate(max_order=Count('order'))['max_order'] or 0
        
        # Determine video source
        video_source = data.get('video_source', 'youtube')
        if video_file:
            video_source = 'upload'
        
        # Convert string booleans to actual booleans (for form data)
        is_published = data.get('is_published')
        if isinstance(is_published, str):
            is_published = is_published.lower() in ['true', '1', 'yes']
        
        is_free = data.get('is_free')
        if isinstance(is_free, str):
            is_free = is_free.lower() in ['true', '1', 'yes']
        
        lesson = Lesson.objects.create(
            course=course,
            title=data['title'],
            description=data.get('description', ''),
            video_url=data.get('video_url', ''),
            video_file=video_file,
            video_source=video_source,
            video_transcript=data.get('video_transcript', ''),
            duration_minutes=_parse_int(data.get('duration_minutes', 0)),
            thumbnail_url=data.get('thumbnail_url', ''),
            order=max_order + 1,
            is_published=is_published if is_published is not None else True,
            is_free=is_free if is_free is not None else False
        )
        
        # Trigger automatic quiz generation if enabled
        quiz_generation_started = False
        if settings.AUTO_GENERATE_QUIZZES and lesson.quiz_required:
            from .quiz_tasks import generate_quiz_for_lesson
            try:
                # Run quiz generation (in production, use Celery for background processing)
                generate_quiz_for_lesson(lesson.id)
                quiz_generation_started = True
            except Exception as e:
                print(f"Error starting quiz generation: {str(e)}")
        
        return JsonResponse({
            'success': True,
            'lesson_id': lesson.id,
            'message': 'Lesson added successfully',
            'quiz_generation_started': quiz_generation_started
        })
        
    except Course.DoesNotExist:
        return JsonResponse({'error': 'Course not found or not owned by you'}, status=404)
    except KeyError as e:
        return JsonResponse({'error': f'Missing required field: {str(e)}'}, status=400)
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON'}, status=400)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)


# ============================================
# STUDENT ANALYTICS API
# ============================================
@login_required
@require_http_methods(["GET"])
def course_students(request, course_id):
    """Get students enrolled in a specific course"""
    
    try:
        instructor = request.user.instructor_profile
        course = Course.objects.get(id=course_id, instructor=instructor)
        
        enrollments = (
            Enrollment.objects.filter(course=course)
            .select_related('user')
            .prefetch_related(
                Prefetch("payments", queryset=Payment.objects.order_by("-created_at"))
            )
        )
        
        data = []
        for enrollment in enrollments:
            payment = enrollment.payments.all().first()
            try:
                certificate = enrollment.certificate
            except Certificate.DoesNotExist:
                certificate = None

            data.append({
                'id': enrollment.id,
                'student_name': f"{enrollment.user.first_name} {enrollment.user.last_name}".strip() or enrollment.user.email,
                'student_email': enrollment.user.email,
                'progress_percent': float(enrollment.progress_percent),
                'enrolled_at': enrollment.started_at.isoformat(),
                'completed_at': enrollment.completed_at.isoformat() if enrollment.completed_at else None,
                'payment': {
                    'id': payment.id if payment else None,
                    'amount': float(payment.amount) if payment else None,
                    'currency': payment.currency if payment else None,
                    'status': payment.status if payment else None,
                    'provider': payment.provider if payment else None,
                    'paid_at': payment.paid_at.isoformat() if payment and payment.paid_at else None,
                },
                'certificate': {
                    'id': certificate.certificate_id if certificate else None,
                    'issued_at': certificate.issued_at.isoformat() if certificate else None,
                    'completion_date': certificate.completion_date.isoformat() if certificate else None,
                    'final_score': certificate.final_score if certificate else None,
                }
            })
        
        return JsonResponse({'students': data})
        
    except Course.DoesNotExist:
        return JsonResponse({'error': 'Course not found or not owned by you'}, status=404)


# ============================================
# CATEGORIES API (for dropdowns)
# ============================================
@login_required
@require_http_methods(["GET"])
def get_categories(request):
    """Get all categories for dropdown"""
    
    categories = Category.objects.all().order_by('name')
    data = [{'id': cat.id, 'name': cat.name} for cat in categories]
    
    return JsonResponse({'categories': data})


# ============================================
# PAYMENT VISIBILITY (INSTRUCTOR)
# ============================================
@login_required
@require_http_methods(["GET"])
def instructor_payments(request):
    """Get payments for instructor's courses"""
    try:
        instructor = request.user.instructor_profile
        if not instructor.is_approved:
            return JsonResponse({'error': 'Not an approved instructor'}, status=403)
    except:
        return JsonResponse({'error': 'Not an instructor'}, status=403)

    search = request.GET.get('search', '')
    status = request.GET.get('status', '')
    course_id = request.GET.get('course_id', '')
    limit = min(int(request.GET.get('limit', 100)), 200)

    payments = Payment.objects.filter(course__instructor=instructor).select_related("user", "course", "enrollment")

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
    } for payment in payments]

    return JsonResponse({"payments": data})
# ============================================
# LESSON MANAGEMENT APIs
# ============================================

@csrf_exempt
@login_required
@require_http_methods(["GET"])
def get_course_lessons(request, course_id):
    """Get all lessons for a course (instructor only)"""
    try:
        instructor = request.user.instructor_profile
        course = Course.objects.get(id=course_id, instructor=instructor)
        
        lessons = course.lessons.all().order_by('order')
        
        lessons_data = [{
            'id': lesson.id,
            'title': lesson.title,
            'description': lesson.description,
            'video_url': lesson.video_url,
            'video_file': lesson.video_file.url if lesson.video_file else None,
            'video_source': lesson.video_source,
            'duration_minutes': lesson.duration_minutes,
            'thumbnail_url': lesson.thumbnail_url,
            'order': lesson.order,
            'is_published': lesson.is_published,
            'is_free': lesson.is_free,
        } for lesson in lessons]
        
        return JsonResponse({'lessons': lessons_data})
        
    except Course.DoesNotExist:
        return JsonResponse({'error': 'Course not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)


@csrf_exempt
@login_required
@csrf_exempt
@login_required
@require_http_methods(["PUT", "POST"])  # Added POST for FormData fallback if needed
def update_lesson(request, lesson_id):
    """Update a lesson"""
    try:
        instructor = request.user.instructor_profile
        lesson = Lesson.objects.get(id=lesson_id, course__instructor=instructor)
        
        # Handle both JSON and FormData
        if request.content_type == 'application/json':
            data = json.loads(request.body)
        else:
            data = request.POST
            
        # Update fields
        lesson.title = data.get('title', lesson.title)
        lesson.description = data.get('description', lesson.description)
        lesson.video_url = data.get('video_url', lesson.video_url)
        lesson.video_source = data.get('video_source', lesson.video_source)
        lesson.video_transcript = data.get('video_transcript', lesson.video_transcript)
        lesson.duration_minutes = data.get('duration_minutes', lesson.duration_minutes)
        lesson.thumbnail_url = data.get('thumbnail_url', lesson.thumbnail_url)
        
        # Handle numeric/boolean conversion for FormData
        if 'is_published' in data:
            val = data['is_published']
            lesson.is_published = val.lower() in ['true', '1', 'yes'] if isinstance(val, str) else bool(val)
        
        if 'is_free' in data:
            val = data['is_free']
            lesson.is_free = val.lower() in ['true', '1', 'yes'] if isinstance(val, str) else bool(val)

        # Handle video file update
        if 'video_file' in request.FILES:
            lesson.video_file = request.FILES['video_file']
            lesson.video_source = 'upload'
        
        lesson.save()
        
        # Trigger quiz regeneration if transcript changed and it's automated
        if lesson.quiz_required and lesson.video_transcript:
            from .quiz_tasks import generate_quiz_for_lesson
            # Regenerate in background
            generate_quiz_for_lesson(lesson.id)

        return JsonResponse({
            'success': True,
            'message': 'Lesson updated successfully'
        })
        
    except Lesson.DoesNotExist:
        return JsonResponse({'error': 'Lesson not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)


@csrf_exempt
@login_required
@require_http_methods(["DELETE"])
def delete_lesson(request, lesson_id):
    """Delete a lesson"""
    try:
        instructor = request.user.instructor_profile
        lesson = Lesson.objects.get(id=lesson_id, course__instructor=instructor)
        
        lesson.delete()
        
        return JsonResponse({
            'success': True,
            'message': 'Lesson deleted successfully'
        })
        
    except Lesson.DoesNotExist:
        return JsonResponse({'error': 'Lesson not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)


@csrf_exempt
@login_required
@require_http_methods(["POST"])
def reorder_lesson(request, lesson_id):
    """Change lesson order"""
    try:
        instructor = request.user.instructor_profile
        lesson = Lesson.objects.get(id=lesson_id, course__instructor=instructor)
        
        data = json.loads(request.body)
        new_order = data.get('order')
        
        if new_order is None:
            return JsonResponse({'error': 'Order is required'}, status=400)
        
        lesson.order = new_order
        lesson.save()
        
        return JsonResponse({
            'success': True,
            'message': 'Lesson reordered successfully'
        })
        
    except Lesson.DoesNotExist:
        return JsonResponse({'error': 'Lesson not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)
