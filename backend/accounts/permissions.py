from rest_framework.permissions import BasePermission

class IsSeller(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and hasattr(request.user, "profile") and request.user.profile.role == "seller")

class IsBuyer(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and hasattr(request.user, "profile") and request.user.profile.role == "buyer")
