from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("marketplace", "0007_drop_poisson_category"),
    ]

    operations = [
        migrations.AlterField(
            model_name="stock",
            name="image_url",
            field=models.CharField(blank=True, max_length=500),
        ),
    ]
