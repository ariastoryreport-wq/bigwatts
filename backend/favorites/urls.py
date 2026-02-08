from django.urls import path
from . import views

urlpatterns = [
    path('', views.FavoriteListView.as_view(), name='favorite-list'),
    path('<int:pk>/', views.FavoriteDeleteView.as_view(), name='favorite-delete'),
    path('toggle/', views.ToggleFavoriteView.as_view(), name='favorite-toggle'),
    path('check/', views.CheckFavoriteView.as_view(), name='favorite-check'),
]
