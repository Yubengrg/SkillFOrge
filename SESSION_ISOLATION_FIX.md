# Multi-User Testing Guide - Session Issue Resolution

## The Problem You're Experiencing

You're seeing the **same logged-in user across 3 different incognito browsers**. This is unusual and suggests one of these issues:

### Possible Causes:

1. **Browser Cache Issue**: Even incognito mode might be caching something
2. **LocalStorage/SessionStorage**: Frontend might be storing user data locally
3. **Service Worker**: Vite dev server might have a service worker caching
4. **Cookie Domain Issue**: Cookies might be set incorrectly

---

## Immediate Solution - Hard Reset

### Step 1: Stop All Servers
```bash
# Kill all running processes
# Press Ctrl+C in all terminal windows
```

### Step 2: Clear Everything
```bash
# In project root
cd /Users/yubengurung/Documents/Projects/skillForge

# Clear Django sessions from database
source venv/bin/activate
python manage.py shell

# Then run:
from django.contrib.sessions.models import Session
Session.objects.all().delete()
exit()
```

### Step 3: Restart Servers
```bash
# Terminal 1 - Backend
python manage.py runserver

# Terminal 2 - Frontend  
cd frontend
npm run dev
```

### Step 4: Test in Fresh Browsers

**Browser 1 - Chrome Incognito**:
1. Open NEW incognito window
2. Go to: http://localhost:5174
3. Open DevTools → Application → Clear site data
4. Refresh
5. Login as: `admin@skillforge.com` / `admin`
6. Check DevTools → Application → Cookies → localhost:8000
7. You should see `sessionid` cookie

**Browser 2 - Firefox Private**:
1. Open NEW private window
2. Go to: http://localhost:5174
3. Open DevTools → Storage → Clear all
4. Refresh
5. Login as: `instructor@skillforge.com` / `instructor123`
6. Check cookies - should be DIFFERENT sessionid

**Browser 3 - Safari Private** (or Edge):
1. Open NEW private window
2. Go to: http://localhost:5174
3. Clear all data
4. Login as new user

---

## Verification Test

After logging in to each browser, run this in **each browser's console**:

```javascript
// Check current user
fetch('http://localhost:8000/api/auth/me/', {credentials: 'include'})
  .then(r => r.json())
  .then(d => console.log('Logged in as:', d.user?.email))

// Check session cookie
document.cookie.split(';').forEach(c => console.log(c.trim()))
```

**Expected**: Each browser should show a DIFFERENT email.

---

## If Still Not Working

### Check 1: Verify Cookies Are Different

In each browser DevTools:
1. Application → Cookies → http://localhost:8000
2. Look at `sessionid` value
3. **Each browser should have a DIFFERENT sessionid**

If they're the same, that's the problem!

### Check 2: Check Frontend LocalStorage

In each browser console:
```javascript
// Check if user is stored locally
console.log('LocalStorage:', localStorage.getItem('user'))
console.log('SessionStorage:', sessionStorage.getItem('user'))
```

**Should be**: null or undefined (we don't store user locally)

### Check 3: Network Tab

1. Login in one browser
2. Open Network tab
3. Look at `/api/auth/login/` request
4. Check Response Headers for `Set-Cookie: sessionid=...`
5. **Each login should set a DIFFERENT sessionid**

---

## The Real Fix (If Above Doesn't Work)

The issue might be that the frontend is caching the user state. Let me check if we're using localStorage:

### Check App.jsx

Look for any `localStorage.setItem('user', ...)` or similar.

**If found**, we need to remove it because:
- LocalStorage persists across incognito windows on same machine
- Should only use cookies for auth

---

## Alternative: Use Browser Profiles

If incognito still shares sessions:

### Chrome Profiles
1. Click profile icon (top right)
2. "Add" → Create "John", "Alice", "Sarah"
3. Each profile = completely separate browser instance

### Firefox Profiles
```bash
# Open profile manager
firefox -ProfileManager

# Create 3 profiles: john, alice, sarah
# Launch each:
firefox -P john
firefox -P alice  
firefox -P sarah
```

---

## Quick Test Script

Save this as `test_sessions.sh`:

```bash
#!/bin/bash

echo "Testing session isolation..."

# Login as admin
ADMIN_SESSION=$(curl -s -c - -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@skillforge.com","password":"admin"}' \
  | grep sessionid | awk '{print $7}')

# Login as instructor
INSTRUCTOR_SESSION=$(curl -s -c - -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email":"instructor@skillforge.com","password":"instructor123"}' \
  | grep sessionid | awk '{print $7}')

echo "Admin session: $ADMIN_SESSION"
echo "Instructor session: $INSTRUCTOR_SESSION"

if [ "$ADMIN_SESSION" = "$INSTRUCTOR_SESSION" ]; then
  echo "❌ PROBLEM: Sessions are the same!"
else
  echo "✅ Sessions are different - auth is working correctly"
fi
```

Run: `bash test_sessions.sh`

---

## Summary

**Most likely cause**: Browser caching or localStorage

**Solution**:
1. Clear all browser data
2. Restart servers
3. Use completely fresh incognito windows
4. Or use browser profiles

**If still broken**: The issue is in the frontend code storing user data somewhere it shouldn't.

Let me know which test fails and I'll dig deeper!
