from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone


class User(AbstractUser):
    """Custom user with role-based access."""
    
    class Role(models.TextChoices):
        PRESTATAIRE = 'prestataire', 'Prestataire'
        PROPRIETAIRE = 'proprietaire', 'Propriétaire'
        CUSTOMER_SERVICE = 'customer_service', 'Customer Service'
    
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.PROPRIETAIRE)
    phone = models.CharField(max_length=20, blank=True)
    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True)
    city = models.CharField(max_length=100, blank=True)
    postal_code = models.CharField(max_length=10, blank=True)
    address = models.TextField(blank=True)
    bio = models.TextField(blank=True)
    latitude = models.FloatField(null=True, blank=True, help_text="Latitude GPS")
    longitude = models.FloatField(null=True, blank=True, help_text="Longitude GPS")
    country = models.ForeignKey(
        'countries.Country', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='users',
        help_text="User's country"
    )
    region = models.CharField(max_length=100, blank=True, help_text="Province / Region")
    show_email_on_ad = models.BooleanField(default=False, help_text="Display email on ad pages")
    show_phone_on_ad = models.BooleanField(default=False, help_text="Display phone on ad pages")
    last_seen = models.DateTimeField(null=True, blank=True, help_text="Last activity timestamp")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_verified = models.BooleanField(default=False)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.username} ({self.get_role_display()})"

    @property
    def is_prestataire(self):
        return self.role == self.Role.PRESTATAIRE

    @property
    def is_proprietaire(self):
        return self.role == self.Role.PROPRIETAIRE

    @property
    def is_customer_service(self):
        return self.role == self.Role.CUSTOMER_SERVICE

    @property
    def is_online(self):
        """User is online if last_seen within the last 2 minutes."""
        if not self.last_seen:
            return False
        return (timezone.now() - self.last_seen).total_seconds() < 120


class PrestaireProfile(models.Model):
    """Extended profile for service providers."""

    class ProviderType(models.TextChoices):
        INDEPENDANT = 'independant', 'Indépendant'
        ENTREPRISE = 'entreprise', 'Entreprise'

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='prestataire_profile')
    provider_type = models.CharField(max_length=20, choices=ProviderType.choices, default=ProviderType.INDEPENDANT)
    company_name = models.CharField(max_length=200, blank=True)
    siret = models.CharField(max_length=14, blank=True)
    website = models.CharField(max_length=200, blank=True)
    years_experience = models.PositiveIntegerField(default=0)
    service_radius_km = models.PositiveIntegerField(default=50, help_text="Rayon d'intervention en km")
    is_available = models.BooleanField(default=True)
    
    # Certifications & specialties
    certifications = models.TextField(blank=True, help_text="Certifications séparées par des virgules")
    specialties = models.TextField(blank=True, help_text="Spécialités séparées par des virgules")
    
    # Stats (cached)
    total_reviews = models.PositiveIntegerField(default=0)
    average_rating = models.DecimalField(max_digits=3, decimal_places=2, default=0)
    completed_projects = models.PositiveIntegerField(default=0)

    def __str__(self):
        return f"Profil prestataire: {self.user.username}"

    @property
    def is_certified(self):
        """Provider has at least one approved, non-expired certification."""
        return self.user.certifications.filter(
            status=Certification.Status.APPROVED
        ).exists()


class Certification(models.Model):
    """Professional certification record for verification."""

    class Status(models.TextChoices):
        PENDING = 'pending', 'En attente'
        APPROVED = 'approved', 'Approuvé'
        REJECTED = 'rejected', 'Refusé'
        EXPIRED = 'expired', 'Expiré'

    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='certifications',
        limit_choices_to={'role': 'prestataire'}
    )
    certification_name = models.CharField(max_length=200, help_text="Nom de la certification (ex: RGE QualiSol)")
    license_number = models.CharField(max_length=100, blank=True, help_text="Numéro de licence / certificat")
    issuing_authority = models.CharField(max_length=200, blank=True, help_text="Organisme émetteur")
    expiration_date = models.DateField(null=True, blank=True, help_text="Date d'expiration")
    document = models.FileField(upload_to='certifications/%Y/%m/', blank=True, null=True, help_text="Document justificatif")
    document_name = models.CharField(max_length=255, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    verification_date = models.DateTimeField(null=True, blank=True, help_text="Date de vérification par l'admin")
    reviewed_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='reviewed_certifications',
        limit_choices_to={'role': 'customer_service'}
    )
    review_notes = models.TextField(blank=True, help_text="Notes de vérification (visibles par le prestataire)")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.certification_name} — {self.user.username} ({self.get_status_display()})"


class CertificationStatusLog(models.Model):
    """Audit log for certification status changes."""
    certification = models.ForeignKey(Certification, on_delete=models.CASCADE, related_name='status_logs')
    old_status = models.CharField(max_length=20, blank=True)
    new_status = models.CharField(max_length=20)
    changed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.certification} : {self.old_status} → {self.new_status}"


class ProprietaireProfile(models.Model):
    """Extended profile for property owners."""
    
    class PropertyType(models.TextChoices):
        MAISON = 'maison', 'Maison'
        APPARTEMENT = 'appartement', 'Appartement'
        BUREAU = 'bureau', 'Bureau'
        COMMERCE = 'commerce', 'Commerce'
        INDUSTRIEL = 'industriel', 'Industriel'
        AUTRE = 'autre', 'Autre'
    
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='proprietaire_profile')
    property_type = models.CharField(max_length=20, choices=PropertyType.choices, default=PropertyType.MAISON)
    property_surface = models.PositiveIntegerField(null=True, blank=True, help_text="Surface en m²")
    energy_interests = models.TextField(blank=True, help_text="Intérêts énergie séparés par des virgules")
    budget_range = models.CharField(max_length=50, blank=True)
    saved_incentive_results = models.JSONField(
        default=None, null=True, blank=True,
        help_text="Résultats d'aides sauvegardés depuis le simulateur"
    )

    def __str__(self):
        return f"Profil propriétaire: {self.user.username}"


class ProviderBadge(models.Model):
    """Badges and certifications that can be assigned to providers."""

    class BadgeType(models.TextChoices):
        CERTIFICATION = 'certification', 'Certification'
        ACHIEVEMENT = 'achievement', 'Réalisation'
        QUALITY = 'quality', 'Qualité'
        TRUST = 'trust', 'Confiance'

    name = models.CharField(max_length=100)
    slug = models.SlugField(unique=True)
    description = models.TextField(blank=True)
    badge_type = models.CharField(max_length=20, choices=BadgeType.choices, default=BadgeType.CERTIFICATION)
    icon = models.CharField(max_length=50, default='award', help_text="Lucide icon name")
    color = models.CharField(max_length=20, default='brand', help_text="Color theme: brand, gold, blue, green")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class UserBadge(models.Model):
    """Many-to-many: badges assigned to providers."""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='badges')
    badge = models.ForeignKey(ProviderBadge, on_delete=models.CASCADE, related_name='holders')
    awarded_at = models.DateTimeField(auto_now_add=True)
    awarded_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='badges_awarded', limit_choices_to={'role': 'customer_service'}
    )
    notes = models.TextField(blank=True)

    class Meta:
        unique_together = ['user', 'badge']
        ordering = ['-awarded_at']

    def __str__(self):
        return f"{self.user.username} — {self.badge.name}"


class ProviderDocument(models.Model):
    """Documents uploaded by providers for certification verification."""

    class DocType(models.TextChoices):
        IDENTITY = 'identity', 'Pièce d\'identité'
        RGE = 'rge', 'Certification RGE'
        INSURANCE = 'insurance', 'Assurance décennale'
        QUALIPV = 'qualipv', 'QualiPV / QualiBois'
        KBIS = 'kbis', 'Extrait Kbis'
        OTHER = 'other', 'Autre'

    class Status(models.TextChoices):
        PENDING = 'pending', 'En attente de vérification'
        APPROVED = 'approved', 'Approuvé'
        REJECTED = 'rejected', 'Refusé'

    provider = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='documents',
        limit_choices_to={'role': 'prestataire'}
    )
    doc_type = models.CharField(max_length=20, choices=DocType.choices)
    label = models.CharField(max_length=200)
    document = models.FileField(upload_to='documents/%Y/%m/', blank=True, null=True, help_text="Fichier uploadé")
    file_url = models.URLField(max_length=500, blank=True, help_text="URL du document (stockage externe)")
    file_name = models.CharField(max_length=255, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    reviewer_notes = models.TextField(blank=True)
    reviewed_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='reviewed_documents', limit_choices_to={'role': 'customer_service'}
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.get_doc_type_display()} — {self.provider.username}"


class Appointment(models.Model):
    """Appointments between providers and property owners."""

    class Status(models.TextChoices):
        PENDING = 'pending', 'En attente'
        CONFIRMED = 'confirmed', 'Confirmé'
        CANCELLED = 'cancelled', 'Annulé'
        COMPLETED = 'completed', 'Terminé'

    provider = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='provider_appointments',
        limit_choices_to={'role': 'prestataire'}
    )
    owner = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='owner_appointments',
        limit_choices_to={'role': 'proprietaire'}
    )
    quote_request = models.ForeignKey(
        'ads.QuoteRequest', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='appointments'
    )
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    location = models.CharField(max_length=300, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['date', 'start_time']

    def __str__(self):
        return f"{self.title} — {self.date} {self.start_time}"
