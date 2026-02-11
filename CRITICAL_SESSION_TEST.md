# CRITICAL SESSION BUG - Diagnostic Test

## Test This EXACT Sequence

### Step 1: Clear Everything
```bash
# Stop both servers (Ctrl+C)
# Then in Django:
cd /Users/yubengurung/Documents/Projects/skillForge
source venv/bin/activate
python manage.py shell

# Run:
from django.contrib.sessions.models import Session
Session.objects.all().delete()
exit()

# Restart servers
python manage.py runserver  # Terminal 1
cd frontend && npm run dev   # Terminal 2
```

### Step 2: Test in Browser 1 (Chrome)
1. Open Chrome (regular, not incognito)
2. Go to: http://localhost:5173
3. Open DevTools → Console
4. Run this BEFORE logging in:
```javascript
console.log('BEFORE LOGIN - Cookies:', document.cookie);
```
5. Login as: `instructor@skillforge.com` / `instructor123`
6. After login, run:
```javascript
console.log('AFTER LOGIN - Cookies:', document.cookie);
fetch('http://localhost:8000/api/auth/me/', {credentials: 'include'})
  .then(r => r.json())
  .then(d => console.log('I am:', d.user?.email))
```
7. **COPY THE SESSIONID** from cookies

### Step 3: Test in Browser 2 (Firefox)
1. Open Firefox (completely different browser)
2. Go to: http://localhost:5173
3. Open DevTools → Console
4. Run BEFORE logging in:
```javascript
console.log('BEFORE LOGIN - Cookies:', document.cookie);
```
5. **IMPORTANT**: Check if there's ALREADY a sessionid cookie
   - If YES → That's the bug! Cookies are leaking between browsers
   - If NO → Continue
6. Login as: `admin@skillforge.com` / `admin`
7. After login, run:
```javascript
console.log('AFTER LOGIN - Cookies:', document.cookie);
fetch('http://localhost:8000/api/auth/me/', {credentials: 'include'})
  .then(r => r.json())
  .then(d => console.log('I am:', d.user?.email))
```
8. **COPY THE SESSIONID** from cookies

### Step 4: Compare
**The two sessionid values should be DIFFERENT!**

If they're the same → That's impossible unless:
- You're using the same browser profile
- There's a proxy/VPN caching cookies
- Your system has some weird localhost cookie sharing

### Step 5: Go Back to Browser 1
1. **WITHOUT refreshing**, run in console:
```javascript
fetch('http://localhost:8000/api/auth/me/', {credentials: 'include'})
  .then(r => r.json())
  .then(d => console.log('Still logged in as:', d.user?.email))
```
2. Should still say "instructor@skillforge.com"

3. Now **REFRESH the page**
4. After page loads, run:
```javascript
fetch('http://localhost:8000/api/auth/me/', {credentials: 'include'})
  .then(r => r.json())
  .then(d => console.log('After refresh, I am:', d.user?.email))
```

**Expected**: Still "instructor@skillforge.com"
**If it changed to admin**: That's the bug!

---

## If Bug Confirmed

The issue is that **refreshing is somehow changing the session cookie**.

Possible causes:
1. **Vite HMR** is doing something weird
2. **Service Worker** is caching
3. **Browser extension** is interfering
4. **Antivirus/Firewall** is proxying localhost

### Fix Attempt 1: Disable Vite HMR

Edit `frontend/vite.config.js`:
```javascript
export default defineConfig({
  server: {
    hmr: false,  // Disable Hot Module Reload
  }
})
```

### Fix Attempt 2: Hard Refresh

Instead of normal refresh, do:
- Chrome: Ctrl+Shift+R (Cmd+Shift+R on Mac)
- Firefox: Ctrl+F5

### Fix Attempt 3: Check for Service Workers

In DevTools → Application → Service Workers
- If any are registered → Unregister them

---

## Report Back

Tell me:
1. Are the sessionid cookies DIFFERENT in step 3?
2. Does browser 1 change users after refresh in step 5?
3. What do you see in the console logs?

This will help me pinpoint the exact issue!
