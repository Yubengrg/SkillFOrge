#!/usr/bin/env python3
"""
Create test data for testing approval workflows
"""
import sys
import os
import django

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'skillForge.settings')
django.setup()

from django.contrib.auth.models import User
from learning.models import InstructorProfile, Course, Category

def main():
    print("Creating test data for approval workflows...\n")
    
    # Create a pending instructor
    try:
        pending_user = User.objects.create_user(
            username="pending_instructor",
            email="pending@skillforge.com",
            password="pending123",
            first_name="Pending",
            last_name="Instructor"
        )
        
        InstructorProfile.objects.create(
            user=pending_user,
            bio="I am a new instructor waiting for approval. I have 5 years of experience in data science.",
            expertise=["Data Science", "Machine Learning", "Python"],
            is_approved=False
        )
        print("✓ Created pending instructor: pending@skillforge.com / pending123")
    except Exception as e:
        print(f"✗ Could not create pending instructor: {e}")
    
    # Create a pending course
    try:
        instructor = User.objects.filter(email="instructor@skillforge.com").first()
        category = Category.objects.first()
        
        if instructor and category:
            Course.objects.create(
                title="Advanced React Patterns",
                description="Learn advanced React patterns including hooks, context, and performance optimization.",
                category=category,
                created_by=instructor,
                level="advanced",
                is_approved=False,
                is_published=False
            )
            print("✓ Created pending course: Advanced React Patterns")
        else:
            print("✗ Could not create pending course: missing instructor or category")
    except Exception as e:
        print(f"✗ Could not create pending course: {e}")
    
    print("\n✅ Test data created successfully!")
    print("\nYou can now test:")
    print("1. Admin Dashboard → Instructors tab (should show 1 pending)")
    print("2. Admin Dashboard → Courses tab (should show 1 pending)")

if __name__ == "__main__":
    main()
