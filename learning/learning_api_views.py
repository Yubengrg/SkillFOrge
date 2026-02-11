"""
Learning API Views - For student course learning experience
Handles lessons, quizzes, progress tracking, and certificates
"""
import json
import re
import uuid
from datetime import date
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.shortcuts import get_object_or_404
from django.db.models import Avg, Count, Q

from .models import (
    Course, Lesson, Quiz, Question, AnswerOption,
    QuizAttempt, Enrollment, LessonProgress, Certificate
)
from .quiz_tasks import generate_quiz_for_lesson

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

def _lesson_thumbnail(lesson):
    if lesson.thumbnail_url:
        return lesson.thumbnail_url
    if lesson.video_source == "youtube":
        return _youtube_thumbnail(lesson.video_url)
    return None


# ============================================
# LESSON APIs
# ============================================

@login_required
def course_lessons(request, slug):
    """Get all lessons for a course."""
    try:
        course = get_object_or_404(Course, slug=slug)
        
        # Check if user is enrolled
        enrollment = Enrollment.objects.filter(
            user=request.user,
            course=course
        ).first()
        
        if not enrollment:
            return JsonResponse({
                "error": "You must be enrolled in this course"
            }, status=403)
        
        # Get all lessons
        lessons = course.lessons.filter(is_published=True).order_by('order')
        
        # Get user's progress for each lesson
        lesson_data = []
        for lesson in lessons:
            progress = LessonProgress.objects.filter(
                enrollment=enrollment,
                lesson=lesson
            ).first()
            
            # Create progress if it doesn't exist
            if not progress:
                progress = LessonProgress.objects.create(
                    enrollment=enrollment,
                    lesson=lesson
                )
            
            lesson_data.append({
                "id": lesson.id,
                "title": lesson.title,
                "description": lesson.description,
                "video_url": lesson.video_url,
                "video_file": lesson.video_file.url if lesson.video_file else None,
                "video_source": lesson.video_source,
                "thumbnail_url": _lesson_thumbnail(lesson),
                "duration_minutes": lesson.duration_minutes,
                "order": lesson.order,
                "is_completed": progress.quiz_passed if lesson.quiz_required else progress.is_completed,
                "is_unlocked": progress.is_unlocked(),
                "last_position_seconds": progress.last_position_seconds,
                # Quiz information
                "quiz_required": lesson.quiz_required,
                "quiz_passed": progress.quiz_passed,
                "quiz_attempts": progress.quiz_attempts,
                "best_quiz_score": float(progress.best_quiz_score),
                "quiz_generation_status": lesson.quiz_generation_status,
            })
        
        return JsonResponse({
            "lessons": lesson_data,
            "total_lessons": len(lesson_data),
            "course_title": course.title,
        })
        
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


@login_required
def lesson_detail(request, lesson_id):
    """Get detailed lesson information."""
    try:
        lesson = get_object_or_404(Lesson, id=lesson_id)
        
        # Check enrollment
        enrollment = Enrollment.objects.filter(
            user=request.user,
            course=lesson.course
        ).first()
        
        if not enrollment:
            return JsonResponse({
                "error": "You must be enrolled in this course"
            }, status=403)
        
        # Get progress
        progress = LessonProgress.objects.filter(
            enrollment=enrollment,
            lesson=lesson
        ).first()
        
        # Get next and previous lessons
        next_lesson = Lesson.objects.filter(
            course=lesson.course,
            order__gt=lesson.order,
            is_published=True
        ).order_by('order').first()
        
        prev_lesson = Lesson.objects.filter(
            course=lesson.course,
            order__lt=lesson.order,
            is_published=True
        ).order_by('-order').first()
        
        return JsonResponse({
            "lesson": {
                "id": lesson.id,
                "title": lesson.title,
                "description": lesson.description,
                "video_url": lesson.video_url,
                "video_file": lesson.video_file.url if lesson.video_file else None,
                "video_source": lesson.video_source,
                "thumbnail_url": _lesson_thumbnail(lesson),
                "duration_minutes": lesson.duration_minutes,
                "order": lesson.order,
                "is_completed": progress.is_completed if progress else False,
                "last_position_seconds": progress.last_position_seconds if progress else 0,
            },
            "next_lesson_id": next_lesson.id if next_lesson else None,
            "prev_lesson_id": prev_lesson.id if prev_lesson else None,
        })
        
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


@csrf_exempt
@login_required
def complete_lesson(request, lesson_id):
    """Mark a lesson as complete."""
    if request.method != "POST":
        return JsonResponse({"error": "POST required"}, status=405)
    
    try:
        lesson = get_object_or_404(Lesson, id=lesson_id)
        
        # Get enrollment
        enrollment = Enrollment.objects.filter(
            user=request.user,
            course=lesson.course
        ).first()
        
        if not enrollment:
            return JsonResponse({
                "error": "You must be enrolled in this course"
            }, status=403)
        
        # Prevent marking complete if quiz is required
        if lesson.quiz_required:
            return JsonResponse({
                "error": "This lesson requires passing a quiz to be marked as complete"
            }, status=400)
        
        # Create or update progress
        progress, created = LessonProgress.objects.get_or_create(
            enrollment=enrollment,
            lesson=lesson
        )
        
        progress.is_completed = True
        progress.save()
        
        # Update course progress percentage
        total_lessons = lesson.course.lessons.filter(is_published=True).count()
        completed_lessons = LessonProgress.objects.filter(
            enrollment=enrollment,
            is_completed=True
        ).count()
        
        if total_lessons > 0:
            enrollment.progress_percent = (completed_lessons / total_lessons) * 100
            enrollment.save()
        
        return JsonResponse({
            "message": "Lesson marked as complete",
            "progress_percent": float(enrollment.progress_percent),
        })
        
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


@csrf_exempt
@login_required
def update_lesson_position(request, lesson_id):
    """Update video playback position for resume functionality."""
    if request.method != "POST":
        return JsonResponse({"error": "POST required"}, status=405)
    
    try:
        data = json.loads(request.body)
        position = data.get("position_seconds", 0)
        
        lesson = get_object_or_404(Lesson, id=lesson_id)
        enrollment = Enrollment.objects.filter(
            user=request.user,
            course=lesson.course
        ).first()
        
        if not enrollment:
            return JsonResponse({"error": "Not enrolled"}, status=403)
        
        progress, created = LessonProgress.objects.get_or_create(
            enrollment=enrollment,
            lesson=lesson
        )
        
        progress.last_position_seconds = position
        progress.save()
        
        return JsonResponse({"message": "Position updated"})
        
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


# ============================================
# QUIZ APIs
# ============================================

@login_required
def lesson_quiz(request, lesson_id):
    """Get quiz for a specific lesson."""
    try:
        lesson = get_object_or_404(Lesson, id=lesson_id)
        
        # Check enrollment
        enrollment = Enrollment.objects.filter(
            user=request.user,
            course=lesson.course
        ).first()
        
        if not enrollment:
            return JsonResponse({
                "error": "You must be enrolled in this course"
            }, status=403)
        
        # Get quiz for this lesson
        quiz = Quiz.objects.filter(lesson=lesson).first()

        if not quiz:
            if not lesson.quiz_required:
                return JsonResponse({
                    "error": "No quiz required for this lesson",
                    "quiz_generation_status": lesson.quiz_generation_status
                }, status=404)

            # Auto-generate quiz when missing
            try:
                lesson.quiz_generation_status = "processing"
                lesson.save(update_fields=["quiz_generation_status"])
                generated = generate_quiz_for_lesson(lesson.id)
            except Exception as e:
                lesson.quiz_generation_status = "failed"
                lesson.save(update_fields=["quiz_generation_status"])
                return JsonResponse({
                    "error": f"Quiz generation failed: {str(e)}",
                    "quiz_generation_status": lesson.quiz_generation_status
                }, status=500)

            quiz = Quiz.objects.filter(lesson=lesson).first()
            if not quiz:
                return JsonResponse({
                    "error": "Quiz is being generated. Please try again shortly.",
                    "quiz_generation_status": lesson.quiz_generation_status,
                    "generated": bool(generated),
                }, status=202)
        
        # Return quiz data (redirect to quiz_detail logic)
        questions_data = []
        for question in quiz.questions.all().order_by('order'):
            options_data = []
            for option in question.options.all().order_by('order'):
                options_data.append({
                    "id": option.id,
                    "answer_text": option.answer_text,
                    "order": option.order,
                })
            
            questions_data.append({
                "id": question.id,
                "question_text": question.question_text,
                "question_type": question.question_type,
                "points": question.points,
                "order": question.order,
                "options": options_data,
            })
        
        return JsonResponse({
            "quiz_id": quiz.id,
            "title": quiz.title,
            "description": quiz.description,
            "passing_score": quiz.passing_score,
            "questions": questions_data,
            "total_questions": len(questions_data),
        })
        
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)


@login_required
def quiz_detail(request, quiz_id):
    """Get quiz with questions and options."""
    try:
        quiz = get_object_or_404(Quiz, id=quiz_id)
        
        # Check enrollment
        enrollment = Enrollment.objects.filter(
            user=request.user,
            course=quiz.course
        ).first()
        
        if not enrollment:
            return JsonResponse({
                "error": "You must be enrolled in this course"
            }, status=403)
        
        # Get questions with options
        questions_data = []
        for question in quiz.questions.all().order_by('order'):
            options_data = []
            for option in question.options.all().order_by('order'):
                options_data.append({
                    "id": option.id,
                    "answer_text": option.answer_text,
                    "order": option.order,
                })
            
            questions_data.append({
                "id": question.id,
                "question_text": question.question_text,
                "question_type": question.question_type,
                "points": question.points,
                "order": question.order,
                "options": options_data,
            })
        
        # Get user's previous attempts
        attempts = QuizAttempt.objects.filter(
            user=request.user,
            quiz=quiz
        ).order_by('-completed_at')[:5]
        
        attempts_data = [{
            "id": attempt.id,
            "score": attempt.score,
            "passed": attempt.passed,
            "completed_at": attempt.completed_at.isoformat(),
        } for attempt in attempts]
        
        return JsonResponse({
            "quiz": {
                "id": quiz.id,
                "title": quiz.title,
                "description": quiz.description,
                "passing_score": quiz.passing_score,
                "is_required": quiz.is_required,
            },
            "questions": questions_data,
            "previous_attempts": attempts_data,
        })
        
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


@csrf_exempt
@login_required
def submit_quiz(request, quiz_id):
    """Submit quiz answers and calculate score."""
    if request.method != "POST":
        return JsonResponse({"error": "POST required"}, status=405)
    
    try:
        data = json.loads(request.body)
        answers = data.get("answers", [])  # [{question_id: 1, answer_id: 2}, ...]
        
        quiz = get_object_or_404(Quiz, id=quiz_id)
        
        # Get enrollment
        enrollment = Enrollment.objects.filter(
            user=request.user,
            course=quiz.course
        ).first()
        
        if not enrollment:
            return JsonResponse({
                "error": "You must be enrolled in this course"
            }, status=403)
        
        # Calculate score
        total_points = 0
        earned_points = 0
        results = []
        
        for question in quiz.questions.all():
            total_points += question.points
            
            # Find user's answer for this question
            user_answer = next(
                (a for a in answers if a.get("question_id") == question.id),
                None
            )
            
            if user_answer:
                answer_id = user_answer.get("answer_id")
                correct_option = question.options.filter(is_correct=True).first()
                selected_option = question.options.filter(id=answer_id).first()
                
                is_correct = selected_option and selected_option.is_correct
                
                if is_correct:
                    earned_points += question.points
                
                results.append({
                    "question_id": question.id,
                    "question_text": question.question_text,
                    "selected_answer_id": answer_id,
                    "correct_answer_id": correct_option.id if correct_option else None,
                    "is_correct": is_correct,
                    "explanation": question.explanation,
                })
        
        # Calculate percentage
        score_percent = (earned_points / total_points * 100) if total_points > 0 else 0
        passed = score_percent >= quiz.passing_score
        
        # Save attempt
        attempt = QuizAttempt.objects.create(
            user=request.user,
            quiz=quiz,
            enrollment=enrollment,
            score=score_percent,
            points_earned=earned_points,
            total_points=total_points,
            passed=passed,
            answers=answers
        )
        
        # If quiz is linked to a lesson and student passed, mark lesson complete
        lesson_completed = False
        new_progress_percent = enrollment.progress_percent
        
        if passed and quiz.lesson:
            lesson = quiz.lesson
            progress, created = LessonProgress.objects.get_or_create(
                enrollment=enrollment,
                lesson=lesson
            )
            
            # Update progress
            progress.quiz_passed = True
            progress.is_completed = True
            progress.quiz_attempts += 1
            progress.best_quiz_score = max(progress.best_quiz_score, score_percent)
            
            if not progress.completed_at:
                from django.utils import timezone
                progress.completed_at = timezone.now()
            
            progress.save()
            lesson_completed = True
            
            # Update overall course progress
            total_lessons = lesson.course.lessons.filter(is_published=True).count()
            
            if total_lessons > 0:
                completed_count = LessonProgress.objects.filter(
                    enrollment=enrollment,
                    is_completed=True
                ).count()
                
                new_progress_percent = (completed_count / total_lessons) * 100
                enrollment.progress_percent = new_progress_percent
                enrollment.save()
        
        return JsonResponse({
            "attempt_id": attempt.id,
            "score": score_percent,
            "points_earned": earned_points,
            "total_points": total_points,
            "passed": passed,
            "passing_score": quiz.passing_score,
            "results": results,
            "lesson_completed": lesson_completed,
            "progress_percent": float(new_progress_percent),
        })
        
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


# ============================================
# PROGRESS APIs
# ============================================

@login_required
def course_progress(request, slug):
    """Get detailed progress for a course."""
    try:
        course = get_object_or_404(Course, slug=slug)
        
        enrollment = Enrollment.objects.filter(
            user=request.user,
            course=course
        ).first()
        
        if not enrollment:
            return JsonResponse({
                "error": "You must be enrolled in this course"
            }, status=403)
        
        # Lesson progress
        total_lessons = course.lessons.filter(is_published=True).count()
        completed_lessons = LessonProgress.objects.filter(
            enrollment=enrollment,
            is_completed=True
        ).count()
        
        # Quiz progress
        total_quizzes = course.quizzes.filter(is_required=True).count()
        passed_quizzes = QuizAttempt.objects.filter(
            user=request.user,
            quiz__course=course,
            quiz__is_required=True,
            passed=True
        ).values('quiz').distinct().count()
        
        # Calculate overall progress
        lesson_progress = (completed_lessons / total_lessons * 100) if total_lessons > 0 else 0
        quiz_progress = (passed_quizzes / total_quizzes * 100) if total_quizzes > 0 else 0
        # Keep overall progress consistent with Enrollment.progress_percent (lesson completion based)
        overall_progress = float(enrollment.progress_percent or 0)
        
        # Check if course is complete
        is_complete = (completed_lessons == total_lessons and 
                      passed_quizzes == total_quizzes and
                      total_lessons > 0)
        
        return JsonResponse({
            "progress_percent": overall_progress,
            "lessons": {
                "total": total_lessons,
                "completed": completed_lessons,
                "percent": lesson_progress,
            },
            "quizzes": {
                "total": total_quizzes,
                "passed": passed_quizzes,
                "percent": quiz_progress,
            },
            "is_complete": is_complete,
        })
        
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


@login_required
def my_progress(request):
    """Get progress for all enrolled courses."""
    try:
        enrollments = Enrollment.objects.filter(user=request.user)
        
        courses_data = []
        for enrollment in enrollments:
            course = enrollment.course
            
            # Calculate progress
            total_lessons = course.lessons.filter(is_published=True).count()
            completed_lessons = LessonProgress.objects.filter(
                enrollment=enrollment,
                is_completed=True
            ).count()
            
            progress_percent = (completed_lessons / total_lessons * 100) if total_lessons > 0 else 0
            
            # Get last accessed lesson
            last_progress = LessonProgress.objects.filter(
                enrollment=enrollment
            ).order_by('-id').first()
            
            courses_data.append({
                "course_id": course.id,
                "course_title": course.title,
                "course_slug": course.slug,
                "progress_percent": progress_percent,
                "total_lessons": total_lessons,
                "completed_lessons": completed_lessons,
                "last_accessed": enrollment.last_accessed.isoformat(),
                "last_lesson_id": last_progress.lesson.id if last_progress else None,
            })
        
        return JsonResponse({
            "courses": courses_data,
            "total_enrollments": len(courses_data),
        })
        
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


# ============================================
# CERTIFICATE APIs
# ============================================

@login_required
def get_certificate(request, certificate_id):
    """Get certificate details."""
    try:
        certificate = get_object_or_404(
            Certificate,
            certificate_id=certificate_id,
            user=request.user
        )
        
        return JsonResponse({
            "certificate": {
                "id": certificate.certificate_id,
                "course_title": certificate.course.title,
                "student_name": request.user.get_full_name() or request.user.email,
                "completion_date": certificate.completion_date.isoformat(),
                "issued_at": certificate.issued_at.isoformat(),
                "final_score": certificate.final_score,
            }
        })
        
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


@login_required
def course_certificate(request, slug):
    """Get or generate certificate for a completed course."""
    try:
        course = get_object_or_404(Course, slug=slug)
        
        enrollment = Enrollment.objects.filter(
            user=request.user,
            course=course
        ).first()
        
        if not enrollment:
            return JsonResponse({
                "error": "You must be enrolled in this course"
            }, status=403)
        
        # Check if course is complete
        total_lessons = course.lessons.filter(is_published=True).count()
        completed_lessons = LessonProgress.objects.filter(
            enrollment=enrollment,
            is_completed=True
        ).count()
        
        total_quizzes = course.quizzes.filter(is_required=True).count()
        passed_quizzes = QuizAttempt.objects.filter(
            user=request.user,
            quiz__course=course,
            quiz__is_required=True,
            passed=True
        ).values('quiz').distinct().count()
        
        is_complete = (completed_lessons == total_lessons and 
                      passed_quizzes == total_quizzes and
                      total_lessons > 0)
        
        if not is_complete:
            return JsonResponse({
                "error": "Course not yet complete",
                "progress": {
                    "lessons": f"{completed_lessons}/{total_lessons}",
                    "quizzes": f"{passed_quizzes}/{total_quizzes}",
                }
            }, status=400)
        
        # Get or create certificate
        certificate, created = Certificate.objects.get_or_create(
            user=request.user,
            course=course,
            enrollment=enrollment,
            defaults={
                "certificate_id": f"CERT-{uuid.uuid4().hex[:12].upper()}",
                "completion_date": date.today(),
            }
        )
        
        # Calculate average quiz score
        if created:
            avg_score = QuizAttempt.objects.filter(
                user=request.user,
                quiz__course=course,
                passed=True
            ).aggregate(Avg('score'))['score__avg']
            
            certificate.final_score = avg_score
            certificate.save()
        
        return JsonResponse({
            "certificate": {
                "id": certificate.certificate_id,
                "course_title": course.title,
                "student_name": request.user.get_full_name() or request.user.email,
                "completion_date": certificate.completion_date.isoformat(),
                "issued_at": certificate.issued_at.isoformat(),
                "final_score": certificate.final_score,
            },
            "created": created,
        })
        
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)
