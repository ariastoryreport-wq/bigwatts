from django.contrib.auth.models import AbstractUser
from django.db import models


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


class PrestaireProfile(models.Model):
    """Extended profile for service providers."""
    
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='prestataire_profile')
    company_name = models.CharField(max_length=200, blank=True)
    siret = models.CharField(max_length=14, blank=True)
    website = models.URLField(blank=True)
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

    def __str__(self):
        return f"Profil propriétaire: {self.user.username}"
