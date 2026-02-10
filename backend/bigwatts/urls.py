"""BigWatts URL Configuration"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework_simplejwt.views import TokenRefreshView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('accounts.urls')),
    path('api/ads/', include('ads.urls')),
    path('api/messaging/', include('messaging.urls')),
    path('api/reviews/', include('reviews.urls')),
    path('api/favorites/', include('favorites.urls')),
    path('api/notifications/', include('notifications.urls')),
    path('api/tickets/', include('tickets.urls')),
    path('api/bookings/', include('bookings.urls')),
    path('api/incentives/', include('incentives.urls')),
    path('api/countries/', include('countries.urls')),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
