from django.urls import path
from . import views

urlpatterns = [
    path('', views.CountryListView.as_view(), name='country-list'),
    path('detect/', views.DetectCountryView.as_view(), name='country-detect'),
    # Location autocomplete endpoints (self-hosted data)
    path('locations/cities/', views.LocationCitySearchView.as_view(), name='location-city-search'),
    path('locations/postalcodes/', views.LocationPostalCodeSearchView.as_view(), name='location-postalcode-search'),
    path('locations/validate/', views.LocationValidateView.as_view(), name='location-validate'),
    # Keep <str:code>/ last to avoid capturing 'locations' as a country code
    path('<str:code>/', views.CountryDetailView.as_view(), name='country-detail'),
]
