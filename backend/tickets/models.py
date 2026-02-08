from django.db import models
from django.conf import settings


class Ticket(models.Model):
    """Support tickets for customer service."""
    
    class Priority(models.TextChoices):
        LOW = 'low', 'Basse'
        MEDIUM = 'medium', 'Moyenne'
        HIGH = 'high', 'Haute'
        URGENT = 'urgent', 'Urgente'
    
    class Status(models.TextChoices):
        OPEN = 'open', 'Ouvert'
        IN_PROGRESS = 'in_progress', 'En cours'
        WAITING = 'waiting', 'En attente'
        RESOLVED = 'resolved', 'Résolu'
        CLOSED = 'closed', 'Fermé'
    
    class Category(models.TextChoices):
        DISPUTE = 'dispute', 'Litige'
        TECHNICAL = 'technical', 'Technique'
        BILLING = 'billing', 'Facturation'
        ACCOUNT = 'account', 'Compte'
        OTHER = 'other', 'Autre'
    
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='created_tickets')
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='assigned_tickets',
        limit_choices_to={'role': 'customer_service'}
    )
    
    subject = models.CharField(max_length=300)
    description = models.TextField()
    category = models.CharField(max_length=20, choices=Category.choices, default=Category.OTHER)
    priority = models.CharField(max_length=20, choices=Priority.choices, default=Priority.MEDIUM)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.OPEN)
    
    related_ad = models.ForeignKey('ads.Ad', on_delete=models.SET_NULL, null=True, blank=True)
    related_user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='related_tickets'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Ticket #{self.pk}: {self.subject}"


class TicketResponse(models.Model):
    """Responses on support tickets."""
    ticket = models.ForeignKey(Ticket, on_delete=models.CASCADE, related_name='responses')
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    content = models.TextField()
    is_internal = models.BooleanField(default=False, help_text="Note interne (visible uniquement CS)")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"Réponse #{self.pk} sur Ticket #{self.ticket.pk}"
