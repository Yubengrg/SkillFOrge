from django.contrib import admin
from .models import UserProfile, Achievement, Activity


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ['user', 'location', 'website', 'created_at']
    search_fields = ['user__email', 'user__first_name', 'user__last_name', 'location']
    list_filter = ['created_at']


@admin.register(Achievement)
class AchievementAdmin(admin.ModelAdmin):
    list_display = ['user', 'title', 'achievement_type', 'earned_at']
    search_fields = ['user__email', 'title']
    list_filter = ['achievement_type', 'earned_at']


@admin.register(Activity)
class ActivityAdmin(admin.ModelAdmin):
    list_display = ['user', 'activity_type', 'description', 'created_at']
    search_fields = ['user__email', 'description']
    list_filter = ['activity_type', 'created_at']
