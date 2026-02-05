from django.db import models
from django.contrib.auth import get_user_model
from django.utils.text import slugify

User = get_user_model()


# ============================================
# INSTRUCTOR PROFILE
# ============================================
class InstructorProfile(models.Model):
    """Extended profile for users who are instructors."""
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="instructor_profile"
    )
    bio = models.TextField(blank=True)
    expertise = models.JSONField(default=list)  # ["Web Dev", "AI", "Data Science"]
    profile_image_url = models.URLField(blank=True)
    is_approved = models.BooleanField(default=False)
    
    # Professional verification fields
    years_of_experience = models.IntegerField(default=0, help_text="Years of professional experience")
    linkedin_url = models.URLField(blank=True, null=True)
    portfolio_url = models.URLField(blank=True, null=True)
    resume = models.FileField(upload_to='instructor_resumes/', blank=True, null=True)
    certifications = models.JSONField(default=list, blank=True)  # [{name, issuer, date}]
    teaching_experience = models.TextField(blank=True, help_text="Previous teaching experience")
    why_teach = models.TextField(blank=True, help_text="Why do you want to teach?")
    sample_course_topic = models.CharField(max_length=200, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Instructor: {self.user.get_full_name() or self.user.email}"


# ============================================
# CATEGORIES
# ============================================
class Category(models.Model):
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=120, unique=True, blank=True)
    description = models.TextField(blank=True)

    class Meta:
        verbose_name_plural = "categories"
        ordering = ["name"]

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


# ============================================
# COURSES
# ============================================
class Course(models.Model):
    LEVEL_CHOICES = [
        ("beginner", "Beginner"),
        ("intermediate", "Intermediate"),
        ("advanced", "Advanced"),
    ]

    # Basic Info
    title = models.CharField(max_length=200)
    slug = models.SlugField(max_length=220, unique=True, blank=True)
    description = models.TextField(blank=True)
    
    # Relationships
    instructor = models.ForeignKey(
        InstructorProfile,
        on_delete=models.CASCADE,
        related_name="courses",
        null=True,
        blank=True
    )
    category = models.ForeignKey(
        Category,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="courses",
    )
    
    # Course Details
    level = models.CharField(
        max_length=20, choices=LEVEL_CHOICES, default="beginner"
    )
    learning_objectives = models.JSONField(
        default=list,
        help_text="List of learning objectives for AI roadmap generation"
    )
    estimated_duration_hours = models.IntegerField(default=0)
    
    # Status
    is_published = models.BooleanField(default=False)
    is_approved = models.BooleanField(default=False)
    
    # Legacy field for backward compatibility
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="courses_created",
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.title)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.title


# ============================================
# LESSONS (Enhanced for Video Support)
# ============================================
class Lesson(models.Model):
    """Individual video lesson within a course."""
    
    VIDEO_SOURCE_CHOICES = [
        ("youtube", "YouTube"),
        ("vimeo", "Vimeo"),
        ("direct", "Direct URL"),
        ("upload", "Uploaded"),
    ]
    
    # Relationships
    course = models.ForeignKey(
        Course,
        on_delete=models.CASCADE,
        related_name="lessons",
        null=True,  # Temporarily nullable for migration
        blank=True
    )
    
    # Basic Info
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    
    # Video Details
    video_url = models.URLField(
        blank=True,
        default="",
        help_text="YouTube, Vimeo, or direct video URL"
    )
    video_file = models.FileField(
        upload_to='course_videos/',
        blank=True,
        null=True,
        help_text="Uploaded video file (alternative to video_url)"
    )
    video_source = models.CharField(
        max_length=20,
        choices=VIDEO_SOURCE_CHOICES,
        default="youtube"
    )
    duration_minutes = models.IntegerField(default=0)
    thumbnail_url = models.URLField(blank=True)
    
    # Ordering & Status
    order = models.PositiveIntegerField(default=1)
    is_published = models.BooleanField(default=True)
    is_free = models.BooleanField(
        default=True,
        help_text="Free lessons can be viewed without enrollment"
    )
    
    # Quiz Settings (AI-generated)
    quiz_required = models.BooleanField(
        default=True,
        help_text="Students must pass quiz to complete this lesson"
    )
    quiz_auto_generated = models.BooleanField(default=False)
    quiz_generation_status = models.CharField(
        max_length=20,
        choices=[
            ('pending', 'Pending'),
            ('processing', 'Processing'),
            ('completed', 'Completed'),
            ('failed', 'Failed'),
            ('disabled', 'Disabled'),
        ],
        default='pending'
    )
    video_transcript = models.TextField(
        blank=True,
        help_text="Extracted transcript for quiz generation"
    )
    requires_previous_completion = models.BooleanField(
        default=True,
        help_text="Student must complete previous lesson first"
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["order"]
        # unique_together = ("course", "order")  # Temporarily disabled for migration

    def __str__(self):
        return f"{self.course.title} - {self.title}"


# ============================================
# MODULES (Optional grouping of lessons)
# ============================================
class Module(models.Model):
    """Optional: Group lessons into modules/sections."""
    course = models.ForeignKey(
        Course, on_delete=models.CASCADE, related_name="modules"
    )
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    order = models.PositiveIntegerField(default=1)

    class Meta:
        ordering = ["order"]

    def __str__(self):
        return f"{self.course.title} – {self.title}"


# ============================================
# ENROLLMENTS
# ============================================
class Enrollment(models.Model):
    """User enrolled in a course, with overall progress."""

    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="enrollments"
    )
    course = models.ForeignKey(
        Course, on_delete=models.CASCADE, related_name="enrollments"
    )
    progress_percent = models.DecimalField(
        max_digits=5, decimal_places=2, default=0
    )  # 0–100
    
    # AI Roadmap
    has_roadmap = models.BooleanField(default=False)
    roadmap_data = models.JSONField(
        null=True,
        blank=True,
        help_text="AI-generated learning roadmap"
    )
    
    # Timestamps
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    last_accessed = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("user", "course")
        ordering = ["-started_at"]

    def __str__(self):
        return f"{self.user.email} → {self.course.title}"


# ============================================
# LESSON PROGRESS
# ============================================
class LessonProgress(models.Model):
    """Track which lessons a user has completed."""

    enrollment = models.ForeignKey(
        Enrollment,
        on_delete=models.CASCADE,
        related_name="lesson_progress",
        null=True,
        blank=True
    )
    lesson = models.ForeignKey(
        Lesson, on_delete=models.CASCADE, related_name="progress"
    )
    
    # Progress tracking
    is_completed = models.BooleanField(default=False)
    watch_time_seconds = models.IntegerField(default=0)
    completed_at = models.DateTimeField(null=True, blank=True)
    last_position_seconds = models.IntegerField(
        default=0,
        help_text="Resume playback position"
    )
    
    # Quiz completion tracking
    quiz_passed = models.BooleanField(default=False)
    quiz_attempts = models.IntegerField(default=0)
    best_quiz_score = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0,
        help_text="Best score achieved on quiz (percentage)"
    )

    class Meta:
        unique_together = ("enrollment", "lesson")
        ordering = ["lesson__order"]
    
    def is_unlocked(self):
        """Check if this lesson is unlocked for the student"""
        lesson = self.lesson
        
        # If lesson doesn't require previous completion, it's always unlocked
        if not lesson.requires_previous_completion:
            return True
        
        # First lesson is always unlocked
        if lesson.order == 1:
            return True
        
        # Check if previous lesson exists and is completed
        previous_lesson = lesson.course.lessons.filter(
            order__lt=lesson.order,
            is_published=True
        ).order_by('-order').first()
        
        if not previous_lesson:
            return True  # No previous lesson, so unlocked
        
        # Check if previous lesson quiz was passed
        previous_progress = LessonProgress.objects.filter(
            enrollment=self.enrollment,
            lesson=previous_lesson
        ).first()
        
        # Previous lesson must be completed (quiz passed if required)
        if not previous_progress:
            return False
        
        if previous_lesson.quiz_required:
            return previous_progress.quiz_passed
        else:
            return previous_progress.is_completed

    def __str__(self):
        state = "✅" if self.is_completed else "⏳"
        return f"{state} {self.enrollment.user.email} – {self.lesson.title}"


# ============================================
# AI ROADMAP (Separate table for detailed roadmaps)
# ============================================
class AIRoadmap(models.Model):
    """AI-generated personalized learning roadmap."""
    
    enrollment = models.OneToOneField(
        Enrollment,
        on_delete=models.CASCADE,
        related_name="ai_roadmap"
    )
    
    # Roadmap structure
    roadmap_json = models.JSONField(
        help_text="Detailed week-by-week roadmap with lessons and resources"
    )
    
    # Metadata
    estimated_weeks = models.IntegerField(default=0)
    total_hours = models.IntegerField(default=0)
    gaps_filled = models.JSONField(
        default=list,
        help_text="Topics filled with external resources"
    )
    
    # AI generation details
    ai_model_used = models.CharField(max_length=50, default="gpt-4")
    generation_prompt = models.TextField(blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Roadmap for {self.enrollment}"


# ============================================
# EXTERNAL RESOURCES (Recommended by AI)
# ============================================
class ExternalResource(models.Model):
    """External videos/resources recommended by AI to fill gaps."""
    
    RESOURCE_TYPE_CHOICES = [
        ("youtube", "YouTube Video"),
        ("article", "Article"),
        ("documentation", "Documentation"),
        ("course", "External Course"),
    ]
    
    title = models.CharField(max_length=200)
    url = models.URLField()
    resource_type = models.CharField(
        max_length=20,
        choices=RESOURCE_TYPE_CHOICES,
        default="youtube"
    )
    description = models.TextField(blank=True)
    duration_minutes = models.IntegerField(default=0)
    
    # Which roadmaps use this resource
    roadmaps = models.ManyToManyField(
        AIRoadmap,
        related_name="external_resources",
        blank=True
    )
    
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title


# ============================================
# QUIZ SYSTEM
# ============================================
class Quiz(models.Model):
    """Quiz for a course or lesson."""
    
    course = models.ForeignKey(
        Course,
        on_delete=models.CASCADE,
        related_name="quizzes"
    )
    lesson = models.ForeignKey(
        Lesson,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="quizzes",
        help_text="Optional: attach quiz to specific lesson"
    )
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    passing_score = models.IntegerField(
        default=70,
        help_text="Percentage required to pass"
    )
    order = models.IntegerField(default=0)
    is_required = models.BooleanField(
        default=True,
        help_text="Must pass to complete course"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["order"]
        verbose_name_plural = "quizzes"

    def __str__(self):
        return f"{self.course.title} - {self.title}"


class Question(models.Model):
    """Question in a quiz."""
    
    QUESTION_TYPE_CHOICES = [
        ("multiple_choice", "Multiple Choice"),
        ("true_false", "True/False"),
    ]
    
    quiz = models.ForeignKey(
        Quiz,
        on_delete=models.CASCADE,
        related_name="questions"
    )
    question_text = models.TextField()
    question_type = models.CharField(
        max_length=20,
        choices=QUESTION_TYPE_CHOICES,
        default="multiple_choice"
    )
    points = models.IntegerField(default=1)
    order = models.IntegerField(default=0)
    explanation = models.TextField(
        blank=True,
        help_text="Explanation shown after answering"
    )

    class Meta:
        ordering = ["order"]

    def __str__(self):
        return self.question_text[:50]


class AnswerOption(models.Model):
    """Answer option for a question."""
    
    question = models.ForeignKey(
        Question,
        on_delete=models.CASCADE,
        related_name="options"
    )
    answer_text = models.CharField(max_length=500)
    is_correct = models.BooleanField(default=False)
    order = models.IntegerField(default=0)

    class Meta:
        ordering = ["order"]

    def __str__(self):
        prefix = "✔ " if self.is_correct else "✘ "
        return prefix + self.answer_text[:50]


class QuizAttempt(models.Model):
    """User's attempt at a quiz."""
    
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="quiz_attempts"
    )
    quiz = models.ForeignKey(
        Quiz,
        on_delete=models.CASCADE,
        related_name="attempts"
    )
    enrollment = models.ForeignKey(
        Enrollment,
        on_delete=models.CASCADE,
        related_name="quiz_attempts",
        null=True,
        blank=True
    )
    
    # Results
    score = models.FloatField(help_text="Percentage score")
    points_earned = models.IntegerField(default=0)
    total_points = models.IntegerField(default=0)
    passed = models.BooleanField(default=False)
    
    # Answers (JSON format)
    answers = models.JSONField(
        help_text="User's answers: [{question_id: 1, answer_id: 2}, ...]"
    )
    
    # Timestamps
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-completed_at"]

    def __str__(self):
        status = "✅ Passed" if self.passed else "❌ Failed"
        return f"{self.user.email} - {self.quiz.title} - {status} ({self.score}%)"


# ============================================
# CERTIFICATES
# ============================================
class Certificate(models.Model):
    """Certificate awarded on course completion."""
    
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="certificates"
    )
    course = models.ForeignKey(
        Course,
        on_delete=models.CASCADE,
        related_name="certificates"
    )
    enrollment = models.OneToOneField(
        Enrollment,
        on_delete=models.CASCADE,
        related_name="certificate"
    )
    
    # Certificate details
    certificate_id = models.CharField(
        max_length=100,
        unique=True,
        help_text="Unique certificate ID for verification"
    )
    completion_date = models.DateField(auto_now_add=True)
    
    # Optional metadata
    final_score = models.FloatField(
        null=True,
        blank=True,
        help_text="Average quiz score"
    )
    
    # Timestamps
    issued_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-issued_at"]

    def __str__(self):
        return f"Certificate #{self.certificate_id} - {self.user.email} - {self.course.title}"


class Report(models.Model):
    """Moderation reports for courses/lessons."""

    TYPE_CHOICES = [
        ("spam", "Spam"),
        ("abuse", "Abusive content"),
        ("incorrect", "Incorrect / low quality"),
        ("other", "Other"),
    ]

    reporter = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="reports_made",
    )
    course = models.ForeignKey(
        Course,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="reports",
    )
    lesson = models.ForeignKey(
        Lesson,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="reports",
    )
    type = models.CharField(
        max_length=20, choices=TYPE_CHOICES, default="other"
    )
    message = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    is_resolved = models.BooleanField(default=False)
    resolved_at = models.DateTimeField(null=True, blank=True)
    resolved_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reports_resolved",
    )

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        target = self.lesson or self.course
        return f"Report #{self.id} on {target or 'N/A'}"


# ============================================
# ROADMAPS (Role-based learning plans)
# ============================================
class RoadmapSlot(models.Model):
    """User-created roadmap slot for a desired role."""

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="roadmap_slots",
    )
    name = models.CharField(max_length=120)
    role = models.CharField(max_length=120)
    track = models.CharField(max_length=120, blank=True, default="")
    roadmap_data = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.user.email} - {self.name} ({self.role})"


class RoadmapCertificate(models.Model):
    """Certificate for completing a roadmap role."""

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="roadmap_certificates",
    )
    slot = models.OneToOneField(
        RoadmapSlot,
        on_delete=models.CASCADE,
        related_name="certificate",
    )
    role = models.CharField(max_length=120)
    certificate_id = models.CharField(max_length=100, unique=True)
    issued_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-issued_at"]

    def __str__(self):
        return f"{self.user.email} - {self.role} roadmap certificate"


# ============================================
# SOCIAL FEED MODELS
# ============================================


class Follow(models.Model):
    """Follower relationship for social feed."""
    follower = models.ForeignKey(User, on_delete=models.CASCADE, related_name="following")
    following = models.ForeignKey(User, on_delete=models.CASCADE, related_name="followers")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("follower", "following")

    def __str__(self):
        return f"{self.follower.email} follows {self.following.email}"


class Post(models.Model):
    """Social feed post."""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="posts")
    content = models.TextField(blank=True)
    link_url = models.URLField(blank=True)
    link_title = models.CharField(max_length=255, blank=True)
    link_description = models.TextField(blank=True)
    link_image_url = models.URLField(blank=True)
    repost_of = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reposts",
    )
    is_deleted = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Post {self.id} by {self.user.email}"


class PostMedia(models.Model):
    """Media attached to a post."""
    MEDIA_TYPES = [
        ("image", "Image"),
        ("video", "Video"),
    ]
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name="media")
    media_type = models.CharField(max_length=10, choices=MEDIA_TYPES)
    file = models.FileField(upload_to="post_media/")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.media_type} for post {self.post_id}"


class PostLike(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="post_likes")
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name="likes")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("user", "post")


class PostComment(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="post_comments")
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name="comments")
    content = models.TextField()
    is_deleted = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]


class PostReport(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="post_reports")
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name="reports")
    reason = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    resolved = models.BooleanField(default=False)


class Notification(models.Model):
    """Simple in-app notifications for social actions."""
    ACTIONS = [
        ("like", "Like"),
        ("comment", "Comment"),
        ("repost", "Repost"),
    ]
    recipient = models.ForeignKey(User, on_delete=models.CASCADE, related_name="notifications")
    actor = models.ForeignKey(User, on_delete=models.CASCADE, related_name="notifications_sent")
    action = models.CharField(max_length=20, choices=ACTIONS)
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name="notifications")
    comment_text = models.TextField(blank=True)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
