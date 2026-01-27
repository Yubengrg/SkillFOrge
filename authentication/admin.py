from django.contrib import admin, messages
from django.contrib.auth import get_user_model
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.admin.sites import NotRegistered

from .views import send_verification_email  # reuse your existing helper

User = get_user_model()


class EmailVerifiedFilter(admin.SimpleListFilter):
    """Filter users by 'email verified' status (based on is_active)."""

    title = "email verification"
    parameter_name = "email_verified"

    def lookups(self, request, model_admin):
        return (
            ("yes", "Verified"),
            ("no", "Not verified"),
        )

    def queryset(self, request, queryset):
        value = self.value()
        if value == "yes":
            return queryset.filter(is_active=True)
        if value == "no":
            return queryset.filter(is_active=False)
        return queryset


class UserAdmin(BaseUserAdmin):
    # columns in list view
    list_display = (
        "id",
        "email",
        "first_name",
        "last_name",
        "is_verified",
        "is_staff",
        "is_superuser",
        "last_login",
        "date_joined",
    )
    list_display_links = ("email",)
    list_filter = (
        EmailVerifiedFilter,
        "is_staff",
        "is_superuser",
        "is_active",
        "date_joined",
    )
    search_fields = ("email", "first_name", "last_name", "username")
    ordering = ("-date_joined",)

    readonly_fields = ("date_joined", "last_login")

    fieldsets = (
        (None, {"fields": ("username", "password")}),
        (
            "Personal info",
            {"fields": ("first_name", "last_name", "email")},
        ),
        (
            "Permissions",
            {
                "fields": (
                    "is_active",
                    "is_staff",
                    "is_superuser",
                    "groups",
                    "user_permissions",
                )
            },
        ),
        ("Important dates", {"fields": ("last_login", "date_joined")}),
    )

    actions = [
        "mark_as_verified",
        "mark_as_unverified",
        "send_verification_emails",
    ]

    @admin.display(boolean=True, description="Email verified")
    def is_verified(self, obj):
        # in your flow, is_active == email verified
        return obj.is_active

    # === BULK ACTIONS ===

    @admin.action(description="Mark selected users as verified (active)")
    def mark_as_verified(self, request, queryset):
        updated = queryset.update(is_active=True)
        self.message_user(
            request,
            f"{updated} user(s) marked as verified/active.",
            level=messages.SUCCESS,
        )

    @admin.action(description="Mark selected users as UNverified (inactive)")
    def mark_as_unverified(self, request, queryset):
        updated = queryset.update(is_active=False)
        self.message_user(
            request,
            f"{updated} user(s) marked as unverified/inactive.",
            level=messages.WARNING,
        )

    @admin.action(description="Resend verification email to UNverified users")
    def send_verification_emails(self, request, queryset):
        unverified = queryset.filter(is_active=False)
        count = 0
        for user in unverified:
            send_verification_email(request, user)
            count += 1

        if count:
            self.message_user(
                request,
                f"Verification email sent to {count} user(s).",
                level=messages.SUCCESS,
            )
        else:
            self.message_user(
                request,
                "No unverified users in selection.",
                level=messages.INFO,
            )


# unregister default auth.UserAdmin and register our custom one
try:
    admin.site.unregister(User)
except NotRegistered:
    pass

admin.site.register(User, UserAdmin)
