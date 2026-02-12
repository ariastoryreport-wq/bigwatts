from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from .models import PrestaireProfile, ProprietaireProfile, ProviderBadge, UserBadge, Appointment, ProviderDocument, Certification, CertificationStatusLog

User = get_user_model()


class PrestaireProfileSerializer(serializers.ModelSerializer):
    is_certified = serializers.BooleanField(read_only=True)

    class Meta:
        model = PrestaireProfile
        fields = [
            'provider_type', 'company_name', 'website',
            'is_available',
            'total_reviews', 'average_rating', 'completed_projects',
            'is_certified',
        ]
        read_only_fields = ['total_reviews', 'average_rating', 'completed_projects', 'is_certified']


class ProprietaireProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProprietaireProfile
        fields = ['property_type', 'property_surface', 'energy_interests', 'budget_range', 'saved_incentive_results']


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
    country_code = serializers.CharField(source='country.code', read_only=True, default=None)
    has_password = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'role', 'phone', 'avatar', 'city', 'postal_code',
            'address', 'bio', 'is_verified', 'is_active', 'latitude', 'longitude',
            'country_code', 'region',
            'show_email_on_ad', 'show_phone_on_ad',
            'date_joined', 'created_at', 'prestataire_profile', 'proprietaire_profile', 'badges',
            'has_password',
        ]
        read_only_fields = ['id', 'role', 'is_verified', 'is_active', 'date_joined', 'created_at']

    def get_has_password(self, obj):
        return obj.has_usable_password()


class UserPublicSerializer(serializers.ModelSerializer):
    """Public-facing user info (no sensitive data)."""
    prestataire_profile = PrestaireProfileSerializer(read_only=True)
    badges = UserBadgeSerializer(many=True, read_only=True)
    is_online = serializers.BooleanField(read_only=True)
    country_code = serializers.CharField(source='country.code', read_only=True, default=None)
    contact_email = serializers.SerializerMethodField()
    contact_phone = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'username', 'first_name', 'last_name',
            'role', 'avatar', 'city', 'bio', 'is_verified',
            'latitude', 'longitude', 'country_code', 'region',
            'created_at', 'prestataire_profile', 'badges', 'is_online',
            'show_email_on_ad', 'show_phone_on_ad',
            'contact_email', 'contact_phone',
        ]

    def get_contact_email(self, obj):
        if getattr(obj, 'show_email_on_ad', False):
            return obj.email
        return None

    def get_contact_phone(self, obj):
        if getattr(obj, 'show_phone_on_ad', False):
            return obj.phone
        return None


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True)
    country_code = serializers.CharField(required=False, default='FR')
    provider_type = serializers.CharField(required=False, default='independant')
    company_name = serializers.CharField(required=False, default='', allow_blank=True)
    
    class Meta:
        model = User
        fields = [
            'username', 'email', 'password', 'password_confirm',
            'first_name', 'last_name', 'role', 'phone', 'region',
            'country_code', 'provider_type', 'company_name',
        ]
        extra_kwargs = {
            'username': {'required': False, 'allow_blank': True},
            'first_name': {'required': False, 'allow_blank': True},
            'last_name': {'required': False, 'allow_blank': True},
            'phone': {'required': False, 'allow_blank': True},
            'region': {'required': False, 'allow_blank': True},
        }
    
    def validate(self, attrs):
        if attrs['password'] != attrs.pop('password_confirm'):
            raise serializers.ValidationError({"password_confirm": "Les mots de passe ne correspondent pas."})
        email = attrs.get('email', '')
        if User.objects.filter(email=email).exists():
            raise serializers.ValidationError({"email": "Cet email est déjà utilisé."})
        # Auto-generate username from email if not provided
        username = attrs.get('username', '').strip()
        if not username:
            base = email.split('@')[0].lower()
            # Sanitise: keep only alnum and underscores
            base = ''.join(c if c.isalnum() or c == '_' else '' for c in base) or 'user'
            username = base
            suffix = 1
            while User.objects.filter(username=username).exists():
                username = f"{base}{suffix}"
                suffix += 1
            attrs['username'] = username
        elif User.objects.filter(username=username).exists():
            raise serializers.ValidationError({"username": "Ce nom d'utilisateur est déjà pris."})
        return attrs
    
    def create(self, validated_data):
        country_code = validated_data.pop('country_code', 'FR')
        provider_type = validated_data.pop('provider_type', 'independant')
        company_name = validated_data.pop('company_name', '')
        user = User.objects.create_user(**validated_data)
        # Assign country
        from countries.models import Country
        try:
            user.country = Country.objects.get(code=country_code)
            user.save(update_fields=['country'])
        except Country.DoesNotExist:
            pass
        # Create role-specific profile
        if user.role == User.Role.PRESTATAIRE:
            PrestaireProfile.objects.create(
                user=user,
                provider_type=provider_type,
                company_name=company_name if provider_type == 'entreprise' else '',
            )
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
            'first_name', 'last_name', 'email', 'phone', 'avatar',
            'city', 'postal_code', 'address', 'bio',
            'latitude', 'longitude', 'region',
            'show_email_on_ad', 'show_phone_on_ad',
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


class ProviderDocumentSerializer(serializers.ModelSerializer):
    doc_type_display = serializers.CharField(source='get_doc_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    file_url = serializers.URLField(required=False, allow_blank=True)
    document_url = serializers.SerializerMethodField()

    class Meta:
        model = ProviderDocument
        fields = [
            'id', 'doc_type', 'doc_type_display', 'label', 'document', 'document_url', 'file_url',
            'file_name', 'status', 'status_display', 'reviewer_notes',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['status', 'reviewer_notes', 'created_at', 'updated_at']

    def get_document_url(self, obj):
        if obj.document:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.document.url)
            return obj.document.url
        return None


class CertificationSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    reviewed_by_name = serializers.SerializerMethodField()
    document_url = serializers.SerializerMethodField()

    class Meta:
        model = Certification
        fields = [
            'id', 'certification_name', 'license_number', 'issuing_authority',
            'expiration_date', 'document', 'document_name', 'document_url',
            'status', 'status_display', 'verification_date',
            'reviewed_by_name', 'review_notes',
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'status', 'verification_date', 'reviewed_by_name',
            'review_notes', 'created_at', 'updated_at',
        ]

    def get_reviewed_by_name(self, obj):
        if obj.reviewed_by:
            return obj.reviewed_by.get_full_name() or obj.reviewed_by.username
        return None

    def get_document_url(self, obj):
        if obj.document:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.document.url)
            return obj.document.url
        return None

    def validate(self, attrs):
        # Prevent modification of approved certifications
        if self.instance and self.instance.status == Certification.Status.APPROVED:
            raise serializers.ValidationError(
                "Une certification approuvée ne peut pas être modifiée. Veuillez en soumettre une nouvelle."
            )
        return attrs


class CertificationReviewSerializer(serializers.Serializer):
    """Serializer for admin approve/reject actions."""
    action = serializers.ChoiceField(choices=['approve', 'reject'])
    review_notes = serializers.CharField(required=False, allow_blank=True, default='')


class CertificationStatusLogSerializer(serializers.ModelSerializer):
    changed_by_name = serializers.SerializerMethodField()

    class Meta:
        model = CertificationStatusLog
        fields = ['id', 'old_status', 'new_status', 'changed_by_name', 'notes', 'created_at']

    def get_changed_by_name(self, obj):
        if obj.changed_by:
            return obj.changed_by.get_full_name() or obj.changed_by.username
        return 'Système'
