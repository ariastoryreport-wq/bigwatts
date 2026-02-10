from rest_framework import generics, status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
from django.db.models import Q, Avg, Count, Sum
from django.utils import timezone
from datetime import timedelta

from .serializers import (
    RegisterSerializer, UserSerializer, UserUpdateSerializer,
    UserPublicSerializer, ChangePasswordSerializer,
    PrestaireProfileSerializer, ProprietaireProfileSerializer,
    ProviderBadgeSerializer, UserBadgeSerializer,
    AppointmentSerializer, AppointmentUpdateSerializer,
)
from .permissions import IsCustomerService, IsOwnerOrReadOnly
from .models import PrestaireProfile, ProprietaireProfile, ProviderBadge, UserBadge, Appointment

User = get_user_model()


class RegisterView(generics.CreateAPIView):
    """POST /api/auth/register/ - Create a new user account."""
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        return Response({
            'user': UserSerializer(user).data,
            'tokens': {
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            }
        }, status=status.HTTP_201_CREATED)


class LoginView(APIView):
    """POST /api/auth/login/ - Authenticate and get JWT tokens."""
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        username = request.data.get('username', '')
        password = request.data.get('password', '')
        
        # Allow login with email or username
        try:
            if '@' in username:
                user = User.objects.get(email=username)
            else:
                user = User.objects.get(username=username)
        except User.DoesNotExist:
            return Response(
                {'error': 'Identifiants incorrects.'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        if not user.check_password(password):
            return Response(
                {'error': 'Identifiants incorrects.'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        if not user.is_active:
            return Response(
                {'error': 'Ce compte est désactivé.'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        refresh = RefreshToken.for_user(user)
        return Response({
            'user': UserSerializer(user).data,
            'tokens': {
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            }
        })


class LogoutView(APIView):
    """POST /api/auth/logout/ - Blacklist the refresh token."""
    def post(self, request):
        try:
            refresh_token = request.data.get('refresh')
            token = RefreshToken(refresh_token)
            token.blacklist()
        except Exception:
            pass
        return Response({'message': 'Déconnexion réussie.'}, status=status.HTTP_200_OK)


class MeView(generics.RetrieveUpdateAPIView):
    """GET/PATCH /api/auth/me/ - Current user profile."""
    serializer_class = UserSerializer
    
    def get_object(self):
        return self.request.user
    
    def get_serializer_class(self):
        if self.request.method in ('PUT', 'PATCH'):
            return UserUpdateSerializer
        return UserSerializer


class ChangePasswordView(generics.UpdateAPIView):
    """PUT /api/auth/change-password/ - Change password."""
    serializer_class = ChangePasswordSerializer
    
    def get_object(self):
        return self.request.user
    
    def update(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        request.user.set_password(serializer.validated_data['new_password'])
        request.user.save()
        return Response({'message': 'Mot de passe modifié avec succès.'})


class PrestataireProfileUpdateView(generics.UpdateAPIView):
    """PATCH /api/auth/prestataire-profile/ - Update provider profile."""
    serializer_class = PrestaireProfileSerializer
    
    def get_object(self):
        profile, _ = PrestaireProfile.objects.get_or_create(user=self.request.user)
        return profile


class ProprietaireProfileUpdateView(generics.UpdateAPIView):
    """PATCH /api/auth/proprietaire-profile/ - Update owner profile."""
    serializer_class = ProprietaireProfileSerializer
    
    def get_object(self):
        profile, _ = ProprietaireProfile.objects.get_or_create(user=self.request.user)
        return profile


class PublicUserView(generics.RetrieveAPIView):
    """GET /api/auth/users/<id>/ - Public user profile."""
    queryset = User.objects.filter(is_active=True)
    serializer_class = UserPublicSerializer
    permission_classes = [permissions.AllowAny]


class ProviderListView(generics.ListAPIView):
    """GET /api/auth/providers/ - List all providers with filters."""
    serializer_class = UserPublicSerializer
    permission_classes = [permissions.AllowAny]
    
    def get_queryset(self):
        qs = User.objects.filter(role='prestataire', is_active=True)
        city = self.request.query_params.get('city')
        search = self.request.query_params.get('search')
        available = self.request.query_params.get('available')
        
        if city:
            qs = qs.filter(city__icontains=city)
        if search:
            qs = qs.filter(
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search) |
                Q(prestataire_profile__company_name__icontains=search) |
                Q(prestataire_profile__specialties__icontains=search)
            )
        if available == 'true':
            qs = qs.filter(prestataire_profile__is_available=True)
        return qs.select_related('prestataire_profile')


# --- Customer Service views ---

class CSUserListView(generics.ListAPIView):
    """GET /api/auth/cs/users/ - All users (CS only)."""
    serializer_class = UserSerializer
    permission_classes = [IsCustomerService]
    
    def get_queryset(self):
        qs = User.objects.all()
        role = self.request.query_params.get('role')
        search = self.request.query_params.get('search')
        if role:
            qs = qs.filter(role=role)
        if search:
            qs = qs.filter(
                Q(username__icontains=search) |
                Q(email__icontains=search) |
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search)
            )
        return qs


class CSUserDetailView(generics.RetrieveUpdateAPIView):
    """GET/PATCH /api/auth/cs/users/<id>/ - User detail (CS only)."""
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsCustomerService]


class DashboardStatsView(APIView):
    """GET /api/auth/dashboard/ - Dashboard stats for current user."""
    
    def get(self, request):
        user = request.user
        data = {'role': user.role}
        
        if user.is_prestataire:
            from ads.models import Ad, QuoteRequest
            from bookings.models import Booking
            data.update({
                'total_ads': user.ads.count(),
                'active_ads': user.ads.filter(status='active').count(),
                'total_quote_requests': QuoteRequest.objects.filter(ad__provider=user).count(),
                'pending_requests': QuoteRequest.objects.filter(ad__provider=user, status='pending').count(),
                'total_reviews': user.received_reviews.count(),
                'total_bookings': Booking.objects.filter(provider=user).exclude(status='cancelled').count(),
                'unread_messages': user.conversations.filter(
                    messages__is_read=False
                ).exclude(messages__sender=user).distinct().count(),
            })
        elif user.is_proprietaire:
            from ads.models import QuoteRequest
            from bookings.models import Booking
            data.update({
                'total_requests': user.quote_requests.count(),
                'pending_requests': user.quote_requests.filter(status='pending').count(),
                'accepted_requests': user.quote_requests.filter(status='accepted').count(),
                'total_bookings': Booking.objects.filter(homeowner=user).exclude(status='cancelled').count(),
                'total_favorites': user.favorites.count(),
                'unread_messages': user.conversations.filter(
                    messages__is_read=False
                ).exclude(messages__sender=user).distinct().count(),
            })
        elif user.is_customer_service:
            from tickets.models import Ticket
            data.update({
                'total_users': User.objects.count(),
                'total_prestataires': User.objects.filter(role='prestataire').count(),
                'total_proprietaires': User.objects.filter(role='proprietaire').count(),
                'open_tickets': Ticket.objects.filter(status='open').count(),
                'in_progress_tickets': Ticket.objects.filter(status='in_progress').count(),
                'my_tickets': Ticket.objects.filter(assigned_to=user).exclude(status='closed').count(),
            })
        
        return Response(data)


# ──────────────────── Badges ────────────────────

class BadgeListView(generics.ListAPIView):
    """GET /api/auth/badges/ - All available badges."""
    queryset = ProviderBadge.objects.filter(is_active=True)
    serializer_class = ProviderBadgeSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None


class UserBadgesView(generics.ListAPIView):
    """GET /api/auth/users/<id>/badges/ - Badges for a user."""
    serializer_class = UserBadgeSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None

    def get_queryset(self):
        return UserBadge.objects.filter(user_id=self.kwargs['pk']).select_related('badge')


class AssignBadgeView(APIView):
    """POST /api/auth/cs/badges/assign/ - CS assigns a badge to a user."""
    permission_classes = [IsCustomerService]

    def post(self, request):
        user_id = request.data.get('user_id')
        badge_id = request.data.get('badge_id')
        notes = request.data.get('notes', '')

        try:
            target_user = User.objects.get(pk=user_id)
            badge = ProviderBadge.objects.get(pk=badge_id, is_active=True)
        except (User.DoesNotExist, ProviderBadge.DoesNotExist):
            return Response({'error': 'Utilisateur ou badge introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        ub, created = UserBadge.objects.get_or_create(
            user=target_user, badge=badge,
            defaults={'awarded_by': request.user, 'notes': notes}
        )
        if not created:
            return Response({'error': 'Ce badge est déjà attribué.'}, status=status.HTTP_400_BAD_REQUEST)

        # Create notification
        from notifications.models import Notification
        Notification.objects.create(
            recipient=target_user,
            notification_type='system',
            title='Nouveau badge obtenu !',
            message=f'Vous avez reçu le badge "{badge.name}". Félicitations !',
            link='/dashboard/profile'
        )

        return Response(UserBadgeSerializer(ub).data, status=status.HTTP_201_CREATED)


# ──────────────────── Appointments ────────────────────

class AppointmentListView(generics.ListAPIView):
    """GET /api/auth/appointments/ - User's appointments."""
    serializer_class = AppointmentSerializer

    def get_queryset(self):
        user = self.request.user
        qs = Appointment.objects.filter(Q(provider=user) | Q(owner=user))
        status_filter = self.request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)
        return qs.select_related('provider', 'owner')


class AppointmentCreateView(generics.CreateAPIView):
    """POST /api/auth/appointments/ - Create an appointment."""
    serializer_class = AppointmentSerializer

    def perform_create(self, serializer):
        appointment = serializer.save()
        # Notify the other party
        from notifications.models import Notification
        other = appointment.owner if self.request.user == appointment.provider else appointment.provider
        Notification.objects.create(
            recipient=other,
            notification_type='system',
            title='Nouveau rendez-vous',
            message=f'{self.request.user.get_full_name() or self.request.user.username} a proposé un rendez-vous : "{appointment.title}" le {appointment.date}.',
            link='/dashboard/appointments'
        )


class AppointmentUpdateView(generics.UpdateAPIView):
    """PATCH /api/auth/appointments/<id>/ - Update appointment status."""
    serializer_class = AppointmentUpdateSerializer

    def get_queryset(self):
        user = self.request.user
        return Appointment.objects.filter(Q(provider=user) | Q(owner=user))

    def perform_update(self, serializer):
        appointment = serializer.save()
        from notifications.models import Notification
        other = appointment.owner if self.request.user == appointment.provider else appointment.provider
        status_labels = dict(Appointment.Status.choices)
        Notification.objects.create(
            recipient=other,
            notification_type='system',
            title='Rendez-vous mis à jour',
            message=f'Le rendez-vous "{appointment.title}" a été mis à jour : {status_labels.get(appointment.status, appointment.status)}.',
            link='/dashboard/appointments'
        )


# ──────────────────── Analytics ────────────────────

class AnalyticsView(APIView):
    """GET /api/auth/analytics/ - Provider analytics data."""

    def get(self, request):
        user = request.user

        if user.is_prestataire:
            from ads.models import Ad, QuoteRequest
            from reviews.models import Review

            ads = Ad.objects.filter(provider=user)
            quotes = QuoteRequest.objects.filter(ad__provider=user)
            reviews = Review.objects.filter(provider=user)

            # Views over time (last 6 months, grouped by month)
            now = timezone.now()
            six_months_ago = now - timedelta(days=180)

            monthly_quotes = []
            for i in range(6):
                month_start = (now - timedelta(days=30 * (5 - i))).replace(day=1)
                if i < 5:
                    month_end = (now - timedelta(days=30 * (4 - i))).replace(day=1)
                else:
                    month_end = now + timedelta(days=1)
                count = quotes.filter(created_at__gte=month_start, created_at__lt=month_end).count()
                monthly_quotes.append({
                    'month': month_start.strftime('%b %Y'),
                    'count': count
                })

            # Quote conversion rate
            total_quotes = quotes.count()
            accepted_quotes = quotes.filter(status='accepted').count()
            completed_quotes = quotes.filter(status='completed').count()

            # Rating distribution
            rating_dist = list(
                reviews.values('rating').annotate(count=Count('id')).order_by('rating')
            )

            data = {
                'total_views': ads.aggregate(total=Sum('views_count'))['total'] or 0,
                'total_inquiries': ads.aggregate(total=Sum('inquiries_count'))['total'] or 0,
                'total_ads': ads.count(),
                'active_ads': ads.filter(status='active').count(),
                'total_quotes': total_quotes,
                'accepted_quotes': accepted_quotes,
                'completed_quotes': completed_quotes,
                'conversion_rate': round((accepted_quotes / total_quotes * 100), 1) if total_quotes > 0 else 0,
                'average_rating': float(reviews.aggregate(avg=Avg('rating'))['avg'] or 0),
                'total_reviews': reviews.count(),
                'monthly_quotes': monthly_quotes,
                'rating_distribution': rating_dist,
                'top_ads': list(ads.filter(status='active').order_by('-views_count')[:5].values(
                    'id', 'title', 'views_count', 'inquiries_count'
                )),
            }
        elif user.is_proprietaire:
            from ads.models import QuoteRequest
            quotes = QuoteRequest.objects.filter(owner=user)
            data = {
                'total_requests': quotes.count(),
                'pending': quotes.filter(status='pending').count(),
                'accepted': quotes.filter(status='accepted').count(),
                'completed': quotes.filter(status='completed').count(),
                'declined': quotes.filter(status='declined').count(),
                'total_favorites': user.favorites.count(),
            }
        elif user.is_customer_service:
            from ads.models import Ad, QuoteRequest
            from tickets.models import Ticket
            from reviews.models import Review
            data = {
                'total_users': User.objects.count(),
                'total_providers': User.objects.filter(role='prestataire').count(),
                'total_owners': User.objects.filter(role='proprietaire').count(),
                'verified_providers': User.objects.filter(role='prestataire', is_verified=True).count(),
                'total_ads': Ad.objects.count(),
                'active_ads': Ad.objects.filter(status='active').count(),
                'total_quotes': QuoteRequest.objects.count(),
                'total_reviews': Review.objects.count(),
                'open_tickets': Ticket.objects.filter(status='open').count(),
                'avg_rating': float(Review.objects.aggregate(avg=Avg('rating'))['avg'] or 0),
            }
        else:
            data = {}

        return Response(data)