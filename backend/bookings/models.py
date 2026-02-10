from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator


class AvailabilitySlot(models.Model):
    """Provider availability slots for booking."""
    provider = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name='availability_slots',
        limit_choices_to={'role': 'prestataire'}
    )
    start = models.DateTimeField()
    end = models.DateTimeField()
    is_booked = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['start']

    def __str__(self):
        return f"{self.provider.username}: {self.start} → {self.end}"


class Booking(models.Model):
    """Booking linked to an accepted quote."""

    class Status(models.TextChoices):
        PENDING = 'pending', 'En attente'
        CONFIRMED = 'confirmed', 'Confirmé'
        DEPOSIT_PAID = 'deposit_paid', 'Acompte payé'
        IN_PROGRESS = 'in_progress', 'En cours'
        COMPLETED = 'completed', 'Terminé'
        CANCELLED = 'cancelled', 'Annulé'

    quote = models.OneToOneField(
        'ads.QuoteRequest', on_delete=models.CASCADE,
        related_name='booking'
    )
    homeowner = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name='bookings_as_owner',
        limit_choices_to={'role': 'proprietaire'}
    )
    provider = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name='bookings_as_provider',
        limit_choices_to={'role': 'prestataire'}
    )
    slot = models.OneToOneField(
        AvailabilitySlot, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='booking'
    )
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.PENDING
    )
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Booking #{self.pk} — {self.quote.ad.title}"

    @property
    def deposit_amount(self):
        """Configurable % of quoted price (default 30%)."""
        from django.conf import settings as conf
        pct = getattr(conf, 'DEPOSIT_PERCENT', 30)
        if self.quote.quoted_price:
            return round(self.quote.quoted_price * pct / 100, 2)
        return 0


class Payment(models.Model):
    """Stripe payment linked to a booking."""

    class PaymentType(models.TextChoices):
        DEPOSIT = 'deposit', 'Acompte'
        FINAL = 'final', 'Solde final'

    class PaymentStatus(models.TextChoices):
        PENDING = 'pending', 'En attente'
        PAID = 'paid', 'Payé'
        FAILED = 'failed', 'Échoué'
        REFUNDED = 'refunded', 'Remboursé'

    booking = models.ForeignKey(
        Booking, on_delete=models.CASCADE, related_name='payments'
    )
    stripe_payment_intent_id = models.CharField(
        max_length=255, blank=True, db_index=True
    )
    amount = models.DecimalField(
        max_digits=10, decimal_places=2,
        validators=[MinValueValidator(0)]
    )
    platform_fee = models.DecimalField(
        max_digits=10, decimal_places=2, default=0,
        validators=[MinValueValidator(0)]
    )
    payment_type = models.CharField(
        max_length=10, choices=PaymentType.choices, default=PaymentType.DEPOSIT
    )
    status = models.CharField(
        max_length=10, choices=PaymentStatus.choices, default=PaymentStatus.PENDING
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Payment #{self.pk} — {self.amount}€ ({self.get_status_display()})"
