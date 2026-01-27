from django.contrib.auth import get_user_model
from learning.models import Course, Enrollment

User = get_user_model()
user, created = User.objects.get_or_create(email='learner@example.com')
user.set_password('password123')
user.save()
print(f'User created/updated: learner@example.com')

course = Course.objects.filter(slug='html-basics').first()
if course:
    enrollment, e_created = Enrollment.objects.get_or_create(user=user, course=course)
    print(f'Enrolled in HTML Basics: {e_created}')
else:
    # Try getting any course
    course = Course.objects.first()
    if course:
        enrollment, e_created = Enrollment.objects.get_or_create(user=user, course=course)
        print(f'Enrolled in {course.title}: {e_created}')
    else:
        print('No courses found')
