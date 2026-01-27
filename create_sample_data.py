"""
Quick script to create sample data for testing the admin panel
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'skillForge.settings')
django.setup()

from django.contrib.auth import get_user_model
from learning.models import (
    InstructorProfile, Category, Course, Lesson
)

User = get_user_model()

print("Creating sample data...")

# Create a test user for instructor
user, created = User.objects.get_or_create(
    username='instructor1',
    defaults={
        'email': 'instructor@skillforge.com',
        'first_name': 'John',
        'last_name': 'Doe'
    }
)
if created:
    user.set_password('instructor123')
    user.save()
    print(f"✅ Created user: {user.username}")

# Create instructor profile
instructor, created = InstructorProfile.objects.get_or_create(
    user=user,
    defaults={
        'bio': 'Experienced web developer with 10+ years of teaching',
        'expertise': ['Web Development', 'JavaScript', 'React'],
        'is_approved': True
    }
)
if created:
    print(f"✅ Created instructor profile for {user.username}")

# Create categories
categories_data = [
    'Web Development',
    'Data Science',
    'Design',
    'AI & ML'
]

for cat_name in categories_data:
    cat, created = Category.objects.get_or_create(
        name=cat_name,
        defaults={'description': f'Learn {cat_name}'}
    )
    if created:
        print(f"✅ Created category: {cat_name}")

# Create a sample course
web_dev_cat = Category.objects.get(name='Web Development')
course, created = Course.objects.get_or_create(
    title='Complete Web Development Bootcamp',
    defaults={
        'instructor': instructor,
        'category': web_dev_cat,
        'description': 'Learn HTML, CSS, JavaScript, React, and Node.js from scratch',
        'level': 'beginner',
        'learning_objectives': ['HTML/CSS', 'JavaScript', 'React', 'Node.js', 'Databases'],
        'estimated_duration_hours': 40,
        'is_published': True,
        'is_approved': True
    }
)
if created:
    print(f"✅ Created course: {course.title}")
    
    # Add sample lessons
    lessons_data = [
        {
            'title': 'HTML Basics',
            'description': 'Learn the fundamentals of HTML',
            'video_url': 'https://www.youtube.com/watch?v=UB1O30fR-EE',
            'duration_minutes': 30,
            'order': 1,
            'is_free': True
        },
        {
            'title': 'CSS Fundamentals',
            'description': 'Master CSS styling and layouts',
            'video_url': 'https://www.youtube.com/watch?v=1Rs2ND1ryYc',
            'duration_minutes': 45,
            'order': 2,
            'is_free': True
        },
        {
            'title': 'JavaScript Essentials',
            'description': 'Learn JavaScript programming',
            'video_url': 'https://www.youtube.com/watch?v=PkZNo7MFNFg',
            'duration_minutes': 60,
            'order': 3,
            'is_free': False
        }
    ]
    
    for lesson_data in lessons_data:
        lesson = Lesson.objects.create(
            course=course,
            **lesson_data
        )
        print(f"  ✅ Created lesson: {lesson.title}")

print("\n🎉 Sample data created successfully!")
print("\nYou can now:")
print("1. Login to admin panel: http://localhost:8000/admin")
print("   Username: admin")
print("   Password: admin")
print("\n2. Or login as instructor:")
print("   Username: instructor1")
print("   Password: instructor123")
