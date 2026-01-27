from django.db import models
from django.contrib.auth.models import User


class UserProfile(models.Model):
    """Extended user profile with additional fields"""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    bio = models.TextField(blank=True, null=True)  # Bio for all users
    profile_photo = models.ImageField(upload_to='profile_photos/', blank=True, null=True)
    location = models.CharField(max_length=100, blank=True, null=True)
    website = models.URLField(max_length=200, blank=True, null=True)
    social_links = models.JSONField(default=dict, blank=True)  # {linkedin, twitter, github}
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.user.email}'s profile"
    
    class Meta:
        db_table = 'user_profiles'


class Achievement(models.Model):
    """User achievements and badges"""
    ACHIEVEMENT_TYPES = [
        ('course_complete', 'Course Completed'),
        ('streak', 'Learning Streak'),
        ('instructor', 'Became Instructor'),
        ('milestone', 'Milestone Reached'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='achievements')
    achievement_type = models.CharField(max_length=50, choices=ACHIEVEMENT_TYPES)
    title = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    icon = models.CharField(max_length=50, default='🏆')  # Emoji or icon class
    earned_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.user.email} - {self.title}"
    
    class Meta:
        db_table = 'user_achievements'
        ordering = ['-earned_at']
        unique_together = ['user', 'achievement_type', 'title']  # Prevent duplicates


class Activity(models.Model):
    """User activity timeline"""
    ACTIVITY_TYPES = [
        ('enrolled', 'Enrolled in Course'),
        ('completed_lesson', 'Completed Lesson'),
        ('completed_course', 'Completed Course'),
        ('created_course', 'Created Course'),
        ('became_instructor', 'Became Instructor'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='activities')
    activity_type = models.CharField(max_length=50, choices=ACTIVITY_TYPES)
    description = models.CharField(max_length=255)
    metadata = models.JSONField(default=dict, blank=True)  # Additional data
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.user.email} - {self.activity_type}"
    
    class Meta:
        db_table = 'user_activities'
        ordering = ['-created_at']
        verbose_name_plural = 'Activities'
