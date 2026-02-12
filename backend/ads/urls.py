from django.urls import path
from . import views

urlpatterns = [
    # Categories
    path('categories/', views.ServiceCategoryListView.as_view(), name='category-list'),
    
    # Ads
    path('', views.AdListView.as_view(), name='ad-list'),
    path('<int:pk>/', views.AdDetailView.as_view(), name='ad-detail'),
    path('my/', views.MyAdsListView.as_view(), name='my-ads'),
    path('create/', views.AdCreateView.as_view(), name='ad-create'),
    path('<int:pk>/update/', views.AdUpdateView.as_view(), name='ad-update'),
    path('<int:pk>/delete/', views.AdDeleteView.as_view(), name='ad-delete'),
    
    # Quotes
    path('quotes/', views.QuoteRequestCreateView.as_view(), name='quote-create'),
    path('quotes/my/', views.MyQuoteRequestsView.as_view(), name='my-quotes'),
    path('quotes/received/', views.ReceivedQuoteRequestsView.as_view(), name='received-quotes'),
    path('quotes/<int:pk>/', views.QuoteRequestDetailView.as_view(), name='quote-detail'),
    path('quotes/<int:pk>/respond/', views.QuoteRespondView.as_view(), name='quote-respond'),
    path('quotes/<int:pk>/decide/', views.OwnerQuoteDecisionView.as_view(), name='quote-decide'),
    path('quotes/<int:pk>/abandon/', views.QuoteAbandonView.as_view(), name='quote-abandon'),
    path('quotes/check-duplicate/', views.QuoteDuplicateCheckView.as_view(), name='quote-duplicate-check'),
    
    # CS
    path('cs/all/', views.CSAdListView.as_view(), name='cs-ad-list'),
]
