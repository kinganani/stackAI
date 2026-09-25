from django.db import migrations, models


def remap_poisson(apps, schema_editor):
    Stock = apps.get_model("marketplace", "Stock")
    Stock.objects.filter(category="poisson").update(category="legume")


class Migration(migrations.Migration):

    dependencies = [
        ("marketplace", "0006_stock_category_fruit_legume"),
    ]

    operations = [
        migrations.RunPython(remap_poisson, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="stock",
            name="category",
            field=models.CharField(
                choices=[
                    ("tomate", "Tomates"),
                    ("plantain", "Plantains"),
                    ("mangue", "Mangues"),
                    ("legume", "Légumes"),
                    ("fruit", "Fruits"),
                    ("autre", "Autre"),
                ],
                default="autre",
                max_length=24,
            ),
        ),
    ]
