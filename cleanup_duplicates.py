"""
Quick script to find and remove duplicate user accounts.
Run this with: python manage.py shell < cleanup_duplicates.py
"""

from django.contrib.auth.models import User
from collections import defaultdict

# Find duplicate emails
email_counts = defaultdict(list)
for user in User.objects.all():
    email_counts[user.email].append(user)

# Show duplicates
duplicates_found = False
for email, users in email_counts.items():
    if len(users) > 1:
        duplicates_found = True
        print(f"\n❌ Found {len(users)} users with email: {email}")
        for i, user in enumerate(users):
            print(f"  {i+1}. ID={user.id}, username={user.username}, is_active={user.is_active}, last_login={user.last_login}")
        
        # Keep the most recently logged in user, or the first active one
        users_sorted = sorted(users, key=lambda u: (u.last_login or u.date_joined), reverse=True)
        keep_user = users_sorted[0]
        delete_users = users_sorted[1:]
        
        print(f"  ✅ Keeping: ID={keep_user.id}")
        for user in delete_users:
            print(f"  🗑️  Deleting: ID={user.id}")
            user.delete()

if not duplicates_found:
    print("✅ No duplicate users found!")
else:
    print("\n✅ Cleanup complete!")
