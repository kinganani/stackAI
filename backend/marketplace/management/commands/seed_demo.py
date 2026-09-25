from datetime import timedelta

from django.contrib.auth.models import User
from django.core.management.base import BaseCommand
from django.utils import timezone

from accounts.models import Profile
from marketplace.models import Stock
from marketplace.notify import notify_buyers_in_radius

QUARTIERS = {
    "Assigamé": (6.1319, 1.2228),
    "Bè-Kpota": (6.1370, 1.2480),
    "Port de Pêche": (6.1375, 1.2865),
    "Hedzranawoé": (6.1860, 1.2080),
    "Agoè-Nyivé": (6.2340, 1.1970),
}

IMAGES = {
    "tomate": "https://lh3.googleusercontent.com/aida-public/AB6AXuBOqfbcdV4PrSd_etrtXo69FBKNuMerJrr19vHSjkPHM0BNrh3UrADxWOo1vUzeUuWb1uGdjh62b8XLWwJROTG5lZG-qH9du-Tm4qyXOofVzmTDLrdg4gze5h12nUGX50ZsfZt99Bj27EjOyGAuNjOkPtZzjLk9SAbFIXbrTzEUObv8nlTLEBvmzc_idb0CfJTP5Ngytt4q-TCzbhBVryoLggvT-aLLAydcwiXJO6MEgYBF_m95oECaoQ",
    "plantain": "https://lh3.googleusercontent.com/aida-public/AB6AXuAUNF4LzgO0y-ISRoTSgbvR1uyKjVtks1UAyR1mG_wAvm5TKqY-7fe6eSXb6eY5a0bVrYb6jNdlMIpEEsXtfp2onHNCGImzwuMUAPApAbziQS6u0lUg3SHyNlZqFj9umxMk9MKT2UU7DWirP1kbCzdkw8CVtc9AbTlBLd2lU1bINo8iLz1Y3WeNlSMWFvvmUVWlwHzjzhBTCbAYTF3LVlmJvdhU4FnoQgEXgEsIwcTJkPMfygTWY1676w",
    "mangue": "https://lh3.googleusercontent.com/aida-public/AB6AXuDWrFCELgb1fsTmIinDhHb-0eFRxcvULY99if4NahtSainGLnBHmCykKIxSX9j-1bCY-2F2aHYmOMcJE6HJlHvbs0KX9z2MZAB0aJTM3wlNaBTxVldfW3vV79m_XZqjnLYAEcHzp3VdNwFkv2XSd9Q4uFHIHbcj7QxL4tM_1oFr5uNPqMcFvuyRrS-Khsf23vSeCbOkfWgYpKg5DHI9jjsKdoBCCIRRZpeFau2tSNxC5X0kiS3_ZtxP9Q",
    "legume": "https://lh3.googleusercontent.com/aida-public/AB6AXuBOqfbcdV4PrSd_etrtXo69FBKNuMerJrr19vHSjkPHM0BNrh3UrADxWOo1vUzeUuWb1uGdjh62b8XLWwJROTG5lZG-qH9du-Tm4qyXOofVzmTDLrdg4gze5h12nUGX50ZsfZt99Bj27EjOyGAuNjOkPtZzjLk9SAbFIXbrTzEUObv8nlTLEBvmzc_idb0CfJTP5Ngytt4q-TCzbhBVryoLggvT-aLLAydcwiXJO6MEgYBF_m95oECaoQ",
}


class Command(BaseCommand):
    help = "Comptes et lots de démo Lomé"

    def handle(self, *args, **options):
        now = timezone.now()
        User.objects.filter(
            username__in=[
                "22890111213",
                "22890222333",
                "22890333444",
                "afi@fraislink.tg",
                "maquis@fraislink.tg",
                "kpalime@fraislink.tg",
            ]
        ).delete()
        seller, _ = User.objects.get_or_create(
            username="afi@localmatch.tg",
            defaults={"email": "afi@localmatch.tg", "first_name": "Afi", "last_name": "Mensah"},
        )
        seller.email = "afi@localmatch.tg"
        seller.first_name = "Afi"
        seller.last_name = "Mensah"
        seller.set_password("Fraislink1!")
        seller.save()
        Profile.objects.update_or_create(
            user=seller,
            defaults={
                "role": "seller",
                "display_name": "Afi Mensah",
                "phone": "22890111213",
                "quartier": "Assigamé",
                "lat": QUARTIERS["Assigamé"][0],
                "lng": QUARTIERS["Assigamé"][1],
                "momo_alias": "AFI TOMATE",
            },
        )

        resto, _ = User.objects.get_or_create(
            username="maquis@localmatch.tg",
            defaults={"email": "maquis@localmatch.tg", "first_name": "Koffi", "last_name": "Amegavi"},
        )
        resto.email = "maquis@localmatch.tg"
        resto.first_name = "Koffi"
        resto.last_name = "Amegavi"
        resto.set_password("Fraislink1!")
        resto.save()
        Profile.objects.update_or_create(
            user=resto,
            defaults={
                "role": "buyer",
                "display_name": "Koffi Amegavi",
                "phone": "22890222333",
                "quartier": "Port de Pêche",
                "lat": QUARTIERS["Port de Pêche"][0],
                "lng": QUARTIERS["Port de Pêche"][1],
                "radius_km": 15,
                "buyer_type": "restaurant",
            },
        )

        far, _ = User.objects.get_or_create(
            username="kpalime@localmatch.tg",
            defaults={"email": "kpalime@localmatch.tg", "first_name": "Ama", "last_name": "Kpalimé"},
        )
        far.email = "kpalime@localmatch.tg"
        far.first_name = "Ama"
        far.last_name = "Kpalimé"
        far.set_password("Fraislink1!")
        far.save()
        Profile.objects.update_or_create(
            user=far,
            defaults={
                "role": "buyer",
                "display_name": "Ama Kpalimé",
                "phone": "22890333444",
                "quartier": "Kpalimé",
                "lat": 6.9100,
                "lng": 0.6300,
                "radius_km": 5,
                "buyer_type": "canteen",
            },
        )

        Stock.objects.filter(seller=seller).delete()
        from marketplace.models import BuyerAlert

        BuyerAlert.objects.all().delete()
        lots = [
            {
                "product_name": "Cageots de Tomates de Kovié",
                "category": "tomate",
                "qty_initial": 80,
                "unit": "kg",
                "quartier": "Assigamé",
                "adresse_collecte": "Grand Marché d'Assigamé, Hangar 14, devant la pharmacie",
                "hours": 14,
                "market_price": 350,
            },
            {
                "product_name": "Plantains Mûres (Aloko / Foutou)",
                "category": "plantain",
                "qty_initial": 40,
                "unit": "kg",
                "quartier": "Hedzranawoé",
                "adresse_collecte": "Marché Hedzranawoé, allée des fruits, stand jaune",
                "hours": 22,
                "market_price": 400,
            },
            {
                "product_name": "Gombo et légumes feuilles",
                "category": "legume",
                "qty_initial": 25,
                "unit": "kg",
                "quartier": "Agoè-Nyivé",
                "adresse_collecte": "Marché Agoè, allée des maraîchers, hangar vert",
                "hours": 18,
                "market_price": 300,
            },
            {
                "product_name": "Mangues Kent Ciselées pour Jus",
                "category": "mangue",
                "qty_initial": 50,
                "unit": "kg",
                "quartier": "Bè-Kpota",
                "adresse_collecte": "Marché de Bè, devant la pharmacie",
                "hours": 30,
                "market_price": 500,
            },
        ]
        for lot in lots:
            lat, lng = QUARTIERS[lot["quartier"]]
            stock = Stock.objects.create(
                seller=seller,
                product_name=lot["product_name"],
                category=lot["category"],
                qty_initial=lot["qty_initial"],
                qty_available=lot["qty_initial"],
                unit=lot["unit"],
                quartier=lot["quartier"],
                lat=lat,
                lng=lng,
                adresse_collecte=lot["adresse_collecte"],
                description=f"Lot d'urgence {lot['product_name']} — collecte {lot['adresse_collecte']}.",
                expires_at=now + timedelta(hours=lot["hours"]),
                market_price=lot["market_price"],
                published_price=lot["market_price"],
                image_url=IMAGES[lot["category"]],
                status=Stock.Status.LIVE,
            )
            notify_buyers_in_radius(stock, now)
        self.stdout.write(self.style.SUCCESS("Seed OK — afi@localmatch.tg / maquis@localmatch.tg — Fraislink1!"))
