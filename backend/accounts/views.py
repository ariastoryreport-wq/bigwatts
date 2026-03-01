from rest_framework import generics, status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
from django.db.models import Q, Avg, Count, Sum
from django.utils import timezone
from datetime import timedelta
import requests as http_requests

from .serializers import (
    RegisterSerializer, UserSerializer, UserUpdateSerializer,
    UserPublicSerializer, ChangePasswordSerializer,
    PrestaireProfileSerializer, ProprietaireProfileSerializer,
    ProviderBadgeSerializer, UserBadgeSerializer,
    AppointmentSerializer, AppointmentUpdateSerializer,
    CertificationSerializer, CertificationReviewSerializer, CertificationStatusLogSerializer,
)
from .permissions import IsCustomerService, IsOwnerOrReadOnly
from .models import PrestaireProfile, ProprietaireProfile, ProviderBadge, UserBadge, Appointment, Certification, CertificationStatusLog

User = get_user_model()


def _cancel_active_demands(user):
    """Cancel all active quote requests for a user and notify the other party."""
    from ads.models import QuoteRequest
    from bookings.models import Booking
    from notifications.utils import create_notification

    # Quotes where user is the owner (proprietaire)
    active_owner_quotes = QuoteRequest.objects.filter(
        owner=user,
        status__in=['pending', 'counter_offer', 'accepted'],
    ).select_related('ad', 'ad__provider')

    for quote in active_owner_quotes:
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

        create_notification(
            recipient=quote.ad.provider,
            notification_type='system',
            title='Demande annulée',
            message=f'La demande pour "{quote.ad.title}" a été annulée car le compte du client a été supprimé.',
            link='/dashboard',
        )

    # Quotes where user is the provider (prestataire) — via their ads
    active_provider_quotes = QuoteRequest.objects.filter(
        ad__provider=user,
        status__in=['pending', 'counter_offer', 'accepted'],
    ).select_related('ad', 'owner')

    for quote in active_provider_quotes:
        if hasattr(quote, 'booking') and quote.booking.status not in ('cancelled', 'completed'):
            booking = quote.booking
            booking.status = 'cancelled'
            booking.save(update_fields=['status', 'updated_at'])
            if booking.slot:
                booking.slot.is_booked = False
                booking.slot.save(update_fields=['is_booked'])

        quote.status = 'cancelled'
        quote.save(update_fields=['status', 'updated_at'])

        create_notification(
            recipient=quote.owner,
            notification_type='system',
            title='Demande annulée',
            message=f'La demande pour "{quote.ad.title}" a été annulée car le compte du prestataire a été supprimé.',
            link='/dashboard',
        )


def _perform_account_deletion(user):
    """
    Comprehensive account deletion for prestataire or propriétaire.

    Strategy:
    - DELETE: Ads, reviews (written & received), quotes, favorites, badges,
      documents, certifications, availability slots, appointments, notifications,
      blocked users, reports, tickets created by user.
    - ANONYMIZE: Messages (keep conversations but user becomes "Utilisateur supprimé"),
      bookings (keep completed bookings for financial records).
    - PRESERVE: Conversation history, completed booking records.
    """
    from ads.models import Ad, QuoteRequest
    from reviews.models import Review
    from favorites.models import Favorite
    from bookings.models import Booking, AvailabilitySlot
    from messaging.models import BlockedUser
    from notifications.models import Notification, NotificationPreference

    # 1. Cancel all active demands and notify other parties
    _cancel_active_demands(user)

    # 2. DELETE public content — ads and all associated quotes
    #    (quotes CASCADE from ads, but delete explicitly for clarity)
    QuoteRequest.objects.filter(owner=user).update(status='cancelled')
    user_ads = Ad.objects.filter(provider=user)
    # Cancel quotes on provider's ads before deleting
    QuoteRequest.objects.filter(ad__in=user_ads).exclude(
        status__in=['cancelled', 'completed']
    ).update(status='cancelled')
    user_ads.delete()

    # 3. DELETE reviews — both written by and received by the user
    Review.objects.filter(author=user).delete()
    Review.objects.filter(provider=user).delete()

    # 4. DELETE favorites — both directions
    Favorite.objects.filter(user=user).delete()
    Favorite.objects.filter(provider=user).delete()

    # 5. DELETE badges, documents, certifications
    UserBadge.objects.filter(user=user).delete()
    try:
        from accounts.models import ProviderDocument
        ProviderDocument.objects.filter(provider=user).delete()
    except Exception:
        pass
    Certification.objects.filter(user=user).delete()

    # 6. DELETE availability slots
    AvailabilitySlot.objects.filter(provider=user).delete()

    # 7. DELETE appointments
    Appointment.objects.filter(provider=user).delete()
    Appointment.objects.filter(owner=user).delete()

    # 8. DELETE notifications and preferences
    Notification.objects.filter(recipient=user).delete()
    NotificationPreference.objects.filter(user=user).delete()

    # 9. DELETE blocked users —  both directions
    BlockedUser.objects.filter(blocker=user).delete()
    BlockedUser.objects.filter(blocked=user).delete()

    # 10. DELETE tickets created by the user
    try:
        from tickets.models import Ticket
        Ticket.objects.filter(created_by=user).delete()
    except Exception:
        pass

    # 11. DELETE provider/proprietaire profiles
    try:
        if hasattr(user, 'prestataire_profile'):
            user.prestataire_profile.delete()
    except Exception:
        pass
    try:
        if hasattr(user, 'proprietaire_profile'):
            user.proprietaire_profile.delete()
    except Exception:
        pass

    # 12. ANONYMIZE the user row (keep for message FK integrity)
    #     Messages use sender FK → so the user row must remain.
    #     Conversations use M2M → user stays in the participant list
    #     but displays as "Utilisateur supprimé".
    user.is_active = False
    user.username = f'deleted_{user.pk}'
    user.email = f'deleted_{user.pk}@removed.local'
    user.first_name = 'Utilisateur'
    user.last_name = 'supprimé'
    user.phone = ''
    user.bio = ''
    user.address = ''
    user.city = ''
    user.postal_code = ''
    user.region = ''
    user.avatar = None
    user.set_unusable_password()
    user.save()

    # 13. Blacklist all outstanding JWT tokens
    try:
        from rest_framework_simplejwt.token_blacklist.models import OutstandingToken
        from rest_framework_simplejwt.tokens import RefreshToken as _RT
        for token in OutstandingToken.objects.filter(user=user):
            try:
                _RT(token.token).blacklist()
            except Exception:
                pass
    except Exception:
        pass


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


class GoogleAuthView(APIView):
    """POST /api/auth/google/ – Sign in or register via Google OAuth."""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        token = request.data.get('token')
        role = request.data.get('role', 'proprietaire')
        country_code = request.data.get('country_code', 'FR')
        if not token:
            return Response({'error': 'Token requis.'}, status=status.HTTP_400_BAD_REQUEST)

        # Verify the Google id_token
        try:
            resp = http_requests.get(
                'https://oauth2.googleapis.com/tokeninfo',
                params={'id_token': token},
                timeout=5,
            )
            if resp.status_code != 200:
                return Response({'error': 'Token Google invalide.'}, status=status.HTTP_401_UNAUTHORIZED)
            payload = resp.json()
        except Exception:
            return Response({'error': 'Impossible de vérifier le token Google.'}, status=status.HTTP_502_BAD_GATEWAY)

        email = payload.get('email')
        if not email:
            return Response({'error': 'Email non disponible.'}, status=status.HTTP_400_BAD_REQUEST)

        # Existing user? → login
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            user = None

        if user is None:
            # Auto-generate username
            base = email.split('@')[0].lower()
            base = ''.join(c if c.isalnum() or c == '_' else '' for c in base) or 'user'
            username = base
            suffix = 1
            while User.objects.filter(username=username).exists():
                username = f"{base}{suffix}"
                suffix += 1

            user = User.objects.create_user(
                username=username,
                email=email,
                password=None,  # no password – OAuth only
                first_name=payload.get('given_name', ''),
                last_name=payload.get('family_name', ''),
                role=role,
            )
            user.set_unusable_password()
            # Assign country
            from countries.models import Country
            try:
                user.country = Country.objects.get(code=country_code)
            except Country.DoesNotExist:
                pass
            user.save()
            # Create role profile
            if user.role == User.Role.PRESTATAIRE:
                from .models import PrestaireProfile
                PrestaireProfile.objects.create(user=user)
            elif user.role == User.Role.PROPRIETAIRE:
                from .models import ProprietaireProfile
                ProprietaireProfile.objects.create(user=user)

        refresh = RefreshToken.for_user(user)
        return Response({
            'user': UserSerializer(user).data,
            'tokens': {
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            }
        })


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


class DeleteAccountView(APIView):
    """POST /api/auth/delete-account/ - Permanently delete user account."""

    def post(self, request):
        confirm = request.data.get('confirm', False)

        if not confirm:
            return Response(
                {'error': 'Veuillez confirmer la suppression.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = request.user
        _perform_account_deletion(user)

        return Response({'message': 'Votre compte a été supprimé.'}, status=status.HTTP_200_OK)


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


class SaveIncentiveResultsView(APIView):
    """POST /api/auth/me/saved-aides/ — Save/clear incentive results for proprietaire."""

    def post(self, request):
        if not request.user.is_proprietaire:
            return Response({'error': 'Réservé aux propriétaires.'}, status=status.HTTP_403_FORBIDDEN)
        profile, _ = ProprietaireProfile.objects.get_or_create(user=request.user)
        profile.saved_incentive_results = request.data
        profile.save(update_fields=['saved_incentive_results'])
        return Response({'status': 'ok'})

    def delete(self, request):
        if not request.user.is_proprietaire:
            return Response({'error': 'Réservé aux propriétaires.'}, status=status.HTTP_403_FORBIDDEN)
        profile, _ = ProprietaireProfile.objects.get_or_create(user=request.user)
        profile.saved_incentive_results = None
        profile.save(update_fields=['saved_incentive_results'])
        return Response(status=status.HTTP_204_NO_CONTENT)


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
        country = self.request.query_params.get('country')
        
        # Country isolation: authenticated users only see providers in their country
        user = self.request.user
        if user and user.is_authenticated and hasattr(user, 'country') and user.country:
            qs = qs.filter(country=user.country)
        elif country:
            qs = qs.filter(country__code=country)
        
        if city:
            qs = qs.filter(city__icontains=city)
        if search:
            qs = qs.filter(
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search) |
                Q(prestataire_profile__company_name__icontains=search)
            )
        if available == 'true':
            qs = qs.filter(prestataire_profile__is_available=True)
        return qs.select_related('prestataire_profile')


# --- Customer Service views ---

class CSUserListView(generics.ListAPIView):
    """GET /api/auth/cs/users/ - All users (CS only)."""
    serializer_class = UserSerializer
    permission_classes = [IsCustomerService]
    pagination_class = None
    
    def get_queryset(self):
        qs = User.objects.all()
        role = self.request.query_params.get('role')
        search = self.request.query_params.get('search')
        include_deleted = self.request.query_params.get('include_deleted')
        if role:
            qs = qs.filter(role=role)
        if search:
            qs = qs.filter(
                Q(username__icontains=search) |
                Q(email__icontains=search) |
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search)
            )
        # By default, exclude soft-deleted (inactive) users
        if include_deleted != 'true':
            qs = qs.filter(is_active=True)
        return qs


class CSUserDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET/PATCH/DELETE /api/auth/cs/users/<id>/ - User detail (CS only)."""
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsCustomerService]

    def perform_update(self, serializer):
        # Allow CS to update country via country_code field
        country_code = self.request.data.get('country_code')
        if country_code is not None:
            from countries.models import Country
            try:
                country = Country.objects.get(code=country_code)
                serializer.save(country=country)
                return
            except Country.DoesNotExist:
                pass
        serializer.save()

    def perform_destroy(self, instance):
        _perform_account_deletion(instance)


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
        from notifications.utils import create_notification
        create_notification(
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
        from notifications.utils import create_notification
        other = appointment.owner if self.request.user == appointment.provider else appointment.provider
        create_notification(
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
        from notifications.utils import create_notification
        other = appointment.owner if self.request.user == appointment.provider else appointment.provider
        status_labels = dict(Appointment.Status.choices)
        create_notification(
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
            from bookings.models import Booking

            ads = Ad.objects.filter(provider=user)
            quotes = QuoteRequest.objects.filter(ad__provider=user)
            reviews = Review.objects.filter(provider=user)
            bookings = Booking.objects.filter(provider=user)

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

            # Monthly revenue (last 6 months, from completed client bookings)
            monthly_revenue = []
            for i in range(6):
                month_start = (now - timedelta(days=30 * (5 - i))).replace(day=1)
                if i < 5:
                    month_end = (now - timedelta(days=30 * (4 - i))).replace(day=1)
                else:
                    month_end = now + timedelta(days=1)
                rev = bookings.filter(
                    status='completed',
                    updated_at__gte=month_start,
                    updated_at__lt=month_end,
                    quote__quoted_price__isnull=False,
                ).aggregate(total=Sum('quote__quoted_price'))['total'] or 0
                monthly_revenue.append({
                    'month': month_start.strftime('%b %Y'),
                    'amount': float(rev),
                })

            total_revenue = float(
                bookings.filter(status='completed', quote__quoted_price__isnull=False)
                .aggregate(total=Sum('quote__quoted_price'))['total'] or 0
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
                'monthly_revenue': monthly_revenue,
                'total_revenue': total_revenue,
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


# ──────────────────── Provider Documents ────────────────────

class ProviderDocumentListCreateView(generics.ListCreateAPIView):
    """GET/POST /api/auth/documents/ — list & upload provider documents."""
    from .serializers import ProviderDocumentSerializer
    serializer_class = ProviderDocumentSerializer

    def get_queryset(self):
        return self.request.user.documents.all()

    def perform_create(self, serializer):
        if not self.request.user.is_prestataire:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Seuls les prestataires peuvent envoyer des documents.")
        serializer.save(provider=self.request.user)


class ProviderDocumentDeleteView(generics.DestroyAPIView):
    """DELETE /api/auth/documents/<id>/ — delete own pending document."""

    def get_queryset(self):
        return self.request.user.documents.filter(status='pending')


# ──────────────────── Certifications ────────────────────

class CertificationListCreateView(generics.ListCreateAPIView):
    """GET/POST /api/auth/certifications/ — list & submit certifications."""
    serializer_class = CertificationSerializer

    def get_queryset(self):
        return self.request.user.certifications.all()

    def perform_create(self, serializer):
        if not self.request.user.is_prestataire:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Seuls les prestataires peuvent soumettre des certifications.")
        cert = serializer.save(user=self.request.user)
        # Create audit log
        CertificationStatusLog.objects.create(
            certification=cert,
            old_status='',
            new_status=Certification.Status.PENDING,
            changed_by=self.request.user,
            notes='Certification soumise pour vérification',
        )


class CertificationDetailView(generics.RetrieveDestroyAPIView):
    """GET/DELETE /api/auth/certifications/<id>/ — view or delete own certification."""
    serializer_class = CertificationSerializer

    def get_queryset(self):
        return self.request.user.certifications.all()

    def perform_destroy(self, instance):
        if instance.status == Certification.Status.APPROVED:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Une certification approuvée ne peut pas être supprimée.")
        instance.delete()


class CertificationLogsView(generics.ListAPIView):
    """GET /api/auth/certifications/<id>/logs/ — audit logs for a certification."""
    serializer_class = CertificationStatusLogSerializer

    def get_queryset(self):
        cert_id = self.kwargs['pk']
        user = self.request.user
        # Owners can see their own logs, CS can see all
        if user.is_customer_service:
            return CertificationStatusLog.objects.filter(certification_id=cert_id)
        return CertificationStatusLog.objects.filter(
            certification_id=cert_id,
            certification__user=user,
        )


# ──────────────────── CS Certification Admin ────────────────────

class CSCertificationPendingListView(generics.ListAPIView):
    """GET /api/auth/cs/certifications/pending/ — list all pending certifications."""
    serializer_class = CertificationSerializer
    permission_classes = [IsCustomerService]

    def get_queryset(self):
        qs = Certification.objects.select_related('user', 'reviewed_by')
        status_filter = self.request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)
        else:
            qs = qs.filter(status=Certification.Status.PENDING)
        return qs


class CSCertificationAllListView(generics.ListAPIView):
    """GET /api/auth/cs/certifications/ — list all certifications (any status)."""
    permission_classes = [IsCustomerService]

    def get_queryset(self):
        qs = Certification.objects.select_related('user', 'reviewed_by')
        status_filter = self.request.query_params.get('status')
        user_id = self.request.query_params.get('user')
        if status_filter:
            qs = qs.filter(status=status_filter)
        if user_id:
            qs = qs.filter(user_id=user_id)
        return qs

    def get_serializer_class(self):
        from rest_framework import serializers as drf_serializers

        class CertificationWithUserSerializer(CertificationSerializer):
            user_id = drf_serializers.IntegerField(source='user.id', read_only=True)
            user_name = drf_serializers.SerializerMethodField()

            class Meta(CertificationSerializer.Meta):
                fields = CertificationSerializer.Meta.fields + ['user_id', 'user_name']

            def get_user_name(self, obj):
                return obj.user.get_full_name() or obj.user.username

        return CertificationWithUserSerializer


class CSCertificationReviewView(APIView):
    """POST /api/auth/cs/certifications/<id>/review/ — approve or reject."""
    permission_classes = [IsCustomerService]

    def post(self, request, pk):
        try:
            cert = Certification.objects.get(pk=pk)
        except Certification.DoesNotExist:
            return Response({'detail': 'Certification introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = CertificationReviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        action = serializer.validated_data['action']
        review_notes = serializer.validated_data.get('review_notes', '')
        old_status = cert.status

        if action == 'approve':
            cert.status = Certification.Status.APPROVED
            cert.verification_date = timezone.now()
        elif action == 'reject':
            cert.status = Certification.Status.REJECTED

        cert.reviewed_by = request.user
        cert.review_notes = review_notes
        cert.save()

        # Audit log
        CertificationStatusLog.objects.create(
            certification=cert,
            old_status=old_status,
            new_status=cert.status,
            changed_by=request.user,
            notes=review_notes or f"Certification {action}d par {request.user.get_full_name() or request.user.username}",
        )

        # Notify the provider
        from notifications.utils import create_notification
        if action == 'approve':
            create_notification(
                recipient=cert.user,
                notification_type='certification_approved',
                title='Certification approuvée',
                message=f'Votre certification "{cert.certification_name}" a été approuvée.',
                link='/dashboard/profile',
            )
        elif action == 'reject':
            create_notification(
                recipient=cert.user,
                notification_type='certification_rejected',
                title='Certification refusée',
                message=f'Votre certification "{cert.certification_name}" a été refusée. {review_notes}'.strip(),
                link='/dashboard/profile',
            )

        return Response(CertificationSerializer(cert, context={'request': request}).data)