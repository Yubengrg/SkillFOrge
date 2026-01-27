from datetime import timedelta

from django.contrib import admin, messages
from django.db.models import Count, Q
from django.db.models.functions import TruncDate
from django.utils import timezone
from django.contrib.auth import get_user_model
import json

from .models import (
    InstructorProfile,
    Category,
    Course,
    Module,
    Lesson,
    Quiz,
    Question,
    AnswerOption,
    QuizAttempt,
    Enrollment,
    LessonProgress,
    Certificate,
    AIRoadmap,
    ExternalResource,
    Report,
)

User = get_user_model()


# ============================================
# INSTRUCTOR ADMIN
# ============================================
@admin.register(InstructorProfile)
class InstructorProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "is_approved", "created_at", "course_count")
    list_filter = ("is_approved", "created_at")
    search_fields = ("user__email", "user__first_name", "user__last_name", "bio")
    autocomplete_fields = ("user",)
    actions = ["approve_instructors", "unapprove_instructors"]

    def course_count(self, obj):
        return obj.courses.count()
    course_count.short_description = "Courses"

    @admin.action(description="Approve selected instructors")
    def approve_instructors(self, request, queryset):
        updated = queryset.update(is_approved=True)
        self.message_user(
            request,
            f"{updated} instructor(s) approved.",
            level=messages.SUCCESS,
        )

    @admin.action(description="Unapprove selected instructors")
    def unapprove_instructors(self, request, queryset):
        updated = queryset.update(is_approved=False)
        self.message_user(
            request,
            f"{updated} instructor(s) unapproved.",
            level=messages.WARNING,
        )


# ============================================
# CATEGORY ADMIN
# ============================================
@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "course_count")
    search_fields = ("name",)
    prepopulated_fields = {"slug": ("name",)}

    def course_count(self, obj):
        return obj.courses.count()


# ============================================
# COURSE ADMIN
# ============================================
class LessonInline(admin.TabularInline):
    model = Lesson
    extra = 1
    fields = ("title", "video_url", "duration_minutes", "order", "is_published")


class ModuleInline(admin.TabularInline):
    model = Module
    extra = 1


@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    list_display = (
        "title",
        "instructor",
        "category",
        "level",
        "is_published",
        "is_approved",
        "enrollment_count",
        "completion_rate",
        "created_at",
    )
    list_filter = ("is_published", "is_approved", "level", "category", "created_at")
    search_fields = ("title", "description")
    prepopulated_fields = {"slug": ("title",)}
    autocomplete_fields = ("instructor", "category")
    inlines = [LessonInline, ModuleInline]
    actions = ["approve_courses", "publish_courses"]
    
    # custom changelist template with charts
    change_list_template = "admin/learning/course/change_list.html"

    # annotate queryset with stats
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.annotate(
            _enrollment_count=Count("enrollments", distinct=True),
            _completed_count=Count(
                "enrollments",
                filter=Q(enrollments__completed_at__isnull=False),
                distinct=True,
            ),
        )

    @admin.display(ordering="_enrollment_count")
    def enrollment_count(self, obj):
        return obj._enrollment_count

    @admin.display(description="Completion rate", ordering="_completed_count")
    def completion_rate(self, obj):
        if obj._enrollment_count:
            pct = (obj._completed_count / obj._enrollment_count) * 100
            return f"{pct:.1f}%"
        return "—"

    @admin.action(description="Approve selected courses")
    def approve_courses(self, request, queryset):
        updated = queryset.update(is_approved=True)
        self.message_user(
            request,
            f"{updated} course(s) approved.",
            level=messages.SUCCESS,
        )

    @admin.action(description="Publish selected courses")
    def publish_courses(self, request, queryset):
        updated = queryset.update(is_published=True)
        self.message_user(
            request,
            f"{updated} course(s) published.",
            level=messages.SUCCESS,
        )

    # add analytics data for charts on changelist
    def changelist_view(self, request, extra_context=None):
        today = timezone.now().date()
        start_date = today - timedelta(days=29)

        # daily signups
        signup_qs = (
            User.objects.filter(date_joined__date__gte=start_date)
            .annotate(day=TruncDate("date_joined"))
            .values("day")
            .annotate(count=Count("id"))
            .order_by("day")
        )

        signup_labels = [item["day"].strftime("%Y-%m-%d") for item in signup_qs]
        signup_counts = [item["count"] for item in signup_qs]

        # daily enrollments
        enroll_qs = (
            Enrollment.objects.filter(started_at__date__gte=start_date)
            .annotate(day=TruncDate("started_at"))
            .values("day")
            .annotate(count=Count("id"))
            .order_by("day")
        )
        enroll_labels = [item["day"].strftime("%Y-%m-%d") for item in enroll_qs]
        enroll_counts = [item["count"] for item in enroll_qs]

        # top 5 courses by enrollment
        qs = self.get_queryset(request)
        top_courses = qs.order_by("-_enrollment_count")[:5]
        top_course_labels = [c.title for c in top_courses]
        top_course_counts = [c._enrollment_count for c in top_courses]

        extra = extra_context or {}
        extra.update(
            {
                "signup_labels": json.dumps(signup_labels),
                "signup_counts": json.dumps(signup_counts),
                "enroll_labels": json.dumps(enroll_labels),
                "enroll_counts": json.dumps(enroll_counts),
                "top_course_labels": json.dumps(top_course_labels),
                "top_course_counts": json.dumps(top_course_counts),
                "start_date": start_date,
                "end_date": today,
            }
        )
        return super().changelist_view(request, extra_context=extra)


# ============================================
# MODULE ADMIN
# ============================================
@admin.register(Module)
class ModuleAdmin(admin.ModelAdmin):
    list_display = ("title", "course", "order")
    list_filter = ("course",)
    search_fields = ("title", "course__title")


# ============================================
# LESSON ADMIN
# ============================================
@admin.register(Lesson)
class LessonAdmin(admin.ModelAdmin):
    list_display = ("title", "course", "video_source", "duration_minutes", "is_published", "is_free", "order")
    list_filter = ("is_published", "is_free", "video_source", "course")
    search_fields = ("title", "description", "course__title")
    autocomplete_fields = ("course",)


# ============================================
# QUIZ ADMIN
# ============================================
class AnswerOptionInline(admin.TabularInline):
    model = AnswerOption
    extra = 1


class QuestionInline(admin.TabularInline):
    model = Question
    extra = 1


@admin.register(Quiz)
class QuizAdmin(admin.ModelAdmin):
    list_display = ("title", "course", "lesson", "passing_score", "is_required", "question_count")
    list_filter = ("is_required", "course")
    search_fields = ("title", "course__title")
    autocomplete_fields = ("course", "lesson")
    inlines = [QuestionInline]
    
    def question_count(self, obj):
        return obj.questions.count()
    question_count.short_description = "Questions"


@admin.register(Question)
class QuestionAdmin(admin.ModelAdmin):
    list_display = ("question_text_short", "quiz", "question_type", "points", "order")
    list_filter = ("question_type", "quiz")
    inlines = [AnswerOptionInline]

    def question_text_short(self, obj):
        return obj.question_text[:60]
    question_text_short.short_description = "Question"


@admin.register(QuizAttempt)
class QuizAttemptAdmin(admin.ModelAdmin):
    list_display = ("user", "quiz", "score", "passed", "points_earned", "total_points", "completed_at")
    list_filter = ("passed", "quiz__course", "completed_at")
    search_fields = ("user__email", "quiz__title")
    autocomplete_fields = ("user", "quiz", "enrollment")
    readonly_fields = ("started_at", "completed_at")
    ordering = ("-completed_at",)


@admin.register(Certificate)
class CertificateAdmin(admin.ModelAdmin):
    list_display = ("certificate_id", "user", "course", "completion_date", "final_score", "issued_at")
    list_filter = ("completion_date", "issued_at", "course")
    search_fields = ("certificate_id", "user__email", "course__title")
    autocomplete_fields = ("user", "course", "enrollment")
    readonly_fields = ("certificate_id", "completion_date", "issued_at")
    ordering = ("-issued_at",)


# ============================================
# ENROLLMENT ADMIN
# ============================================
@admin.register(Enrollment)
class EnrollmentAdmin(admin.ModelAdmin):
    list_display = (
        "user",
        "course",
        "progress_percent",
        "has_roadmap",
        "started_at",
        "completed_at",
    )
    list_filter = ("has_roadmap", "course", "started_at", "completed_at")
    search_fields = ("user__email", "course__title")
    autocomplete_fields = ("user", "course")
    ordering = ("-started_at",)


# ============================================
# LESSON PROGRESS ADMIN
# ============================================
@admin.register(LessonProgress)
class LessonProgressAdmin(admin.ModelAdmin):
    list_display = ("enrollment", "lesson", "is_completed", "watch_time_seconds", "completed_at")
    list_filter = ("is_completed", "lesson__course")
    search_fields = ("enrollment__user__email", "lesson__title")
    autocomplete_fields = ("enrollment", "lesson")


# ============================================
# AI ROADMAP ADMIN
# ============================================
@admin.register(AIRoadmap)
class AIRoadmapAdmin(admin.ModelAdmin):
    list_display = ("enrollment", "estimated_weeks", "total_hours", "ai_model_used", "created_at")
    list_filter = ("ai_model_used", "created_at")
    search_fields = ("enrollment__user__email", "enrollment__course__title")
    autocomplete_fields = ("enrollment",)
    readonly_fields = ("created_at", "updated_at")


# ============================================
# EXTERNAL RESOURCE ADMIN
# ============================================
@admin.register(ExternalResource)
class ExternalResourceAdmin(admin.ModelAdmin):
    list_display = ("title", "resource_type", "duration_minutes", "created_at")
    list_filter = ("resource_type", "created_at")
    search_fields = ("title", "description", "url")


# ============================================
# REPORT ADMIN
# ============================================
@admin.register(Report)
class ReportAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "type",
        "reporter",
        "course",
        "lesson",
        "is_resolved",
        "created_at",
        "resolved_at",
        "resolved_by",
    )
    list_filter = ("is_resolved", "type", "created_at")
    search_fields = (
        "message",
        "reporter__email",
        "course__title",
        "lesson__title",
    )
    autocomplete_fields = ("reporter", "course", "lesson", "resolved_by")
    ordering = ("-created_at",)
    actions = ["mark_as_resolved", "mark_as_unresolved"]

    @admin.action(description="Mark selected reports as resolved")
    def mark_as_resolved(self, request, queryset):
        updated = queryset.filter(is_resolved=False).update(
            is_resolved=True,
            resolved_at=timezone.now(),
            resolved_by=request.user,
        )
        self.message_user(
            request,
            f"{updated} report(s) marked as resolved.",
            level=messages.SUCCESS,
        )

    @admin.action(description="Mark selected reports as UNresolved")
    def mark_as_unresolved(self, request, queryset):
        updated = queryset.filter(is_resolved=True).update(
            is_resolved=False,
            resolved_at=None,
            resolved_by=None,
        )
        self.message_user(
            request,
            f"{updated} report(s) marked as unresolved.",
            level=messages.INFO,
        )
