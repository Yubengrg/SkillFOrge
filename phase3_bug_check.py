#!/usr/bin/env python3
"""
Comprehensive bug check for Phase 3
"""
import sys
import os
import django

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'skillForge.settings')
django.setup()

from django.contrib.auth.models import User
from learning.models import (
    Course, Lesson, Quiz, Question, AnswerOption,
    QuizAttempt, Enrollment, LessonProgress, Certificate
)

def print_header(title):
    print(f"\n{'='*70}")
    print(f"  {title}")
    print(f"{'='*70}\n")

def check_mark(condition, message):
    symbol = "✓" if condition else "✗"
    status = "PASS" if condition else "FAIL"
    print(f"{symbol} [{status}] {message}")
    return condition

def main():
    issues = []
    
    print_header("PHASE 3 BUG CHECK")
    
    # Check models exist
    print_header("1. MODEL INTEGRITY")
    
    try:
        quiz_count = Quiz.objects.count()
        check_mark(True, f"Quiz model accessible: {quiz_count} quizzes")
    except Exception as e:
        check_mark(False, f"Quiz model error: {e}")
        issues.append(f"Quiz model error: {e}")
    
    try:
        attempt_count = QuizAttempt.objects.count()
        check_mark(True, f"QuizAttempt model accessible: {attempt_count} attempts")
    except Exception as e:
        check_mark(False, f"QuizAttempt model error: {e}")
        issues.append(f"QuizAttempt model error: {e}")
    
    try:
        cert_count = Certificate.objects.count()
        check_mark(True, f"Certificate model accessible: {cert_count} certificates")
    except Exception as e:
        check_mark(False, f"Certificate model error: {e}")
        issues.append(f"Certificate model error: {e}")
    
    # Check video lessons
    print_header("2. VIDEO LESSON DATA")
    
    lessons_with_video = Lesson.objects.exclude(video_url='').count()
    total_lessons = Lesson.objects.count()
    
    check_mark(lessons_with_video > 0, f"Lessons with videos: {lessons_with_video}/{total_lessons}")
    if lessons_with_video == 0:
        issues.append("No lessons have video URLs")
    
    for lesson in Lesson.objects.exclude(video_url='')[:5]:
        has_url = bool(lesson.video_url)
        has_source = bool(lesson.video_source)
        check_mark(has_url and has_source, f"Lesson '{lesson.title}': video_url={has_url}, source={has_source}")
    
    # Check quiz data
    print_header("3. QUIZ DATA INTEGRITY")
    
    quizzes = Quiz.objects.all()
    for quiz in quizzes:
        question_count = quiz.questions.count()
        check_mark(question_count > 0, f"Quiz '{quiz.title}' has {question_count} questions")
        
        if question_count == 0:
            issues.append(f"Quiz '{quiz.title}' has no questions")
        
        for question in quiz.questions.all()[:3]:
            option_count = question.options.count()
            correct_count = question.options.filter(is_correct=True).count()
            
            check_mark(option_count >= 2, f"  Question has {option_count} options")
            check_mark(correct_count >= 1, f"  Question has {correct_count} correct answer(s)")
            
            if option_count < 2:
                issues.append(f"Question '{question.question_text[:30]}' has too few options")
            if correct_count == 0:
                issues.append(f"Question '{question.question_text[:30]}' has no correct answer")
    
    # Check enrollments
    print_header("4. ENROLLMENT & PROGRESS")
    
    enrollments = Enrollment.objects.all()
    check_mark(enrollments.count() > 0, f"Enrollments exist: {enrollments.count()}")
    
    for enrollment in enrollments[:3]:
        progress_count = LessonProgress.objects.filter(enrollment=enrollment).count()
        check_mark(True, f"Enrollment {enrollment.id}: {progress_count} lesson progress records")
    
    # Check course relationships
    print_header("5. COURSE RELATIONSHIPS")
    
    courses = Course.objects.all()
    for course in courses:
        lesson_count = course.lessons.count()
        quiz_count = course.quizzes.count()
        
        check_mark(lesson_count > 0, f"Course '{course.title}': {lesson_count} lessons")
        
        if lesson_count == 0:
            issues.append(f"Course '{course.title}' has no lessons")
    
    # Check for orphaned records
    print_header("6. ORPHANED RECORDS CHECK")
    
    orphaned_questions = Question.objects.filter(quiz__isnull=True).count()
    check_mark(orphaned_questions == 0, f"Orphaned questions: {orphaned_questions}")
    if orphaned_questions > 0:
        issues.append(f"{orphaned_questions} orphaned questions found")
    
    orphaned_options = AnswerOption.objects.filter(question__isnull=True).count()
    check_mark(orphaned_options == 0, f"Orphaned answer options: {orphaned_options}")
    if orphaned_options > 0:
        issues.append(f"{orphaned_options} orphaned answer options found")
    
    # Check API requirements
    print_header("7. API READINESS")
    
    # Check if we have data for testing APIs
    has_course_with_lessons = Course.objects.filter(lessons__isnull=False).exists()
    has_quiz = Quiz.objects.exists()
    has_enrollment = Enrollment.objects.exists()
    
    check_mark(has_course_with_lessons, "Course with lessons exists for API testing")
    check_mark(has_quiz, "Quiz exists for API testing")
    check_mark(has_enrollment, "Enrollment exists for API testing")
    
    if not has_course_with_lessons:
        issues.append("No course with lessons - learning API will fail")
    if not has_quiz:
        issues.append("No quiz - quiz API will fail")
    if not has_enrollment:
        issues.append("No enrollment - progress API will fail")
    
    # Summary
    print_header("SUMMARY")
    
    if issues:
        print(f"⚠️  Found {len(issues)} issues:\n")
        for i, issue in enumerate(issues, 1):
            print(f"{i}. {issue}")
        return 1
    else:
        print("✅ All checks passed! Phase 3 backend is healthy.")
        return 0

if __name__ == "__main__":
    sys.exit(main())
