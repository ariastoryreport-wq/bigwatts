from rest_framework import generics, permissions, status, filters
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.response import Response
from rest_framework.decorators import api_view
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q, F

from .models import ServiceCategory, Ad, QuoteRequest
from .serializers import (
    ServiceCategorySerializer, AdListSerializer, AdDetailSerializer,
    AdCreateUpdateSerializer, QuoteRequestSerializer, QuoteResponseSerializer
)
from accounts.permissions import IsPrestataire, IsProprietaire, IsAdOwner, IsCustomerService


class ServiceCategoryListView(generics.ListAPIView):
    """GET /api/ads/categories/ - List all service categories."""
    queryset = ServiceCategory.objects.filter(is_active=True)
    serializer_class = ServiceCategorySerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None


class AdListView(generics.ListAPIView):
    """GET /api/ads/ - List active ads with filtering."""
    serializer_class = AdListSerializer
    permission_classes = [permissions.AllowAny]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['title', 'description', 'city', 'provider__prestataire_profile__company_name']
    ordering_fields = ['created_at', 'price', 'views_count']
    
    def get_queryset(self):
        qs = Ad.objects.filter(status='active').select_related('provider', 'category', 'provider__prestataire_profile', 'country')
        
        category = self.request.query_params.get('category')
        city = self.request.query_params.get('city')
        region = self.request.query_params.get('region')
        price_min = self.request.query_params.get('price_min')
        price_max = self.request.query_params.get('price_max')
        price_type = self.request.query_params.get('price_type')
        provider = self.request.query_params.get('provider')
        country = self.request.query_params.get('country')
        
        # Country isolation: authenticated users MUST see only their own country
        user = self.request.user
        if user and user.is_authenticated and hasattr(user, 'country') and user.country:
            qs = qs.filter(country=user.country)
        elif country:
            qs = qs.filter(country__code=country)
        
        if category:
            qs = qs.filter(category__slug=category)
        if city:
            qs = qs.filter(city__icontains=city)
        if region:
            qs = qs.filter(provider__region__icontains=region)
        if price_min:
            qs = qs.filter(price__gte=price_min)
        if price_max:
            qs = qs.filter(price__lte=price_max)
        if price_type:
            qs = qs.filter(price_type=price_type)
        if provider:
            qs = qs.filter(provider_id=provider)
        
        return qs


class AdDetailView(generics.RetrieveAPIView):
    """GET /api/ads/<id>/ - Ad detail (increments view count)."""
    serializer_class = AdDetailSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        qs = Ad.objects.select_related('provider', 'category', 'provider__prestataire_profile')
        user = self.request.user
        if user and user.is_authenticated and hasattr(user, 'country') and user.country:
            qs = qs.filter(country=user.country)
        return qs
    
    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        Ad.objects.filter(pk=instance.pk).update(views_count=F('views_count') + 1)
        serializer = self.get_serializer(instance)
        return Response(serializer.data)


class MyAdsListView(generics.ListAPIView):
    """GET /api/ads/my/ - Provider's own ads."""
    serializer_class = AdListSerializer
    permission_classes = [IsPrestataire]
    
    def get_queryset(self):
        return Ad.objects.filter(provider=self.request.user)


class AdCreateView(generics.CreateAPIView):
    """POST /api/ads/create/ - Create a new ad (providers only)."""
    serializer_class = AdCreateUpdateSerializer
    permission_classes = [IsPrestataire]
    parser_classes = [MultiPartParser, FormParser, JSONParser]


class AdUpdateView(generics.UpdateAPIView):
    """PATCH /api/ads/<id>/update/ - Update an ad."""
    serializer_class = AdCreateUpdateSerializer
    permission_classes = [IsPrestataire, IsAdOwner]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    
    def get_queryset(self):
        return Ad.objects.filter(provider=self.request.user)

    def perform_update(self, serializer):
        """Handle image clearing: if an image field is sent as empty string, clear it."""
        instance = serializer.instance
        for img_field in ('image_1', 'image_2', 'image_3'):
            raw = self.request.data.get(img_field)
            if raw == '' or raw == 'null':
                # Delete old file and clear the field
                field_file = getattr(instance, img_field)
                if field_file:
                    field_file.delete(save=False)
                setattr(instance, img_field, None)
        serializer.save()


class AdDeleteView(generics.DestroyAPIView):
    """DELETE /api/ads/<id>/delete/ - Delete an ad."""
    permission_classes = [IsPrestataire, IsAdOwner]
    
    def get_queryset(self):
        return Ad.objects.filter(provider=self.request.user)


# --- Quote Requests ---

class QuoteRequestCreateView(generics.CreateAPIView):
    """POST /api/ads/quotes/ - Request a quote (owners only)."""
    serializer_class = QuoteRequestSerializer
    permission_classes = [IsProprietaire]
    
    def perform_create(self, serializer):
        # Country isolation: ensure the ad belongs to the user's country
        ad = serializer.validated_data.get('ad')
        user = self.request.user
        if user.country and ad.country and ad.country != user.country:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('Vous ne pouvez pas demander un devis pour une annonce d\'un autre pays.')
        quote = serializer.save()
        # Increment inquiries count
        Ad.objects.filter(pk=quote.ad_id).update(inquiries_count=F('inquiries_count') + 1)
        # Create notification for provider
        from notifications.utils import create_notification
        create_notification(
            recipient=quote.ad.provider,
            notification_type='quote_request',
            title='Nouvelle demande de devis',
            message=f'{quote.owner.get_full_name() or quote.owner.username} a demandé un devis pour "{quote.ad.title}".',
            link=f'/dashboard/quotes/{quote.pk}'
        )
        # Send email notification
        from notifications.emails import notify_new_quote_request
        notify_new_quote_request(quote)


class MyQuoteRequestsView(generics.ListAPIView):
    """GET /api/ads/quotes/my/ - Owner's quote requests."""
    serializer_class = QuoteRequestSerializer
    permission_classes = [IsProprietaire]
    
    def get_queryset(self):
        return QuoteRequest.objects.filter(owner=self.request.user).select_related('ad')


class ReceivedQuoteRequestsView(generics.ListAPIView):
    """GET /api/ads/quotes/received/ - Provider's received quote requests."""
    serializer_class = QuoteRequestSerializer
    permission_classes = [IsPrestataire]
    
    def get_queryset(self):
        qs = QuoteRequest.objects.filter(ad__provider=self.request.user).select_related('ad', 'owner')
        status_filter = self.request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)
        return qs


class QuoteRequestDetailView(generics.RetrieveAPIView):
    """GET /api/ads/quotes/<id>/ - Quote request detail."""
    serializer_class = QuoteRequestSerializer
    
    def get_queryset(self):
        user = self.request.user
        return QuoteRequest.objects.filter(
            Q(owner=user) | Q(ad__provider=user)
        )


class QuoteRespondView(generics.UpdateAPIView):
    """PATCH /api/ads/quotes/<id>/respond/ - Provider responds to a quote."""
    serializer_class = QuoteResponseSerializer
    permission_classes = [IsPrestataire]
    
    def get_queryset(self):
        return QuoteRequest.objects.filter(ad__provider=self.request.user)
    
    def perform_update(self, serializer):
        quote = serializer.save()
        # Notify owner
        from notifications.utils import create_notification
        status_labels = dict(QuoteRequest.Status.choices)
        create_notification(
            recipient=quote.owner,
            notification_type='quote_response',
            title='Réponse à votre demande de devis',
            message=f'Votre demande pour "{quote.ad.title}" a été mise à jour: {status_labels.get(quote.status, quote.status)}.',
            link=f'/dashboard/quotes/{quote.pk}'
        )
        # Send email notification
        from notifications.emails import notify_quote_response
        notify_quote_response(quote)


class OwnerQuoteDecisionView(generics.UpdateAPIView):
    """PATCH /api/ads/quotes/<id>/decide/ - Owner accepts or declines a counter-offer."""
    permission_classes = [IsProprietaire]

    def get_queryset(self):
        return QuoteRequest.objects.filter(owner=self.request.user, status='counter_offer')

    def update(self, request, *args, **kwargs):
        quote = self.get_object()
        decision = request.data.get('decision')  # 'accept' or 'decline'

        if decision not in ('accept', 'decline'):
            return Response(
                {'error': 'Décision invalide. Utilisez "accept" ou "decline".'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if decision == 'accept':
            quote.status = 'accepted'
        else:
            quote.status = 'declined'
        quote.save(update_fields=['status', 'updated_at'])

        # Notify provider
        from notifications.utils import create_notification
        action_label = 'accepté' if decision == 'accept' else 'refusé'
        create_notification(
            recipient=quote.ad.provider,
            notification_type='quote_response',
            title='Décision sur votre contre-offre',
            message=f'{quote.owner.get_full_name() or quote.owner.username} a {action_label} votre contre-offre pour "{quote.ad.title}".',
            link=f'/dashboard'
        )

        return Response({'status': quote.status})


class QuoteAbandonView(APIView):
    """POST /api/ads/quotes/<id>/abandon/ - Either party cancels/abandons a quote request."""

    def post(self, request, pk):
        user = request.user
        try:
            quote = QuoteRequest.objects.select_related('ad', 'ad__provider', 'owner').get(pk=pk)
        except QuoteRequest.DoesNotExist:
            return Response({'error': 'Demande introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        # Verify user is a participant
        if user != quote.owner and user != quote.ad.provider:
            return Response({'error': 'Non autorisé.'}, status=status.HTTP_403_FORBIDDEN)

        # Can only abandon active quotes
        if quote.status in ('cancelled', 'completed', 'declined'):
            return Response({'error': 'Cette demande est déjà terminée.'}, status=status.HTTP_400_BAD_REQUEST)

        # Cancel associated booking if any
        if hasattr(quote, 'booking') and quote.booking.status not in ('cancelled', 'completed'):
            booking = quote.booking
            booking.status = 'cancelled'
            booking.save(update_fields=['status', 'updated_at'])
            if booking.slot:
                booking.slot.is_booked = False
                booking.slot.save(update_fields=['is_booked'])

        quote.status = 'cancelled'
        quote.save(update_fields=['status', 'updated_at'])

        # Notify the other party
        from notifications.utils import create_notification
        other = quote.owner if user == quote.ad.provider else quote.ad.provider
        abandoner_name = user.get_full_name() or user.username
        create_notification(
            recipient=other,
            notification_type='system',
            title='Demande abandonnée',
            message=f'{abandoner_name} a abandonné la demande pour "{quote.ad.title}".',
            link='/dashboard',
        )

        return Response({'status': 'cancelled'})


class QuoteDuplicateCheckView(APIView):
    """GET /api/ads/quotes/check-duplicate/?ad=<id> - Check if user already has an active quote for this ad."""
    permission_classes = [IsProprietaire]

    def get(self, request):
        ad_id = request.query_params.get('ad')
        if not ad_id:
            return Response({'has_active': False})

        active_quote = QuoteRequest.objects.filter(
            owner=request.user,
            ad_id=ad_id,
            status__in=['pending', 'counter_offer', 'accepted'],
        ).first()

        if active_quote:
            return Response({'has_active': True, 'quote_id': active_quote.pk})
        return Response({'has_active': False})


class QuoteAbandonView(APIView):
    """POST /api/ads/quotes/<id>/abandon/ - Either party abandons a quote request."""

    def post(self, request, pk):
        user = request.user
        try:
            quote = QuoteRequest.objects.select_related('ad', 'ad__provider', 'owner').get(pk=pk)
        except QuoteRequest.DoesNotExist:
            return Response({'error': 'Demande introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        # Only owner or provider can abandon
        if user != quote.owner and user != quote.ad.provider:
            return Response({'error': 'Non autorisé.'}, status=status.HTTP_403_FORBIDDEN)

        # Can only abandon active quotes
        if quote.status in ('cancelled', 'completed'):
            return Response(
                {'error': 'Cette demande est déjà terminée ou annulée.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Cancel associated booking if any
        if hasattr(quote, 'booking') and quote.booking.status not in ('cancelled', 'completed'):
            booking = quote.booking
            booking.status = 'cancelled'
            booking.save(update_fields=['status', 'updated_at'])
            if booking.slot:
                booking.slot.is_booked = False
                booking.slot.save(update_fields=['is_booked'])

        quote.status = 'cancelled'
        quote.save(update_fields=['status', 'updated_at'])

        # Notify the other party
        from notifications.utils import create_notification
        other = quote.owner if user == quote.ad.provider else quote.ad.provider
        who = user.get_full_name() or user.username
        create_notification(
            recipient=other,
            notification_type='system',
            title='Demande abandonnée',
            message=f'{who} a abandonné la demande pour "{quote.ad.title}".',
            link='/dashboard',
        )

        return Response({'status': 'cancelled'})


class QuoteDuplicateCheckView(APIView):
    """GET /api/ads/quotes/check-duplicate/?ad=ID - Check if user has active quote for this ad."""

    def get(self, request):
        ad_id = request.query_params.get('ad')
        if not ad_id:
            return Response({'has_active': False})

        existing = QuoteRequest.objects.filter(
            owner=request.user,
            ad_id=ad_id,
            status__in=['pending', 'counter_offer', 'accepted'],
        ).first()

        if existing:
            return Response({
                'has_active': True,
                'quote_id': existing.pk,
                'status': existing.status,
            })
        return Response({'has_active': False})


# --- CS Views ---

class CSAdListView(generics.ListAPIView):
    """GET /api/ads/cs/all/ - All ads (CS only)."""
    serializer_class = AdListSerializer
    permission_classes = [IsCustomerService]
    
    def get_queryset(self):
        qs = Ad.objects.all().select_related('provider', 'category')
        status_filter = self.request.query_params.get('status')
        country = self.request.query_params.get('country')
        if status_filter:
            qs = qs.filter(status=status_filter)
        if country:
            qs = qs.filter(country__code=country)
        return qs
