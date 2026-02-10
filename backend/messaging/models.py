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
    """Report a user for inappropriate behavior."""

    class Reason(models.TextChoices):
        SPAM = 'spam', 'Spam'
        HARASSMENT = 'harassment', 'Harcèlement'
        FRAUD = 'fraud', 'Fraude'
        INAPPROPRIATE = 'inappropriate', 'Contenu inapproprié'
        OTHER = 'other', 'Autre'

    reporter = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='reports_made'
    )
    reported_user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='reports_received'
    )
    conversation = models.ForeignKey(
        Conversation, on_delete=models.SET_NULL, null=True, blank=True, related_name='reports'
    )
    reason = models.CharField(max_length=20, choices=Reason.choices)
    details = models.TextField(blank=True)
    is_resolved = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Report: {self.reporter.username} → {self.reported_user.username} ({self.reason})"
