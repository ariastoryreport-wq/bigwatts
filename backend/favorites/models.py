from django.db import models
from django.conf import settings


class Favorite(models.Model):
    """User favorites for providers and ads."""
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='favorites')
    provider = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name='favorited_by', null=True, blank=True,
        limit_choices_to={'role': 'prestataire'}
    )
    ad = models.ForeignKey('ads.Ad', on_delete=models.CASCADE, related_name='favorited_by', null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        unique_together = [('user', 'provider'), ('user', 'ad')]

    def __str__(self):
        target = self.provider or self.ad
        return f"{self.user.username} → {target}"
