"""
API views for social feed functionality.
"""
import json
import re
import urllib.request
import ipaddress
import socket
from urllib.parse import urlparse

from django.http import JsonResponse, HttpResponseNotAllowed
from django.views.decorators.http import require_http_methods
from django.contrib.auth.decorators import login_required
from django.views.decorators.csrf import csrf_exempt
from django.db.models import Count, Q

from .models import (
    Follow,
    Post,
    PostMedia,
    PostLike,
    PostComment,
    PostReport,
    Notification,
)


def _parse_json(request):
    try:
        if not request.body:
            return {}
        return json.loads(request.body.decode())
    except Exception:
        return {}


def _user_summary(user):
    profile = getattr(user, "profile", None)
    return {
        "id": user.id,
        "name": user.get_full_name() or user.first_name or user.email,
        "email": user.email,
        "avatar": profile.profile_photo.url if profile and profile.profile_photo else None,
    }


def _serialize_media(media):
    return {
        "id": media.id,
        "type": media.media_type,
        "url": media.file.url if media.file else None,
    }


def _serialize_post(post, current_user, liked_ids=None, reposted_ids=None, include_repost=True):
    liked_ids = liked_ids or set()
    reposted_ids = reposted_ids or set()
    data = {
        "id": post.id,
        "author": _user_summary(post.user),
        "content": post.content,
        "link": {
            "url": post.link_url,
            "title": post.link_title,
            "description": post.link_description,
            "image_url": post.link_image_url,
        } if post.link_url else None,
        "media": [_serialize_media(m) for m in post.media.all()],
        "created_at": post.created_at.isoformat(),
        "liked": post.id in liked_ids,
        "reposted": post.id in reposted_ids,
        "likes_count": getattr(post, "likes_count", 0),
        "comments_count": getattr(post, "comments_count", 0),
        "reposts_count": getattr(post, "reposts_count", 0),
        "is_repost": bool(post.repost_of_id),
    }
    if include_repost and post.repost_of:
        data["repost_of"] = _serialize_post(
            post.repost_of,
            current_user,
            liked_ids=liked_ids,
            reposted_ids=reposted_ids,
            include_repost=False,
        )
    return data


def _create_notification(action, actor, post, comment_text=""):
    recipient = post.user
    if recipient.id == actor.id:
        return
    Notification.objects.create(
        recipient=recipient,
        actor=actor,
        action=action,
        post=post,
        comment_text=comment_text,
    )


def _safe_fetch(url):
    try:
        parsed = urlparse(url)
        if parsed.scheme not in ("http", "https"):
            return None
        host = parsed.hostname
        if not host:
            return None
        if host in ("localhost",) or host.endswith(".local"):
            return None
        try:
            addr = ipaddress.ip_address(socket.gethostbyname(host))
            if addr.is_private or addr.is_loopback or addr.is_reserved or addr.is_link_local:
                return None
        except Exception:
            return None
        req = urllib.request.Request(url, headers={"User-Agent": "SkillForgeBot/1.0"})
        with urllib.request.urlopen(req, timeout=6) as resp:
            if resp.status != 200:
                return None
            content_type = resp.headers.get("Content-Type", "")
            if "text/html" not in content_type:
                return None
            return resp.read(200000).decode("utf-8", errors="ignore")
    except Exception:
        return None


def _extract_meta(html, prop):
    pattern = rf'<meta[^>]+property=["\\\']{re.escape(prop)}["\\\'][^>]+content=["\\\']([^"\\\']+)["\\\']'
    match = re.search(pattern, html, re.IGNORECASE)
    if match:
        return match.group(1).strip()
    return None


def _extract_title(html):
    match = re.search(r"<title>(.*?)</title>", html, re.IGNORECASE | re.DOTALL)
    if match:
        return re.sub(r"\s+", " ", match.group(1)).strip()
    return None


@csrf_exempt
@login_required
@require_http_methods(["GET"])
def link_preview(request):
    url = request.GET.get("url", "").strip()
    if not url:
        return JsonResponse({"error": "url is required"}, status=400)
    html = _safe_fetch(url)
    if not html:
        return JsonResponse({"url": url, "title": "", "description": "", "image_url": ""})
    title = _extract_meta(html, "og:title") or _extract_title(html) or ""
    description = _extract_meta(html, "og:description") or ""
    image = _extract_meta(html, "og:image") or ""
    return JsonResponse({"url": url, "title": title, "description": description, "image_url": image})


@csrf_exempt
@login_required
@require_http_methods(["GET"])
def feed_list(request):
    feed_type = request.GET.get("type", "following")
    limit = int(request.GET.get("limit", 20))
    offset = int(request.GET.get("offset", 0))

    if feed_type == "following":
        following_ids = list(
            Follow.objects.filter(follower=request.user).values_list("following_id", flat=True)
        )
        following_ids.append(request.user.id)
        qs = Post.objects.filter(is_deleted=False, user_id__in=following_ids)
        if not qs.exists():
            feed_type = "global"
            qs = Post.objects.filter(is_deleted=False)
    else:
        feed_type = "global"
        qs = Post.objects.filter(is_deleted=False)

    qs = qs.select_related("user", "repost_of", "repost_of__user").prefetch_related("media")
    qs = qs.annotate(
        likes_count=Count("likes", distinct=True),
        comments_count=Count("comments", filter=Q(comments__is_deleted=False), distinct=True),
        reposts_count=Count("reposts", filter=Q(reposts__is_deleted=False), distinct=True),
    )

    posts = list(qs[offset:offset + limit])
    post_ids = [p.id for p in posts]
    liked_ids = set(
        PostLike.objects.filter(user=request.user, post_id__in=post_ids).values_list("post_id", flat=True)
    )
    reposted_ids = set(
        Post.objects.filter(user=request.user, repost_of_id__in=post_ids, is_deleted=False)
        .values_list("repost_of_id", flat=True)
    )

    data = [_serialize_post(p, request.user, liked_ids, reposted_ids) for p in posts]
    return JsonResponse({"feed_type": feed_type, "posts": data})


@csrf_exempt
@login_required
@require_http_methods(["POST"])
def create_post(request):
    if request.content_type and "multipart/form-data" in request.content_type:
        payload = request.POST
    else:
        payload = _parse_json(request)

    content = (payload.get("content") or "").strip()
    link_url = (payload.get("link_url") or "").strip()
    link_title = (payload.get("link_title") or "").strip()
    link_description = (payload.get("link_description") or "").strip()
    link_image_url = (payload.get("link_image_url") or "").strip()

    media_files = request.FILES.getlist("media")

    if not content and not link_url and not media_files:
        return JsonResponse({"error": "Post content, media, or link is required"}, status=400)

    post = Post.objects.create(
        user=request.user,
        content=content,
        link_url=link_url,
        link_title=link_title,
        link_description=link_description,
        link_image_url=link_image_url,
    )

    for media in media_files:
        media_type = "image" if (media.content_type or "").startswith("image/") else "video"
        if media_type not in ("image", "video"):
            continue
        PostMedia.objects.create(post=post, media_type=media_type, file=media)

    post = Post.objects.filter(id=post.id).prefetch_related("media").select_related("user").first()
    return JsonResponse({"post": _serialize_post(post, request.user)}, status=201)


@csrf_exempt
@login_required
@require_http_methods(["DELETE"])
def delete_post(request, post_id):
    try:
        post = Post.objects.get(id=post_id, is_deleted=False)
    except Post.DoesNotExist:
        return JsonResponse({"error": "Post not found"}, status=404)

    if post.user_id != request.user.id and not request.user.is_staff:
        return JsonResponse({"error": "Not allowed"}, status=403)

    post.is_deleted = True
    post.save(update_fields=["is_deleted", "updated_at"])
    return JsonResponse({"success": True})


@csrf_exempt
@login_required
@require_http_methods(["POST"])
def toggle_like(request, post_id):
    try:
        post = Post.objects.get(id=post_id, is_deleted=False)
    except Post.DoesNotExist:
        return JsonResponse({"error": "Post not found"}, status=404)

    like, created = PostLike.objects.get_or_create(user=request.user, post=post)
    if not created:
        like.delete()
        liked = False
    else:
        liked = True
        _create_notification("like", request.user, post)
    likes_count = PostLike.objects.filter(post=post).count()
    return JsonResponse({"liked": liked, "likes_count": likes_count})


@csrf_exempt
@login_required
@require_http_methods(["POST"])
def toggle_repost(request, post_id):
    try:
        post = Post.objects.get(id=post_id, is_deleted=False)
    except Post.DoesNotExist:
        return JsonResponse({"error": "Post not found"}, status=404)

    existing = Post.objects.filter(
        user=request.user,
        repost_of=post,
        is_deleted=False,
    ).first()

    if existing:
        existing.is_deleted = True
        existing.save(update_fields=["is_deleted", "updated_at"])
        reposted = False
    else:
        payload = _parse_json(request)
        content = (payload.get("content") or "").strip()
        Post.objects.create(user=request.user, content=content, repost_of=post)
        reposted = True
        _create_notification("repost", request.user, post)

    reposts_count = Post.objects.filter(repost_of=post, is_deleted=False).count()
    return JsonResponse({"reposted": reposted, "reposts_count": reposts_count})


@csrf_exempt
@login_required
@require_http_methods(["POST", "GET"])
def post_comments(request, post_id):
    try:
        post = Post.objects.get(id=post_id, is_deleted=False)
    except Post.DoesNotExist:
        return JsonResponse({"error": "Post not found"}, status=404)

    if request.method == "POST":
        payload = _parse_json(request)
        content = (payload.get("content") or "").strip()
        if not content:
            return JsonResponse({"error": "content is required"}, status=400)
        comment = PostComment.objects.create(user=request.user, post=post, content=content)
        _create_notification("comment", request.user, post, comment_text=comment.content[:280])
        return JsonResponse({
            "comment": {
                "id": comment.id,
                "author": _user_summary(comment.user),
                "content": comment.content,
                "created_at": comment.created_at.isoformat(),
            }
        }, status=201)

    comments = PostComment.objects.filter(post=post, is_deleted=False).select_related("user")
    data = [
        {
            "id": c.id,
            "author": _user_summary(c.user),
            "content": c.content,
            "created_at": c.created_at.isoformat(),
        }
        for c in comments
    ]
    return JsonResponse({"comments": data})


@csrf_exempt
@login_required
@require_http_methods(["POST"])
def report_post(request, post_id):
    try:
        post = Post.objects.get(id=post_id, is_deleted=False)
    except Post.DoesNotExist:
        return JsonResponse({"error": "Post not found"}, status=404)

    payload = _parse_json(request)
    reason = (payload.get("reason") or "").strip()
    if not reason:
        return JsonResponse({"error": "reason is required"}, status=400)
    PostReport.objects.create(user=request.user, post=post, reason=reason)
    return JsonResponse({"reported": True})


@csrf_exempt
@login_required
@require_http_methods(["POST"])
def toggle_follow(request, user_id):
    if user_id == request.user.id:
        return JsonResponse({"error": "Cannot follow yourself"}, status=400)

    existing = Follow.objects.filter(follower=request.user, following_id=user_id).first()
    if existing:
        existing.delete()
        following = False
    else:
        Follow.objects.create(follower=request.user, following_id=user_id)
        following = True
    return JsonResponse({"following": following})


@login_required
@require_http_methods(["GET"])
def list_following(request):
    following = Follow.objects.filter(follower=request.user).select_related("following")
    data = [_user_summary(f.following) for f in following]
    return JsonResponse({"following": data})


@login_required
@require_http_methods(["GET"])
def follow_status(request, user_id):
    is_following = Follow.objects.filter(follower=request.user, following_id=user_id).exists()
    follower_count = Follow.objects.filter(following_id=user_id).count()
    following_count = Follow.objects.filter(follower_id=user_id).count()
    return JsonResponse({
        "is_following": is_following,
        "follower_count": follower_count,
        "following_count": following_count,
    })


@login_required
@require_http_methods(["GET"])
def list_notifications(request):
    limit = int(request.GET.get("limit", 40))
    notifications = list(
        Notification.objects.filter(recipient=request.user)
        .select_related("actor", "post")
        .order_by("-created_at")[:limit]
    )
    unread_count = Notification.objects.filter(recipient=request.user, is_read=False).count()

    grouped = {}
    data = []
    for n in notifications:
        if n.action in ("like", "repost"):
            key = (n.post_id, n.action)
            if key not in grouped:
                grouped[key] = {
                    "id": n.id,
                    "action": n.action,
                    "post_id": n.post_id,
                    "post_excerpt": (n.post.content or "")[:140],
                    "actors": [ _user_summary(n.actor) ],
                    "count": 1,
                    "is_read": n.is_read,
                    "created_at": n.created_at.isoformat(),
                }
            else:
                grouped[key]["count"] += 1
                grouped[key]["actors"].append(_user_summary(n.actor))
                if not n.is_read:
                    grouped[key]["is_read"] = False
        else:
            data.append({
                "id": n.id,
                "action": n.action,
                "actor": _user_summary(n.actor),
                "post_id": n.post_id,
                "post_excerpt": (n.post.content or "")[:140],
                "comment_text": n.comment_text,
                "is_read": n.is_read,
                "created_at": n.created_at.isoformat(),
            })

    data.extend(grouped.values())
    data.sort(key=lambda x: x["created_at"], reverse=True)
    return JsonResponse({"notifications": data, "unread_count": unread_count})


@csrf_exempt
@login_required
@require_http_methods(["POST"])
def mark_notifications_read(request):
    Notification.objects.filter(recipient=request.user, is_read=False).update(is_read=True)
    return JsonResponse({"success": True})
