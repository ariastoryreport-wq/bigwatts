from django.urls import path
from . import views

urlpatterns = [
    path('', views.CountryListView.as_view(), name='country-list'),
    path('detect/', views.DetectCountryView.as_view(), name='country-detect'),
    path('<str:code>/', views.CountryDetailView.as_view(), name='country-detail'),
]
