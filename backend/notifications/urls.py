from django.urls import path
from . import views

urlpatterns = [
    path('', views.NotificationListView.as_view(), name='notification-list'),
    path('unread-count/', views.UnreadCountView.as_view(), name='unread-count'),
    path('mark-read/', views.MarkReadView.as_view(), name='mark-read'),
    path('<int:pk>/read/', views.MarkSingleReadView.as_view(), name='mark-single-read'),
]
