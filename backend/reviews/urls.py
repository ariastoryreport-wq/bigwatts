from django.urls import path
from . import views

urlpatterns = [
    path('', views.ReviewListView.as_view(), name='review-list'),
    path('create/', views.ReviewCreateView.as_view(), name='review-create'),
    path('can-review/', views.CanReviewView.as_view(), name='can-review'),
    path('<int:pk>/respond/', views.ReviewResponseView.as_view(), name='review-respond'),
    path('received/', views.MyReceivedReviewsView.as_view(), name='received-reviews'),
    path('written/', views.MyWrittenReviewsView.as_view(), name='written-reviews'),
]
