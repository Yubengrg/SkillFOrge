"""
Helper script to add sample achievements to users for testing
Run with: python add_sample_achievements.py
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'skillForge.settings')
django.setup()

from django.contrib.auth.models import User
from profiles.models import Achievement, Activity

def add_sample_data():
    """Add sample achievements and activities to existing users"""
    
    # Get some users
    users = User.objects.all()[:5]
    
    for user in users:
        # Add achievements
        Achievement.objects.get_or_create(
            user=user,
            achievement_type='course_complete',
            title='First Course Completed',
            description='Completed your first course!',
            icon='🎓'
        )
        
        Achievement.objects.get_or_create(
            user=user,
            achievement_type='milestone',
            title='Learning Streak',
            description='7 days learning streak',
            icon='🔥'
        )
        
        # Add activities
        Activity.objects.get_or_create(
            user=user,
            activity_type='enrolled',
            description=f'{user.first_name} enrolled in a new course'
        )
        
        Activity.objects.get_or_create(
            user=user,
            activity_type='completed_lesson',
            description=f'{user.first_name} completed a lesson'
        )
    
    print(f"✅ Added sample achievements and activities to {len(users)} users")

if __name__ == '__main__':
    add_sample_data()
