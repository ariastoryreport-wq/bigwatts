from django.db import models
from django.conf import settings


class ServiceCategory(models.Model):
    """Categories of green energy services."""
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(unique=True)
    description = models.TextField(blank=True)
    icon = models.CharField(max_length=50, blank=True, help_text="Nom icône (ex: solar-panel)")
    is_active = models.BooleanField(default=True)

    class Meta:
        verbose_name_plural = 'Service Categories'
        ordering = ['name']

    def __str__(self):
        return self.name


class Ad(models.Model):
    """Service advertisements by providers."""
    
    class Status(models.TextChoices):
        DRAFT = 'draft', 'Brouillon'
        ACTIVE = 'active', 'Actif'
        PAUSED = 'paused', 'En pause'
        ARCHIVED = 'archived', 'Archivé'
    
    class PriceType(models.TextChoices):
        FIXED = 'fixed', 'Prix fixe'
        HOURLY = 'hourly', 'Taux horaire'
        QUOTE = 'quote', 'Sur devis'
        FREE_ESTIMATE = 'free_estimate', 'Estimation gratuite'
    
    provider = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name='ads', limit_choices_to={'role': 'prestataire'}
    )
    category = models.ForeignKey(ServiceCategory, on_delete=models.SET_NULL, null=True, related_name='ads')
    
    title = models.CharField(max_length=200)
    slug = models.SlugField(max_length=200)
    description = models.TextField()
    short_description = models.CharField(max_length=300, blank=True)
    
    price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    price_type = models.CharField(max_length=20, choices=PriceType.choices, default=PriceType.QUOTE)
    
    city = models.CharField(max_length=100)
    postal_code = models.CharField(max_length=10, blank=True)
    service_area = models.CharField(max_length=200, blank=True, help_text="Zone d'intervention")
    
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    
    # Media
    image_1 = models.ImageField(upload_to='ads/', blank=True, null=True)
    image_2 = models.ImageField(upload_to='ads/', blank=True, null=True)
    image_3 = models.ImageField(upload_to='ads/', blank=True, null=True)
    
    # Details
    duration_estimate = models.CharField(max_length=100, blank=True, help_text="Durée estimée des travaux")
    warranty_info = models.TextField(blank=True, help_text="Informations garantie")
    requirements = models.TextField(blank=True, help_text="Prérequis pour le service")
    
    # Stats
    views_count = models.PositiveIntegerField(default=0)
    inquiries_count = models.PositiveIntegerField(default=0)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} - {self.provider.username}"


class QuoteRequest(models.Model):
    """Quote requests from property owners to providers."""
    
    class Status(models.TextChoices):
        PENDING = 'pending', 'En attente'
        ACCEPTED = 'accepted', 'Acceptée'
        DECLINED = 'declined', 'Refusée'
        COMPLETED = 'completed', 'Terminée'
        CANCELLED = 'cancelled', 'Annulée'
    
    ad = models.ForeignKey(Ad, on_delete=models.CASCADE, related_name='quote_requests')
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name='quote_requests', limit_choices_to={'role': 'proprietaire'}
    )
    
    message = models.TextField(help_text="Description du besoin")
    property_address = models.TextField(blank=True)
    preferred_date = models.DateField(null=True, blank=True)
    budget_indication = models.CharField(max_length=100, blank=True)
    
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    provider_response = models.TextField(blank=True)
    quoted_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Devis #{self.pk} - {self.ad.title} pour {self.owner.username}"
