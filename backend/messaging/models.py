from django.db import models
from django.conf import settings


class Conversation(models.Model):
    """Conversation thread between two users."""
    participants = models.ManyToManyField(settings.AUTH_USER_MODEL, related_name='conversations')
    ad = models.ForeignKey('ads.Ad', on_delete=models.SET_NULL, null=True, blank=True, related_name='conversations')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']

    def __str__(self):
        users = ', '.join([u.username for u in self.participants.all()])
        return f"Conversation: {users}"

    @property
    def last_message(self):
        return self.messages.order_by('-created_at').first()


class Message(models.Model):
    """Individual messages in a conversation."""
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='sent_messages')
    content = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"{self.sender.username}: {self.content[:50]}"


class BlockedUser(models.Model):
    """A user blocks another user from messaging them."""
    blocker = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='blocked_users'
    )
    blocked = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='blocked_by'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('blocker', 'blocked')
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.blocker.username} blocked {self.blocked.username}"


class Report(models.Model):
    """Report a user, message, or ad for inappropriate behavior."""

    class Reason(models.TextChoices):
        SPAM = 'spam', 'Spam'
        HARASSMENT = 'harassment', 'Harcèlement'
        FRAUD = 'fraud', 'Fraude'
        INAPPROPRIATE = 'inappropriate', 'Contenu inapproprié'
        HATE_SPEECH = 'hate_speech', 'Discours haineux'
        SCAM = 'scam', 'Arnaque'
        OTHER = 'other', 'Autre'

    class ContentType(models.TextChoices):
        MESSAGE = 'message', 'Message'
        PROFILE = 'profile', 'Profil'
        AD = 'ad', 'Annonce'

    class Status(models.TextChoices):
        PENDING = 'pending', 'En attente'
        REVIEWING = 'reviewing', 'En cours d\'examen'
        RESOLVED = 'resolved', 'Résolu'
        DISMISSED = 'dismissed', 'Ignoré'

    reporter = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='reports_made'
    )
    reported_user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='reports_received'
    )
    content_type = models.CharField(max_length=10, choices=ContentType.choices, default='message')
    content_id = models.PositiveIntegerField(null=True, blank=True, help_text='ID du message ou annonce signalé')
    conversation = models.ForeignKey(
        Conversation, on_delete=models.SET_NULL, null=True, blank=True, related_name='reports'
    )
    reason = models.CharField(max_length=20, choices=Reason.choices)
    details = models.TextField(blank=True)
    status = models.CharField(max_length=15, choices=Status.choices, default='pending')
    priority_score = models.PositiveIntegerField(default=1)
    is_content_hidden = models.BooleanField(default=False)
    resolved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='reports_resolved'
    )
    resolved_at = models.DateTimeField(null=True, blank=True)
    admin_notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-priority_score', '-created_at']

    def __str__(self):
        return f"Report #{self.pk}: {self.reporter.username} → {self.reported_user.username} ({self.reason})"


class ModerationLog(models.Model):
    """Audit log of all moderation actions."""

    class ActionType(models.TextChoices):
        DISMISS = 'dismiss', 'Signalement ignoré'
        DELETE_CONTENT = 'delete_content', 'Contenu supprimé'
        HIDE_CONTENT = 'hide_content', 'Contenu masqué'
        WARN_USER = 'warn_user', 'Avertissement envoyé'
        SUSPEND_USER = 'suspend_user', 'Compte suspendu'
        BAN_USER = 'ban_user', 'Compte banni'
        UNSUSPEND_USER = 'unsuspend_user', 'Suspension levée'

    admin = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='moderation_actions'
    )
    report = models.ForeignKey(
        Report, on_delete=models.SET_NULL, null=True, blank=True, related_name='moderation_logs'
    )
    action_type = models.CharField(max_length=20, choices=ActionType.choices)
    target_user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='moderation_received'
    )
    target_content_id = models.PositiveIntegerField(null=True, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.admin.username} → {self.action_type} on {self.target_user.username}"
