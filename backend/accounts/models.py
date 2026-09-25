import uuid

from django.contrib.auth.models import AbstractBaseUser, BaseUserManager
from django.db import models


class ProfileManager(BaseUserManager):
    def create_user(self, phone, password, **extra):
        if extra.get("email"):
            extra["email"] = self.normalize_email(extra["email"])
        user = self.model(phone=phone, **extra)
        user.set_password(password)
        user.save(using=self._db)
        return user


class Profile(AbstractBaseUser):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    phone = models.CharField(max_length=20, unique=True)
    email = models.EmailField(unique=True, null=True, blank=True)
    full_name = models.CharField(max_length=120)
    role = models.CharField(max_length=10)
    quarter = models.CharField(max_length=80)
    lat = models.FloatField()
    lng = models.FloatField()
    radius_km = models.DecimalField(max_digits=5, decimal_places=2, default=5)
    buyer_type = models.CharField(max_length=40, null=True, blank=True)
    momo_alias = models.CharField(max_length=80, null=True, blank=True)
    is_active = models.BooleanField(default=True)
    date_joined = models.DateTimeField(auto_now_add=True)

    objects = ProfileManager()
    USERNAME_FIELD = "phone"
    REQUIRED_FIELDS = []

    class Meta:
        db_table = "profiles"
        managed = False

    def __str__(self):
        return self.phone
