from django.contrib.auth.backends import ModelBackend
from django.contrib.auth.models import User


class EmailOrUsernameBackend(ModelBackend):
    """Connexion par email (insensible à la casse) ou nom d'utilisateur."""

    def authenticate(self, request, username=None, password=None, **kwargs):
        ident = (username or kwargs.get("email") or "").strip()
        if not ident or password is None:
            return None
        user = (
            User.objects.filter(username__iexact=ident).first()
            or User.objects.filter(email__iexact=ident).first()
        )
        if user and user.check_password(password) and self.user_can_authenticate(user):
            return user
        return None
