#!/usr/bin/env python3
"""
Comprehensive bug check script - Tests all major features
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
    
    print_header("1. DATABASE INTEGRITY CHECK")
    
    # Check users
    users = User.objects.all()
    check_mark(users.count() > 0, f"Users exist: {users.count()} found")
    
    admins = User.objects.filter(is_staff=True)
    if not check_mark(admins.count() > 0, f"Admin users exist: {admins.count()} found"):
        issues.append("No admin users found")
    
    # Check instructors
    instructors = InstructorProfile.objects.all()
    check_mark(instructors.count() > 0, f"Instructor profiles exist: {instructors.count()} found")
    
    approved_instructors = InstructorProfile.objects.filter(is_approved=True)
    check_mark(approved_instructors.count() > 0, f"Approved instructors: {approved_instructors.count()} found")
    
    # Check courses
    courses = Course.objects.all()
    check_mark(courses.count() > 0, f"Courses exist: {courses.count()} found")
    
    # Check categories
    categories = Category.objects.all()
    if not check_mark(categories.count() > 0, f"Categories exist: {categories.count()} found"):
        issues.append("No categories found - homepage may be empty")
    
    print_header("2. MODEL RELATIONSHIP CHECK")
    
    # Check course relationships
    for course in courses:
        has_category = course.category is not None
        check_mark(has_category, f"Course '{course.title}' has category: {course.category.name if has_category else 'None'}")
        if not has_category:
            issues.append(f"Course '{course.title}' has no category")
        
        has_creator = course.created_by is not None
        check_mark(has_creator, f"Course '{course.title}' has creator: {course.created_by.email if has_creator else 'None'}")
        if not has_creator:
            issues.append(f"Course '{course.title}' has no creator - may cause issues in instructor dashboard")
    
    # Check instructor profiles
    for profile in instructors:
        has_user = profile.user is not None
        check_mark(has_user, f"Instructor profile has user: {profile.user.email if has_user else 'None'}")
        if not has_user:
            issues.append("Instructor profile without user found")
    
    print_header("3. DATA CONSISTENCY CHECK")
    
    # Check for orphaned lessons
    lessons = Lesson.objects.all()
    for lesson in lessons:
        has_course = lesson.course is not None
        if not has_course:
            check_mark(False, f"Lesson '{lesson.title}' has no course - ORPHANED")
            issues.append(f"Orphaned lesson found: {lesson.title}")
        else:
            check_mark(True, f"Lesson '{lesson.title}' belongs to course '{lesson.course.title}'")
    
    # Check enrollments
    enrollments = Enrollment.objects.all()
    for enrollment in enrollments:
        has_user = enrollment.user is not None
        has_course = enrollment.course is not None
        if not has_user or not has_course:
            check_mark(False, f"Invalid enrollment found")
            issues.append("Invalid enrollment without user or course")
    
    print_header("4. AUTHENTICATION SETUP CHECK")
    
    # Check admin credentials
    admin = User.objects.filter(email="admin@skillforge.com").first()
    if check_mark(admin is not None, "Admin user (admin@skillforge.com) exists"):
        check_mark(admin.is_staff, "Admin has staff privileges")
        check_mark(admin.is_superuser, "Admin has superuser privileges")
    else:
        issues.append("Default admin user not found")
    
    # Check instructor credentials
    instructor = User.objects.filter(email="instructor@skillforge.com").first()
    if check_mark(instructor is not None, "Instructor user (instructor@skillforge.com) exists"):
        profile = InstructorProfile.objects.filter(user=instructor).first()
        if check_mark(profile is not None, "Instructor has profile"):
            check_mark(profile.is_approved, "Instructor is approved")
        else:
            issues.append("Instructor user exists but has no profile")
    
    print_header("5. COURSE DATA CHECK")
    
    for course in courses:
        lesson_count = course.lessons.count()
        check_mark(lesson_count > 0, f"Course '{course.title}' has {lesson_count} lessons")
        if lesson_count == 0:
            issues.append(f"Course '{course.title}' has no lessons")
        
        check_mark(course.is_approved, f"Course '{course.title}' is approved: {course.is_approved}")
        check_mark(course.is_published, f"Course '{course.title}' is published: {course.is_published}")
    
    print_header("6. POTENTIAL ISSUES FOUND")
    
    if issues:
        print(f"Found {len(issues)} potential issues:\n")
        for i, issue in enumerate(issues, 1):
            print(f"{i}. {issue}")
    else:
        print("✓ No critical issues found!")
    
    print_header("7. FEATURE AVAILABILITY")
    
    print("Homepage:")
    check_mark(categories.count() > 0, f"  - Categories for filtering: {categories.count()}")
    check_mark(courses.count() > 0, f"  - Courses to display: {courses.count()}")
    
    print("\nAdmin Dashboard:")
    check_mark(admins.count() > 0, f"  - Admin users can access: {admins.count()}")
    pending_instructors = InstructorProfile.objects.filter(is_approved=False).count()
    print(f"  - Pending instructor approvals: {pending_instructors}")
    pending_courses = Course.objects.filter(is_approved=False).count()
    print(f"  - Pending course approvals: {pending_courses}")
    
    print("\nInstructor Dashboard:")
    check_mark(approved_instructors.count() > 0, f"  - Approved instructors can access: {approved_instructors.count()}")
    check_mark(categories.count() > 0, f"  - Categories for course creation: {categories.count()}")
    
    print_header("8. RECOMMENDATIONS")
    
    if pending_instructors == 0 and pending_courses == 0:
        print("💡 Create some pending instructors/courses to test approval workflow:")
        print("   - Create a new user and instructor profile (not approved)")
        print("   - Create a course and set is_approved=False")
    
    if courses.count() < 5:
        print("💡 Add more courses for better homepage testing")
    
    print_header("SUMMARY")
    
    if issues:
        print(f"⚠️  Found {len(issues)} issues that need attention")
        return 1
    else:
        print("✅ All checks passed! System is healthy.")
        return 0

if __name__ == "__main__":
    sys.exit(main())
