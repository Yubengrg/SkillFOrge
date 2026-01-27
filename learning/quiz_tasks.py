"""
Quiz Generation Tasks
Handles automatic quiz generation from video lessons
"""
from django.conf import settings
from .models import Lesson, Quiz, Question, AnswerOption
from .ai_services import QuizGenerator, TranscriptExtractor


def generate_quiz_for_lesson(lesson_id):
    """
    Generate quiz questions for a lesson using AI
    
    Args:
        lesson_id: ID of the lesson to generate quiz for
        
    Returns:
        bool: True if successful, False otherwise
    """
    try:
        lesson = Lesson.objects.get(id=lesson_id)
        
        # Update status to processing
        lesson.quiz_generation_status = 'processing'
        lesson.save()
        
        print(f"Starting quiz generation for lesson: {lesson.title}")
        
        # Step 1: Get transcript
        transcript = get_lesson_transcript(lesson)
        
        if not transcript:
            print(f"Could not get transcript for lesson {lesson.id}")
            lesson.quiz_generation_status = 'failed'
            lesson.save()
            return False
        
        # Save transcript
        lesson.video_transcript = transcript
        lesson.save()
        
        print(f"Transcript extracted ({len(transcript)} characters)")
        
        # Step 2: Generate quiz using AI
        quiz_generator = QuizGenerator()
        num_questions = min(
            settings.MAX_QUIZ_QUESTIONS,
            max(settings.MIN_QUIZ_QUESTIONS, len(transcript) // 500)  # 1 question per ~500 chars
        )
        
        questions_data = quiz_generator.generate_quiz_from_transcript(
            transcript,
            num_questions=num_questions,
            lesson_title=lesson.title
        )
        
        if not questions_data:
            print(f"AI did not generate questions for lesson {lesson.id}")
            lesson.quiz_generation_status = 'failed'
            lesson.save()
            return False
        
        print(f"Generated {len(questions_data)} questions")
        
        # Step 3: Create Quiz object
        quiz = Quiz.objects.create(
            course=lesson.course,
            lesson=lesson,
            title=f"{lesson.title} - Quiz",
            description=f"Test your understanding of {lesson.title}",
            passing_score=settings.QUIZ_PASSING_SCORE,
            is_required=lesson.quiz_required,
            order=lesson.order
        )
        
        print(f"Created quiz: {quiz.title}")
        
        # Step 4: Create Questions and Answer Options
        for idx, q_data in enumerate(questions_data):
            question = Question.objects.create(
                quiz=quiz,
                question_text=q_data['question'],
                question_type='multiple_choice',
                points=10,
                order=idx + 1,
                explanation=q_data.get('explanation', '')
            )
            
            # Create answer options
            for opt_idx, option_text in enumerate(q_data['options']):
                AnswerOption.objects.create(
                    question=question,
                    answer_text=option_text,
                    is_correct=(opt_idx == q_data['correct_answer']),
                    order=opt_idx + 1
                )
            
            print(f"  Created question {idx + 1}: {q_data['question'][:50]}...")
        
        # Step 5: Mark as completed
        lesson.quiz_auto_generated = True
        lesson.quiz_generation_status = 'completed'
        lesson.save()
        
        print(f"✅ Successfully generated quiz for lesson: {lesson.title}")
        return True
        
    except Lesson.DoesNotExist:
        print(f"Lesson {lesson_id} not found")
        return False
    except Exception as e:
        print(f"Error generating quiz for lesson {lesson_id}: {str(e)}")
        import traceback
        traceback.print_exc()
        
        try:
            lesson = Lesson.objects.get(id=lesson_id)
            lesson.quiz_generation_status = 'failed'
            lesson.save()
        except:
            pass
        
        return False


def get_lesson_transcript(lesson):
    """
    Extract transcript from lesson video
    
    Args:
        lesson: Lesson object
        
    Returns:
        str: Transcript text or None
    """
    # Step 1: Check for manual transcript first (best quality if provided)
    if lesson.video_transcript:
        print("Using manually provided transcript...")
        return lesson.video_transcript
    
    extractor = TranscriptExtractor()
    
    # Step 2: For YouTube videos, try automated extraction
    if lesson.video_url and 'youtube' in lesson.video_url.lower():
        print("Extracting YouTube transcript...")
        transcript = extractor.get_youtube_transcript(lesson.video_url)
        if transcript:
            return transcript
    
    # Step 3: For uploaded videos, use Whisper Speech-to-Text
    if lesson.video_file:
        print("Extracting transcript from uploaded video using Whisper...")
        video_path = lesson.video_file.path
        transcript = extractor.get_video_summary(video_file=video_path)
        if transcript:
            return transcript
    
    # Step 4: Fallback for missing transcripts
    if lesson.description:
        print("Using lesson description as fallback")
        return f"{lesson.title}. {lesson.description}"
    
    return f"This is a lesson about {lesson.title}."


def regenerate_quiz_for_lesson(lesson_id):
    """
    Delete existing quiz and regenerate
    
    Args:
        lesson_id: ID of the lesson
        
    Returns:
        bool: True if successful
    """
    try:
        lesson = Lesson.objects.get(id=lesson_id)
        
        # Delete existing quizzes for this lesson
        Quiz.objects.filter(lesson=lesson).delete()
        
        # Reset status
        lesson.quiz_auto_generated = False
        lesson.quiz_generation_status = 'pending'
        lesson.save()
        
        # Generate new quiz
        return generate_quiz_for_lesson(lesson_id)
        
    except Exception as e:
        print(f"Error regenerating quiz: {str(e)}")
        return False
