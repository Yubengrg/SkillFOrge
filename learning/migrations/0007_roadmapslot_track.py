from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('learning', '0006_roadmap_slot_certificate'),
    ]

    operations = [
        migrations.AddField(
            model_name='roadmapslot',
            name='track',
            field=models.CharField(blank=True, default='', max_length=120),
        ),
    ]
