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
