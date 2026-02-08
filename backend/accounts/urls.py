from django.urls import path
from . import views

urlpatterns = [
    # Auth
    path('register/', views.RegisterView.as_view(), name='register'),
    path('login/', views.LoginView.as_view(), name='login'),
    path('logout/', views.LogoutView.as_view(), name='logout'),
    
    # Current user
    path('me/', views.MeView.as_view(), name='me'),
    path('change-password/', views.ChangePasswordView.as_view(), name='change-password'),
    path('prestataire-profile/', views.PrestataireProfileUpdateView.as_view(), name='prestataire-profile'),
    path('proprietaire-profile/', views.ProprietaireProfileUpdateView.as_view(), name='proprietaire-profile'),
    path('dashboard/', views.DashboardStatsView.as_view(), name='dashboard'),
    
    # Public
    path('providers/', views.ProviderListView.as_view(), name='provider-list'),
    path('users/<int:pk>/', views.PublicUserView.as_view(), name='user-detail'),
    
    # Customer Service
    path('cs/users/', views.CSUserListView.as_view(), name='cs-user-list'),
    path('cs/users/<int:pk>/', views.CSUserDetailView.as_view(), name='cs-user-detail'),
]
