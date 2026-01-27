#!/usr/bin/env python3
"""
Debug script to check session isolation
"""
import sys
import os
import django

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'skillForge.settings')
django.setup()

from django.contrib.sessions.models import Session
from django.contrib.auth.models import User

print("=" * 70)
print("SESSION DEBUGGING")
print("=" * 70)

# Check all active sessions
sessions = Session.objects.all()
print(f"\nTotal active sessions: {sessions.count()}")

for session in sessions:
    print(f"\nSession Key: {session.session_key}")
    print(f"Expires: {session.expire_date}")
    data = session.get_decoded()
    print(f"Session Data: {data}")
    
    # Try to get user from session
    user_id = data.get('_auth_user_id')
    if user_id:
        try:
            user = User.objects.get(id=user_id)
            print(f"Logged in as: {user.email}")
        except User.DoesNotExist:
            print("User not found")
    else:
        print("No user logged in")

print("\n" + "=" * 70)
print("DIAGNOSIS:")
print("=" * 70)

if sessions.count() == 0:
    print("✓ No active sessions - this is normal if no one is logged in")
elif sessions.count() == 1:
    print("⚠️  Only 1 session exists")
    print("   This means all browsers are sharing the same session!")
    print("   This is the BUG!")
elif sessions.count() > 1:
    print(f"✓ {sessions.count()} different sessions exist")
    print("   Sessions are properly isolated")
else:
    print("? Unexpected session count")

print("\n" + "=" * 70)
