from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from .models import PrestaireProfile, ProprietaireProfile, ProviderBadge, UserBadge, Appointment

User = get_user_model()


class PrestaireProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = PrestaireProfile
        fields = [
            'company_name', 'siret', 'website', 'years_experience',
            'service_radius_km', 'is_available', 'certifications',
            'specialties', 'total_reviews', 'average_rating', 'completed_projects'
        ]
        read_only_fields = ['total_reviews', 'average_rating', 'completed_projects']


class ProprietaireProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProprietaireProfile
        fields = ['property_type', 'property_surface', 'energy_interests', 'budget_range']


class ProviderBadgeSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProviderBadge
        fields = ['id', 'name', 'slug', 'description', 'badge_type', 'icon', 'color']


class UserBadgeSerializer(serializers.ModelSerializer):
    badge = ProviderBadgeSerializer(read_only=True)

    class Meta:
        model = UserBadge
        fields = ['id', 'badge', 'awarded_at', 'notes']


class UserSerializer(serializers.ModelSerializer):
    prestataire_profile = PrestaireProfileSerializer(read_only=True)
    proprietaire_profile = ProprietaireProfileSerializer(read_only=True)
    badges = UserBadgeSerializer(many=True, read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'role', 'phone', 'avatar', 'city', 'postal_code',
            'address', 'bio', 'is_verified', 'latitude', 'longitude',
            'created_at', 'prestataire_profile', 'proprietaire_profile', 'badges'
        ]
        read_only_fields = ['id', 'role', 'is_verified', 'created_at']


class UserPublicSerializer(serializers.ModelSerializer):
    """Public-facing user info (no sensitive data)."""
    prestataire_profile = PrestaireProfileSerializer(read_only=True)
    badges = UserBadgeSerializer(many=True, read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'username', 'first_name', 'last_name',
            'role', 'avatar', 'city', 'bio', 'is_verified',
            'latitude', 'longitude',
            'created_at', 'prestataire_profile', 'badges'
        ]


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True)
    
    class Meta:
        model = User
        fields = [
            'username', 'email', 'password', 'password_confirm',
            'first_name', 'last_name', 'role', 'phone', 'city', 'postal_code'
        ]
    
    def validate(self, attrs):
        if attrs['password'] != attrs.pop('password_confirm'):
            raise serializers.ValidationError({"password_confirm": "Les mots de passe ne correspondent pas."})
        if User.objects.filter(email=attrs.get('email', '')).exists():
            raise serializers.ValidationError({"email": "Cet email est déjà utilisé."})
        return attrs
    
    def create(self, validated_data):
        user = User.objects.create_user(**validated_data)
        # Create role-specific profile
        if user.role == User.Role.PRESTATAIRE:
            PrestaireProfile.objects.create(user=user)
        elif user.role == User.Role.PROPRIETAIRE:
            ProprietaireProfile.objects.create(user=user)
        return user


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField()
    new_password = serializers.CharField(validators=[validate_password])
    
    def validate_old_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError("Mot de passe actuel incorrect.")
        return value


class UserUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            'first_name', 'last_name', 'phone', 'avatar',
            'city', 'postal_code', 'address', 'bio',
            'latitude', 'longitude'
        ]


class AppointmentSerializer(serializers.ModelSerializer):
    provider_name = serializers.CharField(source='provider.get_full_name', read_only=True)
    owner_name = serializers.CharField(source='owner.get_full_name', read_only=True)

    class Meta:
        model = Appointment
        fields = [
            'id', 'provider', 'owner', 'provider_name', 'owner_name',
            'quote_request', 'title', 'description',
            'date', 'start_time', 'end_time', 'location',
            'status', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']

    def create(self, validated_data):
        validated_data.setdefault('provider', self.context['request'].user)
        return super().create(validated_data)


class AppointmentUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Appointment
        fields = ['status', 'date', 'start_time', 'end_time', 'location', 'description']
