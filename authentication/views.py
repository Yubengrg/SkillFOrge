from google.oauth2 import id_token as google_id_token
from google.auth.transport import requests as google_requests
import json

from django.conf import settings
from django.core.mail import send_mail
from django.http import JsonResponse, HttpResponse
from django.urls import reverse
from django.views.decorators.csrf import csrf_exempt

from django.contrib.auth.models import User
from django.contrib.auth import authenticate, login as auth_login, logout as auth_logout

from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.contrib.auth.tokens import default_token_generator


def parse_body(request):
    """Helper to safely parse JSON body."""
    try:
        return json.loads(request.body.decode("utf-8"))
    except json.JSONDecodeError:
        return {}


def send_verification_email(request, user: User):
    """Send an email with a verification link to the given user."""
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = default_token_generator.make_token(user)

    verification_path = reverse(
        "verify_email",
        kwargs={"uidb64": uid, "token": token},
    )
    verification_url = request.build_absolute_uri(verification_path)

    subject = "Verify your SkillForge account"
    message = (
        f"Hi {user.first_name or user.username},\n\n"
        f"Thanks for signing up for SkillForge.\n\n"
        f"Please click the link below to verify your email address:\n"
        f"{verification_url}\n\n"
        f"If you didn’t create this account, you can ignore this email."
    )

    send_mail(
        subject,
        message,
        settings.DEFAULT_FROM_EMAIL,
        [user.email],
        fail_silently=False,
    )


@csrf_exempt  # dev-only: makes it easier for your React frontend
def signup(request):
    """
    Sign up with:
    - first_name
    - last_name
    - email
    - password
    - password_confirm
    """
    if request.method != "POST":
        return JsonResponse({"error": "Only POST allowed"}, status=405)

    data = parse_body(request)
    first_name = (data.get("first_name") or "").strip()
    last_name = (data.get("last_name") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password")
    password_confirm = data.get("password_confirm")

    if not first_name or not last_name or not email or not password or not password_confirm:
        return JsonResponse(
            {"error": "first_name, last_name, email, password and password_confirm are required"},
            status=400,
        )

    if password != password_confirm:
        return JsonResponse(
            {"error": "passwords do not match"},
            status=400,
        )

    if len(password) < 8:
        return JsonResponse(
            {"error": "password must be at least 8 characters"},
            status=400,
        )

    # use email as username internally
    username = email

    if User.objects.filter(username=username).exists():
        return JsonResponse(
            {"error": "an account with this email already exists"},
            status=400,
        )

    if User.objects.filter(email=email).exists():
        return JsonResponse(
            {"error": "email already in use"},
            status=400,
        )

    # Start as inactive until email is verified
    user = User.objects.create_user(
        username=username,
        email=email,
        password=password,
        first_name=first_name,
        last_name=last_name,
        is_active=False,
    )

    try:
        send_verification_email(request, user)
    except Exception as e:
        user.delete()
        return JsonResponse(
            {"error": f"could not send verification email: {e}"},
            status=500,
        )

    return JsonResponse(
        {
            "message": "account created. please check your email to verify your account.",
        },
        status=201,
    )


@csrf_exempt  # dev-only
@csrf_exempt  # dev-only
def login_view(request):
    """
    Login with:
    - email
    - password
    """
    if request.method != "POST":
        return JsonResponse({"error": "Only POST allowed"}, status=405)

    data = parse_body(request)
    email = (data.get("email") or "").strip().lower()
    password = data.get("password")

    if not email or not password:
        return JsonResponse(
            {"error": "email and password are required"},
            status=400,
        )

    # Try to find a user with this email
    try:
        user_obj = User.objects.get(email=email)
    except User.DoesNotExist:
        return JsonResponse(
            {"error": "invalid credentials"},
            status=400,
        )

    # Check password manually so we can distinguish "unverified" vs "wrong password"
    if not user_obj.check_password(password):
        return JsonResponse(
            {"error": "invalid credentials"},
            status=400,
        )

    # Password is correct, now check verification status
    if not user_obj.is_active:
        return JsonResponse(
            {
                "error": "email not verified yet",
                "code": "not_verified",    # 👈 frontend will look at this
                "email": user_obj.email,
            },
            status=403,
        )

    # Verified user → log in
    user = authenticate(request, username=user_obj.username, password=password)
    if user is None:
        # Should not normally happen here, but just in case
        return JsonResponse(
            {"error": "invalid credentials"},
            status=400,
        )

    auth_login(request, user)

    # Determine user role
    role = 'student'  # default
    if user.is_staff or user.is_superuser:
        role = 'admin'
    else:
        # Check if user has an approved instructor profile
        try:
            from learning.models import InstructorProfile
            instructor_profile = InstructorProfile.objects.filter(user=user, is_approved=True).first()
            if instructor_profile:
                role = 'instructor'
        except:
            pass

    # Check if instructor
    is_instructor = False
    try:
        from learning.models import InstructorProfile
        instructor_profile = InstructorProfile.objects.filter(user=user, is_approved=True).first()
        if instructor_profile:
            is_instructor = True
    except:
        pass
    
    return JsonResponse(
        {
            "message": "logged in successfully",
            "user": {
                "id": user.id,
                "email": user.email,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "role": role,
                "is_staff": user.is_staff or user.is_superuser,
                "is_superuser": user.is_superuser,
                "is_instructor": is_instructor,
            },
        }
    )

@csrf_exempt  # dev-only
def logout_view(request):
    if request.method != "POST":
        return JsonResponse({"error": "Only POST allowed"}, status=405)

    auth_logout(request)
    return JsonResponse({"message": "logged out"})


def me(request):
    """Return current logged-in user (or null)."""
    if not request.user.is_authenticated:
        return JsonResponse({"user": None})

    user = request.user
    
    # Determine user role
    role = 'student'  # default
    if user.is_staff or user.is_superuser:
        role = 'admin'
    else:
        # Check if user has an approved instructor profile
        try:
            from learning.models import InstructorProfile
            instructor_profile = InstructorProfile.objects.filter(user=user, is_approved=True).first()
            if instructor_profile:
                role = 'instructor'
        except:
            pass
    
    # Check if instructor
    is_instructor = False
    try:
        from learning.models import InstructorProfile
        instructor_profile = InstructorProfile.objects.filter(user=user, is_approved=True).first()
        if instructor_profile:
            is_instructor = True
    except:
        pass
    
    return JsonResponse(
        {
            "user": {
                "id": user.id,
                "email": user.email,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "role": role,
                "is_staff": user.is_staff or user.is_superuser,
                "is_superuser": user.is_superuser,
                "is_instructor": is_instructor,
            }
        }
    )


def verify_email(request, uidb64, token):
    """Endpoint hit from email link to activate the user."""
    try:
        uid = force_str(urlsafe_base64_decode(uidb64))
        user = User.objects.get(pk=uid)
    except (TypeError, ValueError, OverflowError, User.DoesNotExist):
        user = None

    if user is not None and default_token_generator.check_token(user, token):
        if not user.is_active:
            user.is_active = True
            user.save()
        return HttpResponse(
            "Your email has been verified ✅ You can now return to the app and log in."
        )

    return HttpResponse(
        "Verification link is invalid or has expired.",
        status=400,
    )
@csrf_exempt  # dev-only
def resend_verification(request):
    """
    Resend verification email to an existing, inactive user.
    Body:
    - email
    """
    if request.method != "POST":
        return JsonResponse({"error": "Only POST allowed"}, status=405)

    data = parse_body(request)
    email = (data.get("email") or "").strip().lower()

    if not email:
        return JsonResponse({"error": "email is required"}, status=400)

    try:
        user = User.objects.get(email=email)
    except User.DoesNotExist:
        # You can make this generic if you don't want to reveal existence
        return JsonResponse({"error": "no account found with this email"}, status=400)

    if user.is_active:
        return JsonResponse(
            {"error": "this account is already verified"},
            status=400,
        )

    try:
        send_verification_email(request, user)
    except Exception as e:
        return JsonResponse(
            {"error": f"could not send verification email: {e}"},
            status=500,
        )

    return JsonResponse(
        {"message": "verification email resent. please check your inbox."},
        status=200,
    )
@csrf_exempt  # dev-only
def google_login(request):
    """
    Login / signup with Google ID token.
    Body:
    - credential: Google ID token (JWT)
    """
    if request.method != "POST":
        return JsonResponse({"error": "Only POST allowed"}, status=405)

    data = parse_body(request)
    credential = data.get("credential") or data.get("id_token")

    if not credential:
        return JsonResponse({"error": "credential is required"}, status=400)

    try:
        idinfo = google_id_token.verify_oauth2_token(
            credential,
            google_requests.Request(),
            settings.GOOGLE_CLIENT_ID,
        )
    except Exception as e:
        print(f"Google token verification failed: {e}")  # Debug logging
        return JsonResponse({"error": f"invalid Google token: {str(e)}"}, status=400)

    # Basic info from Google
    email = (idinfo.get("email") or "").lower()
    email_verified = idinfo.get("email_verified", False)
    given_name = idinfo.get("given_name") or ""
    family_name = idinfo.get("family_name") or ""

    if not email:
        return JsonResponse({"error": "Google account has no email"}, status=400)

    if not email_verified:
        # for security, usually require verified email
        return JsonResponse({"error": "Google email not verified"}, status=400)

    # Create or get local user
    user = User.objects.filter(email=email).first()
    
    if not user:
        user = User.objects.create_user(
            username=email,
            email=email,
            password=None,  # no local password, Google-only
            first_name=given_name,
            last_name=family_name,
        )

    # Make sure account is active (Google verified the email)
    if not user.is_active:
        user.is_active = True
        user.save()

    # Log in via Django session
    auth_login(request, user)

    # Determine user role
    role = 'student'  # default
    if user.is_staff or user.is_superuser:
        role = 'admin'
    else:
        # Check if user has an approved instructor profile
        try:
            from learning.models import InstructorProfile
            instructor_profile = InstructorProfile.objects.filter(user=user, is_approved=True).first()
            if instructor_profile:
                role = 'instructor'
        except:
            pass

    # Check if instructor
    is_instructor = False
    try:
        from learning.models import InstructorProfile
        instructor_profile = InstructorProfile.objects.filter(user=user, is_approved=True).first()
        if instructor_profile:
            is_instructor = True
    except:
        pass
    
    return JsonResponse(
        {
            "message": "logged in with Google",
            "user": {
                "id": user.id,
                "email": user.email,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "role": role,
                "is_staff": user.is_staff or user.is_superuser,
                "is_superuser": user.is_superuser,
                "is_instructor": is_instructor,
            },
        }
    )


@csrf_exempt
def apply_instructor(request):
    """Apply to become an instructor with enhanced verification"""
    if request.method != "POST":
        return JsonResponse({"error": "Only POST allowed"}, status=405)
    
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Authentication required"}, status=401)
    
    # Handle FormData or JSON
    if request.content_type and 'multipart/form-data' in request.content_type:
        data = request.POST
    else:
        try:
            data = parse_body(request)
        except:
            data = request.POST
    
    # Extract basic fields
    bio = data.get("bio", "").strip()
    expertise_str = data.get("expertise", "")
    
    # Parse expertise
    if isinstance(expertise_str, str):
        try:
            expertise = json.loads(expertise_str)
        except:
            expertise = [tag.strip() for tag in expertise_str.split(",") if tag.strip()]
    else:
        expertise = expertise_str
    
    # Extract professional verification fields
    years_of_experience = int(data.get("years_of_experience", 0))
    linkedin_url = data.get("linkedin_url", "").strip()
    portfolio_url = data.get("portfolio_url", "").strip()
    teaching_experience = data.get("teaching_experience", "").strip()
    why_teach = data.get("why_teach", "").strip()
    sample_course_topic = data.get("sample_course_topic", "").strip()
    
    # Parse certifications
    certifications_str = data.get("certifications", "[]")
    if isinstance(certifications_str, str):
        try:
            certifications = json.loads(certifications_str)
        except:
            certifications = []
    else:
        certifications = certifications_str
    
    # Validation
    if not bio:
        return JsonResponse({"error": "Bio is required"}, status=400)
    
    if not expertise or not isinstance(expertise, list) or len(expertise) == 0:
        return JsonResponse({"error": "At least one area of expertise is required"}, status=400)
    
    # Check if user already has an instructor profile
    try:
        from learning.models import InstructorProfile
        existing = InstructorProfile.objects.filter(user=request.user).first()
        if existing:
            if existing.is_approved:
                return JsonResponse({"error": "You are already an approved instructor"}, status=400)
            else:
                return JsonResponse({"error": "Your instructor application is pending approval"}, status=400)
    except:
        pass
    
    # Create instructor profile
    try:
        from learning.models import InstructorProfile
        profile = InstructorProfile.objects.create(
            user=request.user,
            bio=bio,
            expertise=expertise,
            years_of_experience=years_of_experience,
            linkedin_url=linkedin_url if linkedin_url else None,
            portfolio_url=portfolio_url if portfolio_url else None,
            certifications=certifications,
            teaching_experience=teaching_experience,
            why_teach=why_teach,
            sample_course_topic=sample_course_topic,
            is_approved=False
        )
        
        # Handle resume upload
        if request.FILES.get("resume"):
            profile.resume = request.FILES["resume"]
            profile.save()
        
        return JsonResponse({
            "message": "Instructor application submitted successfully! Please wait for admin approval.",
            "profile_id": profile.id
        }, status=201)
    except Exception as e:
        return JsonResponse({"error": f"Failed to create instructor profile: {str(e)}"}, status=500)

    """
    Apply to become an instructor.
    Body:
    - bio: string (required, min 100 chars)
    - expertise: list of strings (required)
    """
    if request.method != "POST":
        return JsonResponse({"error": "Only POST allowed"}, status=405)
    
    # Check authentication
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Authentication required"}, status=401)
    
    data = parse_body(request)
    bio = (data.get("bio") or "").strip()
    expertise = data.get("expertise", [])
    
    # Validation
    if not bio or len(bio) < 100:
        return JsonResponse(
            {"error": "Bio is required and must be at least 100 characters"},
            status=400
        )
    
    if not expertise or not isinstance(expertise, list) or len(expertise) == 0:
        return JsonResponse(
            {"error": "At least one area of expertise is required"},
            status=400
        )
    
    # Check if user already has an instructor profile
    try:
        from learning.models import InstructorProfile
        existing = InstructorProfile.objects.filter(user=request.user).first()
        if existing:
            if existing.is_approved:
                return JsonResponse(
                    {"error": "You are already an approved instructor"},
                    status=400
                )
            else:
                return JsonResponse(
                    {"error": "Your instructor application is pending approval"},
                    status=400
                )
    except:
        pass
    
    # Create instructor profile
    try:
        from learning.models import InstructorProfile
        profile = InstructorProfile.objects.create(
            user=request.user,
            bio=bio,
            expertise=expertise,
            is_approved=False  # Pending admin approval
        )
        
        return JsonResponse(
            {
                "message": "Instructor application submitted successfully! Please wait for admin approval.",
                "profile_id": profile.id
            },
            status=201
        )
    except Exception as e:
        return JsonResponse(
            {"error": f"Failed to create instructor profile: {str(e)}"},
            status=500
        )


@csrf_exempt
def get_profile(request, user_id=None):
    """Get user profile (public or own)"""
    if request.method != "GET":
        return JsonResponse({"error": "Only GET allowed"}, status=405)
    
    # Get target user
    if user_id:
        try:
            from django.contrib.auth.models import User
            target_user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return JsonResponse({"error": "User not found"}, status=404)
    else:
        if not request.user.is_authenticated:
            return JsonResponse({"error": "Authentication required"}, status=401)
        target_user = request.user
    
    is_own_profile = request.user.is_authenticated and request.user.id == target_user.id
    
    # Determine role
    role = 'student'
    if target_user.is_staff or target_user.is_superuser:
        role = 'admin'
    else:
        try:
            from learning.models import InstructorProfile
            instructor_profile = InstructorProfile.objects.filter(user=target_user, is_approved=True).first()
            if instructor_profile:
                role = 'instructor'
        except:
            pass
    
    # Base profile data
    profile_data = {
        "id": target_user.id,
        "email": target_user.email if is_own_profile else None,
        "first_name": target_user.first_name,
        "last_name": target_user.last_name,
        "role": role,
        "joined_date": target_user.date_joined.isoformat(),
    }
    
    # Get extended profile fields
    try:
        from profiles.models import UserProfile
        user_profile, _ = UserProfile.objects.get_or_create(user=target_user)
        profile_data["bio"] = user_profile.bio
        profile_data["profile_photo"] = request.build_absolute_uri(user_profile.profile_photo.url) if user_profile.profile_photo else None
        profile_data["location"] = user_profile.location
        profile_data["website"] = user_profile.website
        profile_data["social_links"] = user_profile.social_links or {}
    except:
        profile_data["bio"] = None
        profile_data["profile_photo"] = None
        profile_data["location"] = None
        profile_data["website"] = None
        profile_data["social_links"] = {}
    
    # Instructor data
    if role == 'instructor':
        try:
            from learning.models import InstructorProfile, Course, Enrollment
            
            instructor = InstructorProfile.objects.get(user=target_user, is_approved=True)
            courses = Course.objects.filter(instructor=instructor, is_published=True)
            
            # Don't override bio - it's already set from UserProfile above
            profile_data["expertise"] = instructor.expertise
            profile_data["stats"] = {
                "total_courses": courses.count(),
                "total_students": Enrollment.objects.filter(course__instructor=instructor).count(),
                "avg_rating": 4.5,
            }
            
            course_limit = None if is_own_profile else 6
            profile_data["courses"] = [{
                "id": c.id,
                "title": c.title,
                "slug": c.slug,
                "category": c.category.name if c.category else None,
                "students": c.enrollments.count(),
            } for c in courses[:course_limit]]
        except:
            pass
    
    # Student data
    elif role == 'student':
        try:
            from learning.models import Enrollment
            enrollments = Enrollment.objects.filter(user=target_user).select_related('course')
            
            profile_data["stats"] = {
                "courses_completed": enrollments.filter(completed_at__isnull=False).count(),
                "courses_in_progress": enrollments.filter(completed_at__isnull=True).count(),
                "total_enrolled": enrollments.count(),
            }
            
            if is_own_profile:
                profile_data["enrollments"] = [{
                    "course_title": e.course.title,
                    "course_slug": e.course.slug,
                    "progress": float(e.progress_percent),
                } for e in enrollments[:10]]
        except:
            pass
    
    # Achievements
    try:
        from profiles.models import Achievement
        achievements = Achievement.objects.filter(user=target_user)
        achievement_limit = None if is_own_profile else 5
        profile_data["achievements"] = [{
            "title": a.title,
            "description": a.description,
            "icon": a.icon,
            "earned_at": a.earned_at.isoformat(),
        } for a in achievements[:achievement_limit]]
    except:
        profile_data["achievements"] = []
    
    # Activity timeline (only for own profile)
    if is_own_profile:
        try:
            from profiles.models import Activity
            activities = Activity.objects.filter(user=target_user)[:10]
            profile_data["activities"] = [{
                "type": a.activity_type,
                "description": a.description,
                "created_at": a.created_at.isoformat(),
            } for a in activities]
        except:
            profile_data["activities"] = []
    
    # Daily activity heatmap (for own profile)
    if is_own_profile:
        try:
            from learning.models import LessonProgress
            from datetime import datetime, timedelta
            from collections import defaultdict
            
            # Get last 365 days of activity
            end_date = datetime.now().date()
            start_date = end_date - timedelta(days=365)
            
            # Get all lesson completions in the last year
            lesson_progress = LessonProgress.objects.filter(
                enrollment__user=target_user,
                completed=True,
                completed_at__gte=start_date
            ).values_list('completed_at', flat=True)
            
            # Count activities per day
            activity_counts = defaultdict(int)
            for completed_at in lesson_progress:
                date_key = completed_at.date().isoformat()
                activity_counts[date_key] += 1
            
            profile_data["activity_heatmap"] = dict(activity_counts)
        except:
            profile_data["activity_heatmap"] = {}
    
    return JsonResponse({"profile": profile_data}, status=200)


@csrf_exempt
def update_profile(request):
    """Update current user's profile with extended fields"""
    if request.method not in ["PUT", "POST"]:
        return JsonResponse({"error": "Only PUT or POST allowed"}, status=405)
    
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Authentication required"}, status=401)
    
    # Handle FormData (for photo uploads) or JSON
    if request.content_type and 'multipart/form-data' in request.content_type:
        data = request.POST
    else:
        try:
            data = parse_body(request)
        except:
            data = request.POST
    
    user = request.user
    
    # Update basic user fields
    if "first_name" in data:
        user.first_name = data["first_name"].strip()
    if "last_name" in data:
        user.last_name = data["last_name"].strip()
    user.save()
    
    # Update extended profile fields (including bio for all users)
    try:
        from profiles.models import UserProfile
        import json
        profile, _ = UserProfile.objects.get_or_create(user=user)
        
        if "bio" in data:
            profile.bio = data["bio"].strip() if data["bio"] else None
        if "location" in data:
            profile.location = data["location"].strip() if data["location"] else None
        if "website" in data:
            profile.website = data["website"].strip() if data["website"] else None
        if "social_links" in data:
            # Handle both JSON string and dict
            social_links = data["social_links"]
            if isinstance(social_links, str):
                profile.social_links = json.loads(social_links)
            else:
                profile.social_links = social_links
        
        # Handle photo upload if present in request.FILES
        if request.FILES.get("profile_photo"):
            profile.profile_photo = request.FILES["profile_photo"]
        
        profile.save()
        
        # Also update instructor bio if user is instructor (for backwards compatibility)
        if "bio" in data:
            try:
                from learning.models import InstructorProfile
                instructor = InstructorProfile.objects.filter(user=user).first()
                if instructor:
                    instructor.bio = data["bio"].strip() if data["bio"] else ""
                    instructor.save()
            except:
                pass
        
    except Exception as e:
        return JsonResponse({"error": f"Failed to update profile: {str(e)}"}, status=500)
    
    return JsonResponse({
        "message": "Profile updated successfully",
        "user": {
            "id": user.id,
            "first_name": user.first_name,
            "last_name": user.last_name
        }
    }, status=200)
