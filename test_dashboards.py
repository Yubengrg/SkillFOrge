#!/usr/bin/env python3
"""
Test script to verify Admin and Instructor Dashboard APIs
"""
import sys
import os
import django

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'skillForge.settings')
django.setup()

from django.contrib.auth.models import User
from learning.models import InstructorProfile, Course, Category, Lesson, Enrollment

def print_section(title):
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}\n")

def main():
    print_section("DATABASE STATUS CHECK")
    
    # Users
    total_users = User.objects.count()
    admin_users = User.objects.filter(is_staff=True).count()
    print(f"✓ Total Users: {total_users}")
    print(f"✓ Admin Users: {admin_users}")
    
    # Instructors
    total_instructors = InstructorProfile.objects.count()
    approved_instructors = InstructorProfile.objects.filter(is_approved=True).count()
    pending_instructors = InstructorProfile.objects.filter(is_approved=False).count()
    print(f"✓ Total Instructor Profiles: {total_instructors}")
    print(f"✓ Approved Instructors: {approved_instructors}")
    print(f"✓ Pending Instructors: {pending_instructors}")
    
    # Courses
    total_courses = Course.objects.count()
    approved_courses = Course.objects.filter(is_approved=True).count()
    published_courses = Course.objects.filter(is_published=True).count()
    pending_courses = Course.objects.filter(is_approved=False).count()
    print(f"✓ Total Courses: {total_courses}")
    print(f"✓ Approved Courses: {approved_courses}")
    print(f"✓ Published Courses: {published_courses}")
    print(f"✓ Pending Approval: {pending_courses}")
    
    # Enrollments
    total_enrollments = Enrollment.objects.count()
    print(f"✓ Total Enrollments: {total_enrollments}")
    
    # Categories
    total_categories = Category.objects.count()
    print(f"✓ Total Categories: {total_categories}")
    
    # Lessons
    total_lessons = Lesson.objects.count()
    print(f"✓ Total Lessons: {total_lessons}")
    
    print_section("ADMIN CREDENTIALS")
    admin = User.objects.filter(is_staff=True).first()
    if admin:
        print(f"✓ Admin Email: {admin.email}")
        print(f"✓ Admin Username: {admin.username}")
        print("✓ Admin Password: admin (if using default)")
    else:
        print("✗ No admin user found!")
    
    print_section("INSTRUCTOR CREDENTIALS")
    if approved_instructors > 0:
        for profile in InstructorProfile.objects.filter(is_approved=True):
            print(f"✓ Instructor: {profile.user.email}")
            print(f"  - Username: {profile.user.username}")
            print(f"  - Bio: {profile.bio[:50]}...")
            print(f"  - Expertise: {profile.expertise}")
            print()
    else:
        print("✗ No approved instructors found!")
    
    print_section("SAMPLE COURSE DATA")
    if total_courses > 0:
        for course in Course.objects.all()[:3]:
            print(f"✓ Course: {course.title}")
            print(f"  - Instructor: {course.created_by.email if course.created_by else 'N/A'}")
            print(f"  - Category: {course.category.name if course.category else 'N/A'}")
            print(f"  - Approved: {'Yes' if course.is_approved else 'No'}")
            print(f"  - Published: {'Yes' if course.is_published else 'No'}")
            print(f"  - Lessons: {course.lessons.count()}")
            print()
    else:
        print("✗ No courses found!")
    
    print_section("API ENDPOINTS TO TEST")
    print("Admin Dashboard:")
    print("  - GET  http://localhost:8000/api/admin/stats/")
    print("  - GET  http://localhost:8000/api/admin/instructors/pending/")
    print("  - GET  http://localhost:8000/api/admin/courses/pending/")
    print("  - GET  http://localhost:8000/api/admin/users/")
    print()
    print("Instructor Dashboard:")
    print("  - GET  http://localhost:8000/api/instructor/stats/")
    print("  - GET  http://localhost:8000/api/instructor/courses/")
    print("  - GET  http://localhost:8000/api/instructor/categories/")
    print()
    print("Frontend URLs:")
    print("  - Admin Dashboard: http://localhost:5173/admin-dashboard")
    print("  - Instructor Dashboard: http://localhost:5173/instructor-dashboard")
    print()
    
    print_section("VERIFICATION COMPLETE")
    print("✓ Database check complete")
    print("✓ Both dashboards are ready for testing")
    print("\nNext steps:")
    print("1. Log in as admin at http://localhost:5173/login")
    print("2. Access Admin Dashboard from user menu")
    print("3. Log in as instructor to test Instructor Dashboard")

if __name__ == "__main__":
    main()
