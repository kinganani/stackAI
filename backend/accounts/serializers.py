from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Profile
from .phone import normalize_phone


class RegisterSerializer(serializers.Serializer):
    first_name = serializers.CharField(max_length=80)
    last_name = serializers.CharField(max_length=80)
    email = serializers.EmailField()
    phone = serializers.CharField()
    password = serializers.CharField(min_length=8, write_only=True)
    password_confirm = serializers.CharField(min_length=8, write_only=True)
    role = serializers.ChoiceField(choices=Profile.Role.choices)
    quartier = serializers.CharField(max_length=80)
    lat = serializers.FloatField(required=False, allow_null=True)
    lng = serializers.FloatField(required=False, allow_null=True)
    buyer_type = serializers.CharField(required=False, allow_blank=True)
    radius_km = serializers.FloatField(required=False, default=15)

    def validate_email(self, value):
        email = value.lower().strip()
        if User.objects.filter(username=email).exists() or User.objects.filter(email=email).exists():
            raise serializers.ValidationError("Un compte existe déjà avec cet email.")
        return email

    def validate_phone(self, value):
        phone = normalize_phone(value)
        if Profile.objects.filter(phone=phone).exists():
            raise serializers.ValidationError("Un compte existe déjà avec ce numéro.")
        return phone

    def validate(self, data):
        if data["password"] != data["password_confirm"]:
            raise serializers.ValidationError({"password_confirm": "Les mots de passe ne correspondent pas."})
        return data

    def create(self, data):
        buyer_type = data.get("buyer_type") or ""
        if buyer_type == "family":
            buyer_type = "household"
        display = f"{data['first_name'].strip()} {data['last_name'].strip()}".strip()
        user = User.objects.create_user(
            username=data["email"],
            email=data["email"],
            password=data["password"],
            first_name=data["first_name"].strip(),
            last_name=data["last_name"].strip(),
        )
        Profile.objects.create(
            user=user,
            phone=data["phone"],
            role=data["role"],
            display_name=display,
            quartier=data.get("quartier", ""),
            lat=data.get("lat"),
            lng=data.get("lng"),
            radius_km=data.get("radius_km") or 15,
            buyer_type=buyer_type,
        )
        return user


class ProfileSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source="user.email", read_only=True)
    first_name = serializers.CharField(source="user.first_name", read_only=True)
    last_name = serializers.CharField(source="user.last_name", read_only=True)

    class Meta:
        model = Profile
        fields = (
            "email",
            "first_name",
            "last_name",
            "phone",
            "role",
            "display_name",
            "quartier",
            "lat",
            "lng",
            "radius_km",
            "buyer_type",
            "momo_alias",
        )
        read_only_fields = ("role", "phone", "email", "first_name", "last_name")
