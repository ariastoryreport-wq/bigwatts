from django.urls import path
from . import views

urlpatterns = [
    path('', views.TicketCreateView.as_view(), name='ticket-create'),
    path('my/', views.MyTicketsView.as_view(), name='my-tickets'),
    path('<int:pk>/', views.TicketDetailView.as_view(), name='ticket-detail'),
    path('<int:pk>/respond/', views.TicketRespondView.as_view(), name='ticket-respond'),
    
    # CS
    path('cs/all/', views.CSTicketListView.as_view(), name='cs-ticket-list'),
    path('cs/<int:pk>/update/', views.CSTicketUpdateView.as_view(), name='cs-ticket-update'),
]
