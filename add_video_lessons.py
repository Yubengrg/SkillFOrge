#!/usr/bin/env python3
"""
Add video URLs to existing lessons and create sample quizzes
"""
import sys
import os
import django

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'skillForge.settings')
django.setup()

from learning.models import Lesson, Course, Quiz, Question, AnswerOption

def main():
    print("Adding video URLs to lessons and creating sample quizzes...\n")
    
    # Sample YouTube videos (using public educational videos)
    video_urls = [
        "https://www.youtube.com/watch?v=UB1O30fR-EE",  # HTML Crash Course
        "https://www.youtube.com/watch?v=yfoY53QXEnI",  # CSS Crash Course
        "https://www.youtube.com/watch?v=hdI2bqOjy3c",  # JavaScript Crash Course
    ]
    
    # Update existing lessons with video URLs
    lessons = Lesson.objects.all().order_by('id')
    for i, lesson in enumerate(lessons[:3]):
        if i < len(video_urls):
            lesson.video_url = video_urls[i]
            lesson.video_source = "youtube"
            lesson.duration_minutes = 60  # Approximate
            lesson.save()
            print(f"✓ Added video to lesson: {lesson.title}")
    
    # Create a sample quiz
    course = Course.objects.first()
    if course:
        quiz, created = Quiz.objects.get_or_create(
            course=course,
            title="Web Development Basics Quiz",
            defaults={
                "description": "Test your knowledge of HTML, CSS, and JavaScript basics",
                "passing_score": 70,
                "is_required": True,
                "order": 1,
            }
        )
        
        if created:
            print(f"\n✓ Created quiz: {quiz.title}")
            
            # Question 1
            q1 = Question.objects.create(
                quiz=quiz,
                question_text="What does HTML stand for?",
                question_type="multiple_choice",
                points=1,
                order=1,
                explanation="HTML stands for HyperText Markup Language"
            )
            AnswerOption.objects.create(
                question=q1,
                answer_text="HyperText Markup Language",
                is_correct=True,
                order=1
            )
            AnswerOption.objects.create(
                question=q1,
                answer_text="High Tech Modern Language",
                is_correct=False,
                order=2
            )
            AnswerOption.objects.create(
                question=q1,
                answer_text="Home Tool Markup Language",
                is_correct=False,
                order=3
            )
            
            # Question 2
            q2 = Question.objects.create(
                quiz=quiz,
                question_text="CSS is used for styling web pages.",
                question_type="true_false",
                points=1,
                order=2,
                explanation="CSS (Cascading Style Sheets) is indeed used for styling"
            )
            AnswerOption.objects.create(
                question=q2,
                answer_text="True",
                is_correct=True,
                order=1
            )
            AnswerOption.objects.create(
                question=q2,
                answer_text="False",
                is_correct=False,
                order=2
            )
            
            # Question 3
            q3 = Question.objects.create(
                quiz=quiz,
                question_text="Which of the following is a JavaScript framework?",
                question_type="multiple_choice",
                points=1,
                order=3,
                explanation="React is a popular JavaScript library/framework"
            )
            AnswerOption.objects.create(
                question=q3,
                answer_text="React",
                is_correct=True,
                order=1
            )
            AnswerOption.objects.create(
                question=q3,
                answer_text="Python",
                is_correct=False,
                order=2
            )
            AnswerOption.objects.create(
                question=q3,
                answer_text="MySQL",
                is_correct=False,
                order=3
            )
            
            print(f"✓ Created {quiz.questions.count()} questions")
        else:
            print(f"\n✓ Quiz already exists: {quiz.title}")
    
    print("\n✅ Sample data created successfully!")
    print("\nYou can now:")
    print("1. Enroll in a course")
    print("2. Navigate to /learn/<course-slug> to start learning")
    print("3. Watch videos and mark lessons complete")
    print("4. Take quizzes")

if __name__ == "__main__":
    main()
