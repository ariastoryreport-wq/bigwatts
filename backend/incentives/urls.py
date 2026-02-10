from django.urls import path
from . import views

urlpatterns = [
    path('', views.IncentiveProgramListView.as_view(), name='incentive-list'),
    path('check/', views.CheckEligibilityView.as_view(), name='incentive-check'),
]
