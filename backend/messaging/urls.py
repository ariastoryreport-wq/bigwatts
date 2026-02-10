from django.urls import path
from . import views

urlpatterns = [
    path('conversations/', views.ConversationListView.as_view(), name='conversation-list'),
    path('conversations/<int:pk>/', views.ConversationDetailView.as_view(), name='conversation-detail'),
    path('conversations/<int:pk>/messages/', views.ConversationMessagesView.as_view(), name='conversation-messages'),
    path('conversations/<int:pk>/poll/', views.ConversationPollView.as_view(), name='conversation-poll'),
    path('send/', views.SendMessageView.as_view(), name='send-message'),
    path('unread-total/', views.UnreadTotalView.as_view(), name='unread-total'),
    path('cs/all/', views.CSConversationListView.as_view(), name='cs-conversations'),
]
