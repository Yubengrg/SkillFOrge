#!/usr/bin/env python3
"""
Fix the course creator issue
"""
import sys
import os
import django

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'skillForge.settings')
django.setup()

from django.contrib.auth.models import User
from learning.models import Course, InstructorProfile

def main():
    # Get the instructor user
    instructor_user = User.objects.filter(email="instructor@skillforge.com").first()
    
    if not instructor_user:
        print("✗ Instructor user not found!")
        return 1
    
    # Get courses without creators
    courses_without_creator = Course.objects.filter(created_by__isnull=True)
    
    print(f"Found {courses_without_creator.count()} courses without creators")
    
    for course in courses_without_creator:
        course.created_by = instructor_user
        course.save()
        print(f"✓ Assigned '{course.title}' to {instructor_user.email}")
    
    print("\n✅ All courses now have creators!")
    return 0

if __name__ == "__main__":
    sys.exit(main())
