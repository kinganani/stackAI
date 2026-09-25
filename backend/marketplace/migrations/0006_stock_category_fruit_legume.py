from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("marketplace", "0005_buyeralert_accepted"),
    ]

    operations = [
        migrations.AlterField(
            model_name="stock",
            name="category",
            field=models.CharField(
                choices=[
                    ("tomate", "Tomates"),
                    ("plantain", "Plantains"),
                    ("mangue", "Mangues"),
                    ("poisson", "Poissons"),
                    ("legume", "Légumes"),
                    ("fruit", "Fruits"),
                    ("autre", "Autre"),
                ],
                default="autre",
                max_length=24,
            ),
        ),
    ]
