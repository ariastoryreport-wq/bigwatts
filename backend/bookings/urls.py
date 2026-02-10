from django.urls import path
from . import views

urlpatterns = [
    # Availability
    path('slots/', views.AvailabilitySlotListCreateView.as_view(), name='slot-list-create'),
    path('slots/<int:pk>/', views.AvailabilitySlotDeleteView.as_view(), name='slot-delete'),

    # Bookings
    path('', views.BookingListView.as_view(), name='booking-list'),
    path('create/', views.BookingCreateView.as_view(), name='booking-create'),
    path('<int:pk>/', views.BookingUpdateView.as_view(), name='booking-update'),

    # Payments
    path('<int:pk>/pay-deposit/', views.CreateDepositIntentView.as_view(), name='pay-deposit'),

    # Stripe webhook
    path('webhook/stripe/', views.StripeWebhookView.as_view(), name='stripe-webhook'),
]
