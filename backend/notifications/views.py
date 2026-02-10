from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Notification, NotificationPreference
from .serializers import NotificationSerializer, NotificationPreferenceSerializer


class NotificationListView(generics.ListAPIView):
    """GET /api/notifications/ - User's notifications."""
    serializer_class = NotificationSerializer
    
    def get_queryset(self):
        return Notification.objects.filter(recipient=self.request.user)


class UnreadCountView(APIView):
    """GET /api/notifications/unread-count/ - Count of unread notifications."""
    
    def get(self, request):
        count = Notification.objects.filter(recipient=request.user, is_read=False).count()
        return Response({'unread_count': count})


class MarkReadView(APIView):
    """POST /api/notifications/mark-read/ - Mark notifications as read."""
    
    def post(self, request):
        notification_ids = request.data.get('ids', [])
        if notification_ids:
            Notification.objects.filter(
                recipient=request.user, id__in=notification_ids
            ).update(is_read=True)
        else:
            Notification.objects.filter(recipient=request.user).update(is_read=True)
        return Response({'message': 'Notifications marquées comme lues.'})


class MarkSingleReadView(APIView):
    """POST /api/notifications/<id>/read/ - Mark single notification as read."""
    
    def post(self, request, pk):
        Notification.objects.filter(recipient=request.user, pk=pk).update(is_read=True)
        return Response({'message': 'Notification lue.'})


class NotificationPreferenceView(APIView):
    """GET/PATCH /api/notifications/preferences/ - User notification preferences."""

    def get(self, request):
        prefs, _ = NotificationPreference.objects.get_or_create(user=request.user)
        return Response(NotificationPreferenceSerializer(prefs).data)

    def patch(self, request):
        prefs, _ = NotificationPreference.objects.get_or_create(user=request.user)
        serializer = NotificationPreferenceSerializer(prefs, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)
