"""
Payment API views (Khalti wallet widget)
"""
import json
from decimal import Decimal

import requests
from django.conf import settings
from django.http import JsonResponse, HttpResponseNotAllowed
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.contrib.auth.decorators import login_required
from django.utils import timezone

from .models import Course, Enrollment, Payment


def _parse_json(request):
    try:
        if not request.body:
            return {}
        return json.loads(request.body.decode())
    except Exception:
        return {}


@login_required
@require_http_methods(["GET"])
def khalti_public_key(request):
    return JsonResponse({"public_key": settings.KHALTI_PUBLIC_KEY})


@csrf_exempt
@login_required
@require_http_methods(["POST"])
def khalti_verify(request):
    """
    Verify Khalti payment using token + amount (paisa), then enroll user.
    """
    if request.method != "POST":
        return HttpResponseNotAllowed(["POST"])

    payload = _parse_json(request)
    token = payload.get("token")
    amount = payload.get("amount")  # paisa
    course_id = payload.get("course_id")
    slug = payload.get("course_slug")

    if not token or not amount:
        return JsonResponse({"error": "token and amount are required"}, status=400)

    try:
        amount = int(amount)
    except Exception:
        return JsonResponse({"error": "amount must be an integer (paisa)"}, status=400)

    if not settings.KHALTI_SECRET_KEY:
        return JsonResponse({"error": "Khalti secret key not configured"}, status=500)

    course = None
    if course_id:
        course = Course.objects.filter(id=course_id, is_published=True).first()
    if not course and slug:
        course = Course.objects.filter(slug=slug, is_published=True).first()
    if not course:
        return JsonResponse({"error": "Course not found"}, status=404)

    expected_amount = course.price_npr * 100
    if expected_amount <= 0:
        return JsonResponse({"error": "Course is free"}, status=400)
    if amount != expected_amount:
        return JsonResponse({"error": "Amount mismatch"}, status=400)

    headers = {
        "Authorization": f"Key {settings.KHALTI_SECRET_KEY}",
    }
    data = {"token": token, "amount": amount}

    try:
        resp = requests.post(
            settings.KHALTI_VERIFY_URL,
            data=data,
            headers=headers,
            timeout=12,
        )
    except Exception as exc:
        return JsonResponse({"error": f"Verification request failed: {exc}"}, status=502)

    if resp.status_code != 200:
        return JsonResponse({"error": "Verification failed", "details": resp.text}, status=400)

    result = resp.json()
    state = result.get("state") or {}
    state_name = state.get("name")
    if state_name and state_name.lower() not in {"completed", "authorized"}:
        return JsonResponse({"error": f"Payment not completed ({state_name})"}, status=400)

    enrollment, _ = Enrollment.objects.get_or_create(user=request.user, course=course)

    payment, created = Payment.objects.get_or_create(
        enrollment=enrollment,
        user=request.user,
        course=course,
        provider="khalti",
        provider_reference=token,
        defaults={
            "amount": Decimal(amount) / Decimal(100),
            "currency": "NPR",
            "status": "paid",
            "paid_at": timezone.now(),
        },
    )

    if not created and payment.status != "paid":
        payment.status = "paid"
        payment.paid_at = payment.paid_at or timezone.now()
        payment.amount = Decimal(amount) / Decimal(100)
        payment.currency = "NPR"
        payment.save()

    return JsonResponse(
        {
            "success": True,
            "enrolled": True,
            "payment_id": payment.id,
            "course_id": course.id,
        }
    )
