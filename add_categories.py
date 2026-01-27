#!/usr/bin/env python3
"""
Add comprehensive category list to SkillForge
"""
import sys
import os
import django

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'skillForge.settings')
django.setup()

from learning.models import Category

# Comprehensive category list
categories = [
    # Technology & Programming
    ("Web Development", "HTML, CSS, JavaScript, React, Vue, Angular"),
    ("Mobile Development", "iOS, Android, React Native, Flutter"),
    ("Data Science", "Python, R, Machine Learning, AI"),
    ("Cloud Computing", "AWS, Azure, Google Cloud, DevOps"),
    ("Cybersecurity", "Ethical Hacking, Network Security, Penetration Testing"),
    ("Game Development", "Unity, Unreal Engine, Game Design"),
    ("Database Management", "SQL, MongoDB, PostgreSQL, Database Design"),
    ("Software Engineering", "Design Patterns, Architecture, Best Practices"),
    ("DevOps", "CI/CD, Docker, Kubernetes, Automation"),
    ("Blockchain", "Cryptocurrency, Smart Contracts, Web3"),
    
    # Design & Creative
    ("Design", "UI/UX, Graphic Design, Product Design"),
    ("Photography", "Digital Photography, Photo Editing, Lightroom"),
    ("Video Production", "Video Editing, Premiere Pro, After Effects"),
    ("3D Modeling", "Blender, Maya, 3D Animation"),
    ("Illustration", "Digital Art, Drawing, Procreate"),
    ("Animation", "2D Animation, Motion Graphics"),
    
    # Business & Marketing
    ("Business", "Entrepreneurship, Strategy, Management"),
    ("Marketing", "Digital Marketing, SEO, Social Media"),
    ("Sales", "Sales Techniques, Negotiation, CRM"),
    ("Finance", "Accounting, Investment, Financial Analysis"),
    ("Project Management", "Agile, Scrum, PMP, Leadership"),
    ("E-commerce", "Shopify, Amazon FBA, Dropshipping"),
    
    # Personal Development
    ("Personal Development", "Productivity, Time Management, Goal Setting"),
    ("Health & Fitness", "Nutrition, Exercise, Wellness"),
    ("Music", "Music Theory, Instruments, Production"),
    ("Languages", "English, Spanish, French, Mandarin"),
    ("Writing", "Creative Writing, Copywriting, Content Creation"),
    ("Public Speaking", "Presentation Skills, Communication"),
    
    # Academic
    ("Mathematics", "Algebra, Calculus, Statistics"),
    ("Science", "Physics, Chemistry, Biology"),
    ("Engineering", "Mechanical, Electrical, Civil Engineering"),
    ("Test Prep", "SAT, GRE, GMAT, IELTS"),
    
    # Lifestyle & Hobbies
    ("Cooking", "Baking, Culinary Arts, Recipe Development"),
    ("Gardening", "Urban Gardening, Landscaping, Plants"),
    ("DIY & Crafts", "Woodworking, Crafting, Home Improvement"),
    ("Travel", "Travel Planning, Photography, Culture"),
    ("Pets", "Pet Care, Training, Animal Behavior"),
]

print("=" * 70)
print("ADDING CATEGORIES TO SKILLFORGE")
print("=" * 70)

added = 0
existing = 0

for name, description in categories:
    category, created = Category.objects.get_or_create(
        name=name,
        defaults={"description": description}
    )
    
    if created:
        print(f"✓ Added: {name}")
        added += 1
    else:
        print(f"- Already exists: {name}")
        existing += 1

print("\n" + "=" * 70)
print(f"SUMMARY: {added} new categories added, {existing} already existed")
print(f"Total categories: {Category.objects.count()}")
print("=" * 70)
