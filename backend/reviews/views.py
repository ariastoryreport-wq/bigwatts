from rest_framework import generics, permissions, status as drf_status
from rest_framework.response import Response
from django.db.models import Avg
from django.utils import timezone

from .models import Review
from .serializers import ReviewSerializer, ReviewResponseSerializer
from accounts.permissions import IsProprietaire, IsPrestataire, IsCustomerService
from accounts.models import PrestaireProfile
from bookings.models import Booking


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
    """POST /api/reviews/ - Create a review (owners only, requires completed booking)."""
    serializer_class = ReviewSerializer
    permission_classes = [IsProprietaire]
    
    def perform_create(self, serializer):
        user = self.request.user
        provider_id = serializer.validated_data.get('provider_id') or serializer.validated_data.get('provider').pk
        ad = serializer.validated_data.get('ad')

        # Check for a completed booking between this author and provider
        booking_qs = Booking.objects.filter(
            homeowner=user,
            provider_id=provider_id,
            status='completed',
        )
        if ad:
            booking_qs = booking_qs.filter(quote__ad=ad)

        booking = booking_qs.first()
        if not booking:
            from rest_framework.exceptions import ValidationError
            raise ValidationError({
                'detail': "Vous ne pouvez laisser un avis que pour une prestation terminée."
            })

        review = serializer.save(is_verified=True, booking=booking)
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


class CanReviewView(generics.GenericAPIView):
    """GET /api/reviews/can-review/?provider=<id>&ad=<id> - Check if user can review."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        provider_id = request.query_params.get('provider')
        ad_id = request.query_params.get('ad')
        if not provider_id:
            return Response({'can_review': False, 'reason': 'provider required'})

        # Must be a proprietaire
        if request.user.role != 'proprietaire':
            return Response({'can_review': False, 'reason': 'only_owners'})

        # Must have a completed booking
        booking_qs = Booking.objects.filter(
            homeowner=request.user,
            provider_id=provider_id,
            status='completed',
        )
        if ad_id:
            booking_qs = booking_qs.filter(quote__ad_id=ad_id)

        if not booking_qs.exists():
            return Response({'can_review': False, 'reason': 'no_completed_booking'})

        # Must not have already reviewed
        review_qs = Review.objects.filter(author=request.user, provider_id=provider_id)
        if ad_id:
            review_qs = review_qs.filter(ad_id=ad_id)
        if review_qs.exists():
            return Response({'can_review': False, 'reason': 'already_reviewed'})

        return Response({'can_review': True})
