from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('learning', '0005_lesson_quiz_auto_generated_and_more'),
    ]

    operations = [
        migrations.CreateModel(
            name='RoadmapSlot',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=120)),
                ('role', models.CharField(max_length=120)),
                ('roadmap_data', models.JSONField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='roadmap_slots', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='RoadmapCertificate',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('role', models.CharField(max_length=120)),
                ('certificate_id', models.CharField(max_length=100, unique=True)),
                ('issued_at', models.DateTimeField(auto_now_add=True)),
                ('slot', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='certificate', to='learning.roadmapslot')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='roadmap_certificates', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-issued_at'],
            },
        ),
    ]
