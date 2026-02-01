from django.urls import path
from . import views
from . import admin_api_views
from . import instructor_api_views
from . import learning_api_views

urlpatterns = [
    # Existing course views
    path("courses/", views.course_list, name="course_list"),
    path("categories/", views.category_list, name="category_list"),
    path("courses/<slug:slug>/", views.course_detail, name="course_detail"),
    path(
        "courses/<slug:slug>/enroll/",
        views.enroll_course,
        name="enroll_course",
    ),
    path("my/enrollments/", views.my_enrollments, name="my_enrollments"),
    path(
        "lessons/<int:lesson_id>/complete/",
        views.complete_lesson,
        name="complete_lesson",
    ),
    path("reports/", views.create_report, name="create_report"),
    
    # ============================================
    # ADMIN API ENDPOINTS
    # ============================================
    path("admin/stats/", admin_api_views.admin_stats, name="admin_stats"),
    path("admin/overview/", admin_api_views.admin_overview, name="admin_overview"),
    path("admin/instructors/pending/", admin_api_views.pending_instructors, name="pending_instructors"),
    path("admin/instructors/<int:instructor_id>/approve/", admin_api_views.approve_instructor, name="approve_instructor"),
    path("admin/instructors/<int:instructor_id>/reject/", admin_api_views.reject_instructor, name="reject_instructor"),
    path("admin/courses/pending/", admin_api_views.pending_courses, name="pending_courses"),
    path("admin/courses/<int:course_id>/approve/", admin_api_views.approve_course, name="approve_course"),
    path("admin/courses/<int:course_id>/reject/", admin_api_views.reject_course, name="reject_course"),
    path("admin/users/", admin_api_views.all_users, name="all_users"),
    
    # ============================================
    # INSTRUCTOR API ENDPOINTS
    # ============================================
    path("instructor/stats/", instructor_api_views.instructor_stats, name="instructor_stats"),
    path("instructor/overview/", instructor_api_views.instructor_overview, name="instructor_overview"),
    path("instructor/courses/", instructor_api_views.instructor_courses, name="instructor_courses"),
    path("instructor/courses/create/", instructor_api_views.create_course, name="create_course"),
    path("instructor/courses/<int:course_id>/update/", instructor_api_views.update_course, name="update_course"),
    path("instructor/courses/<int:course_id>/delete/", instructor_api_views.delete_course, name="delete_course"),
    path("instructor/courses/<int:course_id>/lessons/add/", instructor_api_views.add_lesson, name="add_lesson"),
    path("instructor/courses/<int:course_id>/lessons/", instructor_api_views.get_course_lessons, name="get_course_lessons"),
    path("instructor/lessons/<int:lesson_id>/update/", instructor_api_views.update_lesson, name="update_lesson"),
    path("instructor/lessons/<int:lesson_id>/delete/", instructor_api_views.delete_lesson, name="delete_lesson"),
    path("instructor/lessons/<int:lesson_id>/reorder/", instructor_api_views.reorder_lesson, name="reorder_lesson"),
    path("instructor/courses/<int:course_id>/students/", instructor_api_views.course_students, name="course_students"),
    path("instructor/categories/", instructor_api_views.get_categories, name="get_categories"),
    
    # ============================================
    # LEARNING API ENDPOINTS (Student Experience)
    # ============================================
    # Lesson APIs
    path("learning/courses/<slug:slug>/lessons/", learning_api_views.course_lessons, name="course_lessons"),
    path("learning/lessons/<int:lesson_id>/", learning_api_views.lesson_detail, name="lesson_detail"),
    path("learning/lessons/<int:lesson_id>/complete/", learning_api_views.complete_lesson, name="learning_complete_lesson"),
    path("learning/lessons/<int:lesson_id>/position/", learning_api_views.update_lesson_position, name="update_lesson_position"),
    
    # Quiz APIs
    path("learning/lessons/<int:lesson_id>/quiz/", learning_api_views.lesson_quiz, name="lesson_quiz"),
    path("learning/quizzes/<int:quiz_id>/", learning_api_views.quiz_detail, name="quiz_detail"),
    path("learning/quizzes/<int:quiz_id>/submit/", learning_api_views.submit_quiz, name="submit_quiz"),
    
    # Progress APIs
    path("learning/courses/<slug:slug>/progress/", learning_api_views.course_progress, name="course_progress"),
    path("learning/my-progress/", learning_api_views.my_progress, name="my_progress"),
    
    # Certificate APIs
    path("learning/certificates/<str:certificate_id>/", learning_api_views.get_certificate, name="get_certificate"),
    path("learning/courses/<slug:slug>/certificate/", learning_api_views.course_certificate, name="course_certificate"),
]
