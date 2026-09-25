from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("marketplace", "0001_initial"),
    ]

    operations = [
        migrations.AlterField(
            model_name="stock",
            name="image_url",
            field=models.URLField(blank=True, max_length=500),
        ),
    ]
