from django.db import models


class Country(models.Model):
    """Supported countries/regions on the platform."""

    code = models.CharField(
        max_length=5, unique=True,
        help_text="ISO 3166-1 alpha-2 code (FR, CA, BE…)"
    )
    name = models.CharField(max_length=100, help_text="Country name in local language")
    name_en = models.CharField(max_length=100, blank=True, help_text="English name")
    language = models.CharField(
        max_length=10, default='fr',
        help_text="Primary language code (fr, en)"
    )
    currency = models.CharField(
        max_length=5, default='EUR',
        help_text="ISO 4217 currency code"
    )
    currency_symbol = models.CharField(
        max_length=5, default='€',
        help_text="Symbol for display"
    )
    flag_emoji = models.CharField(max_length=10, default='🇫🇷')
    regions = models.JSONField(
        default=list, blank=True,
        help_text="List of region/province names"
    )
    timezone = models.CharField(max_length=50, default='Europe/Paris')
    is_active = models.BooleanField(default=True)
    sort_order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = 'Countries'
        ordering = ['sort_order', 'name']

    def __str__(self):
        return f"{self.flag_emoji} {self.name} ({self.code})"


class Location(models.Model):
    """
    Self-hosted geographic location data for autocomplete.
    Currently used for Canada (France uses geo.api.gouv.fr).
    ~7 000 rows for Canadian cities/FSAs.
    """
    country_code = models.CharField(max_length=5, db_index=True, help_text="ISO country code (CA, FR…)")
    city_name = models.CharField(max_length=150, help_text="City / municipality name")
    postal_code = models.CharField(max_length=10, blank=True, help_text="Postal code or FSA (e.g. H2X)")
    region_name = models.CharField(max_length=100, blank=True, help_text="Province / region name")
    region_code = models.CharField(max_length=10, blank=True, help_text="Province / region code (QC, ON…)")
    population = models.PositiveIntegerField(default=0, help_text="Population for sort priority")
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)

    class Meta:
        ordering = ['-population', 'city_name']
        indexes = [
            models.Index(fields=['country_code', 'city_name'], name='loc_country_city'),
            models.Index(fields=['country_code', 'postal_code'], name='loc_country_postal'),
            models.Index(fields=['country_code', 'region_code'], name='loc_country_region'),
        ]

    def __str__(self):
        parts = [self.city_name]
        if self.postal_code:
            parts.append(self.postal_code)
        if self.region_code:
            parts.append(self.region_code)
        return f"{', '.join(parts)} ({self.country_code})"
