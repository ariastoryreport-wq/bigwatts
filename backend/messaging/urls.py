from django.urls import path
from . import views

urlpatterns = [
    # Conversations
    path('conversations/', views.ConversationListView.as_view(), name='conversation-list'),
    path('conversations/<int:pk>/', views.ConversationDetailView.as_view(), name='conversation-detail'),
    path('conversations/<int:pk>/messages/', views.ConversationMessagesView.as_view(), name='conversation-messages'),
    path('conversations/<int:pk>/poll/', views.ConversationPollView.as_view(), name='conversation-poll'),
    path('send/', views.SendMessageView.as_view(), name='send-message'),
    path('unread-total/', views.UnreadTotalView.as_view(), name='unread-total'),

    # Online / Heartbeat
    path('heartbeat/', views.HeartbeatView.as_view(), name='heartbeat'),
    path('online/<int:user_id>/', views.UserOnlineStatusView.as_view(), name='user-online'),

    # Block / Report
    path('block/', views.BlockUserView.as_view(), name='block-user'),
    path('unblock/', views.UnblockUserView.as_view(), name='unblock-user'),
    path('blocked/', views.BlockedListView.as_view(), name='blocked-list'),
    path('report/', views.ReportUserView.as_view(), name='report-user'),

    # User search for new conversations
    path('users/search/', views.UserSearchView.as_view(), name='user-search'),

    # CS
    path('cs/all/', views.CSConversationListView.as_view(), name='cs-conversations'),
]
