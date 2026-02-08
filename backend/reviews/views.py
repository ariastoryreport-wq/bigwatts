from rest_framework import generics, permissions
from django.db.models import Avg
from django.utils import timezone

from .models import Review
from .serializers import ReviewSerializer, ReviewResponseSerializer
from accounts.permissions import IsProprietaire, IsPrestataire, IsCustomerService
from accounts.models import PrestaireProfile


class ReviewListView(generics.ListAPIView):
    """GET /api/reviews/?provider=<id> - Reviews for a provider."""
    serializer_class = ReviewSerializer
    permission_classes = [permissions.AllowAny]
    
    def get_queryset(self):
        qs = Review.objects.all().select_related('author')
        provider = self.request.query_params.get('provider')
        ad = self.request.query_params.get('ad')
        if provider:
            qs = qs.filter(provider_id=provider)
        if ad:
            qs = qs.filter(ad_id=ad)
        return qs


class ReviewCreateView(generics.CreateAPIView):
    """POST /api/reviews/ - Create a review (owners only)."""
    serializer_class = ReviewSerializer
    permission_classes = [IsProprietaire]
    
    def perform_create(self, serializer):
        review = serializer.save()
        # Update provider stats
        provider = review.provider
        reviews = Review.objects.filter(provider=provider)
        avg = reviews.aggregate(avg=Avg('rating'))['avg'] or 0
        PrestaireProfile.objects.filter(user=provider).update(
            total_reviews=reviews.count(),
            average_rating=round(avg, 2)
        )
        # Notify provider
        from notifications.models import Notification
        Notification.objects.create(
            recipient=provider,
            notification_type='new_review',
            title='Nouvel avis reçu',
            message=f'{review.author.get_full_name() or review.author.username} vous a laissé un avis ({review.rating}/5).',
            link=f'/providers/{provider.pk}'
        )


class ReviewResponseView(generics.UpdateAPIView):
    """PATCH /api/reviews/<id>/respond/ - Provider responds to review."""
    serializer_class = ReviewResponseSerializer
    permission_classes = [IsPrestataire]
    
    def get_queryset(self):
        return Review.objects.filter(provider=self.request.user)
    
    def perform_update(self, serializer):
        serializer.save(response_date=timezone.now())


class MyReceivedReviewsView(generics.ListAPIView):
    """GET /api/reviews/received/ - Provider's received reviews."""
    serializer_class = ReviewSerializer
    permission_classes = [IsPrestataire]
    
    def get_queryset(self):
        return Review.objects.filter(provider=self.request.user)


class MyWrittenReviewsView(generics.ListAPIView):
    """GET /api/reviews/written/ - Owner's written reviews."""
    serializer_class = ReviewSerializer
    permission_classes = [IsProprietaire]
    
    def get_queryset(self):
        return Review.objects.filter(author=self.request.user)
