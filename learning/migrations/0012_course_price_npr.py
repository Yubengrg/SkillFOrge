from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("learning", "0011_admin_action_log"),
    ]

    operations = [
        migrations.AddField(
            model_name="course",
            name="price_npr",
            field=models.PositiveIntegerField(default=0, help_text="Course price in NPR (rupees). 0 means free."),
        ),
    ]
