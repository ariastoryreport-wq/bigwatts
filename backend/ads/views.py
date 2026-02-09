from rest_framework import generics, permissions, status, filters
from rest_framework.response import Response
from rest_framework.decorators import api_view
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
        qs = Ad.objects.filter(status='active').select_related('provider', 'category', 'provider__prestataire_profile')
        
        category = self.request.query_params.get('category')
        city = self.request.query_params.get('city')
        price_min = self.request.query_params.get('price_min')
        price_max = self.request.query_params.get('price_max')
        price_type = self.request.query_params.get('price_type')
        provider = self.request.query_params.get('provider')
        
        if category:
            qs = qs.filter(category__slug=category)
        if city:
            qs = qs.filter(city__icontains=city)
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
    queryset = Ad.objects.select_related('provider', 'category', 'provider__prestataire_profile')
    serializer_class = AdDetailSerializer
    permission_classes = [permissions.AllowAny]
    
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


class AdUpdateView(generics.UpdateAPIView):
    """PATCH /api/ads/<id>/update/ - Update an ad."""
    serializer_class = AdCreateUpdateSerializer
    permission_classes = [IsPrestataire, IsAdOwner]
    
    def get_queryset(self):
        return Ad.objects.filter(provider=self.request.user)


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
        quote = serializer.save()
        # Increment inquiries count
        Ad.objects.filter(pk=quote.ad_id).update(inquiries_count=F('inquiries_count') + 1)
        # Create notification for provider
        from notifications.models import Notification
        Notification.objects.create(
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
        from notifications.models import Notification
        status_labels = dict(QuoteRequest.Status.choices)
        Notification.objects.create(
            recipient=quote.owner,
            notification_type='quote_response',
            title='Réponse à votre demande de devis',
            message=f'Votre demande pour "{quote.ad.title}" a été mise à jour: {status_labels.get(quote.status, quote.status)}.',
            link=f'/dashboard/quotes/{quote.pk}'
        )
        # Send email notification
        from notifications.emails import notify_quote_response
        notify_quote_response(quote)


# --- CS Views ---

class CSAdListView(generics.ListAPIView):
    """GET /api/ads/cs/all/ - All ads (CS only)."""
    serializer_class = AdListSerializer
    permission_classes = [IsCustomerService]
    
    def get_queryset(self):
        qs = Ad.objects.all().select_related('provider', 'category')
        status_filter = self.request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)
        return qs
