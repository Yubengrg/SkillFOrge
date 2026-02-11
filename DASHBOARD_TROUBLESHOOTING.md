# Dashboard Access Troubleshooting Guide

## Issue: Cannot Access Admin/Instructor Dashboards

### Root Cause
The dashboards are redirecting you because the authentication state is not being maintained properly.

---

## Quick Fix Steps

### Step 1: Clear Browser Data
1. Open browser DevTools (F12 or Right-click → Inspect)
2. Go to "Application" tab (Chrome) or "Storage" tab (Firefox)
3. Click "Clear site data" or manually delete:
   - Cookies
   - Local Storage
   - Session Storage
4. Refresh the page

### Step 2: Login Properly
1. Go to: http://localhost:5173/login
2. Open DevTools → Network tab
3. Enter credentials: `admin@skillforge.com` / `admin`
4. Click "Sign in"
5. Watch the Network tab for `/api/auth/login/` request
6. **Verify response**:
   - Status should be 200
   - Response should include user data with `is_staff: true`

### Step 3: Check Session Cookie
1. After login, go to DevTools → Application → Cookies
2. Look for `localhost:8000` cookies
3. **Verify** you have:
   - `sessionid` cookie
   - `csrftoken` cookie
4. If missing, there's a CORS or cookie issue

### Step 4: Test Authentication
1. After login, open DevTools → Console
2. Run this command:
```javascript
fetch('http://localhost:8000/api/auth/me/', {credentials: 'include'})
  .then(r => r.json())
  .then(d => console.log(d))
```
3. **Expected output**:
```json
{
  "user": {
    "id": 1,
    "email": "admin@skillforge.com",
    "is_staff": true,
    ...
  }
}
```
4. If you see `{"user": null}`, authentication failed

---

## Common Issues & Solutions

### Issue 1: CORS Error
**Symptom**: Console shows CORS error  
**Solution**: Check `skillForge/settings.py`:
```python
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
]
CORS_ALLOW_CREDENTIALS = True
```

### Issue 2: Session Cookie Not Set
**Symptom**: No `sessionid` cookie after login  
**Solution**: Check `skillForge/settings.py`:
```python
SESSION_COOKIE_SAMESITE = 'Lax'
SESSION_COOKIE_SECURE = False  # For development
CSRF_COOKIE_SAMESITE = 'Lax'
CSRF_COOKIE_SECURE = False  # For development
```

### Issue 3: Frontend Not Sending Credentials
**Symptom**: Cookies exist but not sent with requests  
**Solution**: All fetch calls must include `credentials: 'include'`

### Issue 4: User Not Admin
**Symptom**: Login works but dashboard redirects  
**Solution**: Verify user is admin in Django admin:
1. Go to http://localhost:8000/admin/
2. Login as admin
3. Go to Users
4. Check that admin@skillforge.com has:
   - ✓ Staff status
   - ✓ Superuser status

---

## Manual Testing Script

Run this in browser console after login:

```javascript
// Test 1: Check current user
fetch('http://localhost:8000/api/auth/me/', {credentials: 'include'})
  .then(r => r.json())
  .then(d => {
    console.log('Current User:', d);
    if (d.user) {
      console.log('✓ Logged in as:', d.user.email);
      console.log('✓ Is Admin:', d.user.is_staff);
      console.log('✓ Is Instructor:', d.user.instructor_profile?.is_approved);
    } else {
      console.log('✗ Not logged in');
    }
  });

// Test 2: Try accessing admin stats
fetch('http://localhost:8000/api/admin/stats/', {credentials: 'include'})
  .then(r => r.json())
  .then(d => console.log('Admin Stats:', d))
  .catch(e => console.error('Admin Stats Error:', e));
```

---

## Step-by-Step Debug Process

### 1. Check Backend is Running
```bash
curl http://localhost:8000/api/auth/me/
# Should return: {"user": null}
```

### 2. Login via curl
```bash
curl -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@skillforge.com","password":"admin"}' \
  -c cookies.txt -v
```
**Look for**:
- `Set-Cookie: sessionid=...`
- Response with user data

### 3. Test with Session
```bash
curl http://localhost:8000/api/auth/me/ -b cookies.txt
# Should return user data
```

### 4. Test Admin API
```bash
curl http://localhost:8000/api/admin/stats/ -b cookies.txt
# Should return stats
```

---

## If Still Not Working

### Check App.jsx User State
The issue might be in how `currentUser` is set. Check:

1. Open `frontend/src/App.jsx`
2. Look for `fetchCurrentUser` function
3. Verify it's called on mount
4. Check if `setCurrentUser` is being called with response data

### Check AdminDashboard.jsx
1. Open `frontend/src/pages/AdminDashboard.jsx`
2. Line 17: `if (!currentUser?.is_staff)`
3. Add console.log to debug:
```javascript
useEffect(() => {
    console.log('AdminDashboard - currentUser:', currentUser);
    if (!currentUser?.is_staff) {
        console.log('Not admin, redirecting...');
        navigate("/");
    }
}, [currentUser, navigate]);
```

---

## Quick Verification Checklist

Before accessing dashboards, verify:
- ✓ Backend running on port 8000
- ✓ Frontend running on port 5174
- ✓ Logged in successfully (check Network tab)
- ✓ Session cookie exists
- ✓ `/api/auth/me/` returns user data
- ✓ User has `is_staff: true` (for admin)
- ✓ User has `instructor_profile.is_approved: true` (for instructor)

---

## Emergency Reset

If nothing works:
```bash
# 1. Stop both servers
# 2. Clear browser completely
# 3. Restart backend
cd /Users/yubengurung/Documents/Projects/skillForge
source venv/bin/activate
python manage.py runserver

# 4. Restart frontend (new terminal)
cd /Users/yubengurung/Documents/Projects/skillForge/frontend
npm run dev

# 5. Clear cookies and try again
```

---

## Contact Points

If issue persists, check:
1. Browser console for errors
2. Network tab for failed requests
3. Backend terminal for errors
4. Django logs

**Most Common Fix**: Clear browser data and login again!
