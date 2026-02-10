from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator


class IncentiveProgram(models.Model):
    """
    Government / utility incentive programs for green energy installations.
    Managed by staff through Django Admin.
    """

    class ProviderType(models.TextChoices):
        GOVERNMENT = 'government', 'Gouvernement'
        REGIONAL = 'regional', 'Collectivité régionale'
        LOCAL = 'local', 'Collectivité locale'
        UTILITY = 'utility', 'Fournisseur d\'énergie'
        OTHER = 'other', 'Autre'

    name = models.CharField(max_length=300, help_text="Nom du programme d'aide")
    provider_type = models.CharField(
        max_length=20, choices=ProviderType.choices, default='government',
        help_text="Organisme proposant l'aide"
    )
    country = models.CharField(max_length=100, default='FR', help_text="Code pays ISO (FR, BE, CH…)")
    region = models.CharField(
        max_length=200, blank=True, default='',
        help_text="Région éligible (vide = national)"
    )

    installation_types = models.JSONField(
        default=list, blank=True,
        help_text='Liste de types : ["solar","heat_pump","ev_charger","insulation","battery","wind"]'
    )
    property_types = models.JSONField(
        default=list, blank=True,
        help_text='Types de propriété : ["house","apartment","commercial","other"]'
    )

    income_min = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True,
        help_text="Revenu fiscal min (€/an). Vide = pas de plancher."
    )
    income_max = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True,
        help_text="Revenu fiscal max (€/an). Vide = pas de plafond."
    )

    discount_percent = models.DecimalField(
        max_digits=5, decimal_places=2, default=0,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        help_text="% de réduction sur le coût d'installation"
    )
    max_amount = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True,
        help_text="Montant maximum de l'aide en €"
    )

    description = models.TextField(blank=True, help_text="Description détaillée de l'aide")
    official_url = models.URLField(max_length=500, blank=True, help_text="Lien officiel")

    eligibility_rules = models.JSONField(
        default=dict, blank=True,
        help_text="Règles supplémentaires (JSON libre) : ownership, age_limit, etc."
    )

    last_verified_date = models.DateField(
        null=True, blank=True,
        help_text="Dernière date de vérification par le staff"
    )
    active = models.BooleanField(default=True, help_text="Afficher cette aide")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-discount_percent', '-max_amount', 'name']
        verbose_name = "Programme d'aide"
        verbose_name_plural = "Programmes d'aides"

    def __str__(self):
        return f"{self.name} ({self.country}{' - ' + self.region if self.region else ''})"
