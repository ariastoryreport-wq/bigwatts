from django.db import models
from django.conf import settings


class Notification(models.Model):
    """User notifications."""
    
    class Type(models.TextChoices):
        QUOTE_REQUEST = 'quote_request', 'Demande de devis'
        QUOTE_RESPONSE = 'quote_response', 'Réponse devis'
        NEW_MESSAGE = 'new_message', 'Nouveau message'
        NEW_REVIEW = 'new_review', 'Nouvel avis'
        TICKET_UPDATE = 'ticket_update', 'Mise à jour ticket'
        FAVORITE = 'favorite', 'Favori'
        SYSTEM = 'system', 'Système'
    
    recipient = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='notifications')
    notification_type = models.CharField(max_length=30, choices=Type.choices)
    title = models.CharField(max_length=200)
    message = models.TextField()
    link = models.CharField(max_length=500, blank=True, help_text="Lien vers la ressource concernée")
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"[{self.notification_type}] {self.title} → {self.recipient.username}"


class NotificationPreference(models.Model):
    """Per-user notification preferences (which types they want to receive)."""
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name='notification_preferences'
    )
    email_quotes = models.BooleanField(default=True, help_text="Recevoir les notifications de devis")
    email_messages = models.BooleanField(default=True, help_text="Recevoir les notifications de messages")
    email_reviews = models.BooleanField(default=True, help_text="Recevoir les notifications d'avis")
    email_favorites = models.BooleanField(default=True, help_text="Recevoir les notifications de favoris")
    email_system = models.BooleanField(default=True, help_text="Recevoir les notifications système")

    def __str__(self):
        return f"Prefs: {self.user.username}"
