#!/bin/bash
# API Endpoint Testing Script

echo "=========================================="
echo "Testing API Endpoints"
echo "=========================================="
echo ""

BASE_URL="http://localhost:8000"

echo "1. Testing Public Endpoints"
echo "----------------------------"

echo -n "Homepage API (courses): "
curl -s "${BASE_URL}/api/courses/" | grep -q "courses" && echo "✓ PASS" || echo "✗ FAIL"

echo -n "Categories API: "
curl -s "${BASE_URL}/api/categories/" | grep -q "categories" && echo "✓ PASS" || echo "✗ FAIL"

echo -n "Auth check (no session): "
curl -s "${BASE_URL}/api/auth/me/" | grep -q '"user": null' && echo "✓ PASS" || echo "✗ FAIL"

echo ""
echo "2. Testing Admin API (without auth - should fail)"
echo "----------------------------"

echo -n "Admin stats (should redirect/fail): "
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}/api/admin/stats/")
if [ "$STATUS" = "302" ] || [ "$STATUS" = "403" ] || [ "$STATUS" = "401" ]; then
    echo "✓ PASS (Protected: $STATUS)"
else
    echo "✗ FAIL (Not protected: $STATUS)"
fi

echo -n "Pending instructors (should redirect/fail): "
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}/api/admin/instructors/pending/")
if [ "$STATUS" = "302" ] || [ "$STATUS" = "403" ] || [ "$STATUS" = "401" ]; then
    echo "✓ PASS (Protected: $STATUS)"
else
    echo "✗ FAIL (Not protected: $STATUS)"
fi

echo ""
echo "3. Testing Instructor API (without auth - should fail)"
echo "----------------------------"

echo -n "Instructor stats (should redirect/fail): "
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}/api/instructor/stats/")
if [ "$STATUS" = "302" ] || [ "$STATUS" = "403" ] || [ "$STATUS" = "401" ]; then
    echo "✓ PASS (Protected: $STATUS)"
else
    echo "✗ FAIL (Not protected: $STATUS)"
fi

echo -n "Instructor courses (should redirect/fail): "
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}/api/instructor/courses/")
if [ "$STATUS" = "302" ] || [ "$STATUS" = "403" ] || [ "$STATUS" = "401" ]; then
    echo "✓ PASS (Protected: $STATUS)"
else
    echo "✗ FAIL (Not protected: $STATUS)"
fi

echo ""
echo "4. Testing Frontend"
echo "----------------------------"

echo -n "Frontend server: "
curl -s "http://localhost:5173" | grep -q "<title>" && echo "✓ PASS" || echo "✗ FAIL"

echo ""
echo "=========================================="
echo "API Security Test Complete"
echo "=========================================="
