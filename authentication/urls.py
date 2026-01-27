from django.urls import path
from . import views

urlpatterns = [
    path("auth/signup/", views.signup, name="signup"),
    path("auth/login/", views.login_view, name="login"),
    path("auth/logout/", views.logout_view, name="logout"),
    path("auth/me/", views.me, name="me"),
    path(
        "auth/verify/<uidb64>/<token>/",
        views.verify_email,
        name="verify_email",
    ),
    path(
        "auth/resend-verification/",
        views.resend_verification,
        name="resend_verification",
    ),
    path(
        "auth/google/",
        views.google_login,
        name="google_login",
    ),
    path(
        "auth/apply-instructor/",
        views.apply_instructor,
        name="apply_instructor",
    ),
    path(
        "profile/me/",
        views.get_profile,
        name="get_own_profile",
    ),
    path(
        "profile/<int:user_id>/",
        views.get_profile,
        name="get_user_profile",
    ),
    path(
        "profile/update/",
        views.update_profile,
        name="update_profile",
    ),
]
