from rest_framework import permissions


class IsOwnerOrReadOnly(permissions.BasePermission):
    """Object-level permission: only owner can edit."""
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        return obj == request.user or getattr(obj, 'user', None) == request.user


class IsPrestataire(permissions.BasePermission):
    """Only providers can access."""
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'prestataire'


class IsProprietaire(permissions.BasePermission):
    """Only property owners can access."""
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'proprietaire'


class IsCustomerService(permissions.BasePermission):
    """Only customer service staff can access."""
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'customer_service'


class IsAdOwner(permissions.BasePermission):
    """Only the ad's provider can modify it."""
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        return obj.provider == request.user


class IsParticipant(permissions.BasePermission):
    """Only conversation participants can access."""
    def has_object_permission(self, request, view, obj):
        return request.user in obj.participants.all()
