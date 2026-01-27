"""
Django signals to automatically create achievements and activities
"""
from django.db.models.signals import post_save
from django.dispatch import receiver
from learning.models import Enrollment, LessonProgress, InstructorProfile
from profiles.models import Achievement, Activity


@receiver(post_save, sender=Enrollment)
def create_enrollment_activity(sender, instance, created, **kwargs):
    """Create activity when user enrolls in a course"""
    if created:
        Activity.objects.create(
            user=instance.user,
            activity_type='enrolled',
            description=f"Enrolled in {instance.course.title}",
            metadata={'course_id': instance.course.id, 'course_slug': instance.course.slug}
        )


@receiver(post_save, sender=LessonProgress)
def create_lesson_completion_activity(sender, instance, created, **kwargs):
    """Create activity when user completes a lesson"""
    if instance.completed and created:
        Activity.objects.create(
            user=instance.enrollment.user,
            activity_type='completed_lesson',
            description=f"Completed lesson: {instance.lesson.title}",
            metadata={'lesson_id': instance.lesson.id, 'course_id': instance.lesson.course.id}
        )


@receiver(post_save, sender=Enrollment)
def create_course_completion_achievement(sender, instance, **kwargs):
    """Create achievement and activity when user completes a course"""
    if instance.completed_at and not kwargs.get('created'):
        # Create activity
        Activity.objects.get_or_create(
            user=instance.user,
            activity_type='completed_course',
            description=f"Completed {instance.course.title}",
            defaults={'metadata': {'course_id': instance.course.id}}
        )
        
        # Check if this is their first course completion
        completed_count = Enrollment.objects.filter(
            user=instance.user,
            completed_at__isnull=False
        ).count()
        
        if completed_count == 1:
            Achievement.objects.get_or_create(
                user=instance.user,
                achievement_type='course_complete',
                title='First Course Completed',
                defaults={
                    'description': 'Completed your first course!',
                    'icon': '🎓'
                }
            )
        elif completed_count == 5:
            Achievement.objects.get_or_create(
                user=instance.user,
                achievement_type='milestone',
                title='5 Courses Mastered',
                defaults={
                    'description': 'Completed 5 courses!',
                    'icon': '🌟'
                }
            )
        elif completed_count == 10:
            Achievement.objects.get_or_create(
                user=instance.user,
                achievement_type='milestone',
                title='Learning Champion',
                defaults={
                    'description': 'Completed 10 courses!',
                    'icon': '🏆'
                }
            )


@receiver(post_save, sender=InstructorProfile)
def create_instructor_achievement(sender, instance, **kwargs):
    """Create achievement and activity when user becomes an approved instructor"""
    if instance.is_approved and not kwargs.get('created'):
        # Check if achievement already exists
        achievement_exists = Achievement.objects.filter(
            user=instance.user,
            achievement_type='instructor'
        ).exists()
        
        if not achievement_exists:
            Achievement.objects.create(
                user=instance.user,
                achievement_type='instructor',
                title='Became an Instructor',
                description='Started teaching on SkillForge!',
                icon='👨‍🏫'
            )
            
            Activity.objects.create(
                user=instance.user,
                activity_type='became_instructor',
                description=f"{instance.user.first_name} became an instructor",
                metadata={'instructor_id': instance.id}
            )
