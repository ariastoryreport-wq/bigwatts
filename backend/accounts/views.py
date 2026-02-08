from rest_framework import generics, status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
from django.db.models import Q

from .serializers import (
    RegisterSerializer, UserSerializer, UserUpdateSerializer,
    UserPublicSerializer, ChangePasswordSerializer,
    PrestaireProfileSerializer, ProprietaireProfileSerializer
)
from .permissions import IsCustomerService, IsOwnerOrReadOnly
from .models import PrestaireProfile, ProprietaireProfile

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
            data.update({
                'total_ads': user.ads.count(),
                'active_ads': user.ads.filter(status='active').count(),
                'total_quote_requests': QuoteRequest.objects.filter(ad__provider=user).count(),
                'pending_requests': QuoteRequest.objects.filter(ad__provider=user, status='pending').count(),
                'total_reviews': user.received_reviews.count(),
                'unread_messages': user.conversations.filter(
                    messages__is_read=False
                ).exclude(messages__sender=user).distinct().count(),
            })
        elif user.is_proprietaire:
            from ads.models import QuoteRequest
            data.update({
                'total_requests': user.quote_requests.count(),
                'pending_requests': user.quote_requests.filter(status='pending').count(),
                'accepted_requests': user.quote_requests.filter(status='accepted').count(),
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
