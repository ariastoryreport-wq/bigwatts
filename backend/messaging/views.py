from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth import get_user_model
from django.db.models import Q

from .models import Conversation, Message
from .serializers import (
    ConversationListSerializer, ConversationDetailSerializer,
    MessageSerializer, SendMessageSerializer
)
from accounts.permissions import IsCustomerService

User = get_user_model()


class ConversationListView(generics.ListAPIView):
    """GET /api/messaging/conversations/ - User's conversations."""
    serializer_class = ConversationListSerializer
    
    def get_queryset(self):
        return Conversation.objects.filter(
            participants=self.request.user
        ).prefetch_related('participants', 'messages')


class ConversationDetailView(generics.RetrieveAPIView):
    """GET /api/messaging/conversations/<id>/ - Conversation messages."""
    serializer_class = ConversationDetailSerializer
    
    def get_queryset(self):
        return Conversation.objects.filter(participants=self.request.user)
    
    def retrieve(self, request, *args, **kwargs):
        conversation = self.get_object()
        # Mark messages as read
        conversation.messages.filter(is_read=False).exclude(
            sender=request.user
        ).update(is_read=True)
        serializer = self.get_serializer(conversation)
        return Response(serializer.data)


class SendMessageView(APIView):
    """POST /api/messaging/send/ - Send a message (create or find conversation)."""
    
    def post(self, request):
        serializer = SendMessageSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        recipient_id = serializer.validated_data.get('recipient_id')
        ad_id = serializer.validated_data.get('ad_id')
        content = serializer.validated_data['content']
        
        if not recipient_id:
            return Response({'error': 'recipient_id est requis.'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            recipient = User.objects.get(pk=recipient_id)
        except User.DoesNotExist:
            return Response({'error': 'Destinataire introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        
        # Find existing conversation or create new one
        conversation = None
        user_conversations = Conversation.objects.filter(
            participants=request.user
        ).filter(participants=recipient)
        
        if ad_id:
            conversation = user_conversations.filter(ad_id=ad_id).first()
        else:
            conversation = user_conversations.filter(ad__isnull=True).first()
        
        if not conversation:
            from ads.models import Ad
            conversation = Conversation.objects.create(
                ad_id=ad_id if ad_id else None
            )
            conversation.participants.add(request.user, recipient)
        
        message = Message.objects.create(
            conversation=conversation,
            sender=request.user,
            content=content
        )
        
        conversation.save()  # Update updated_at
        
        # Create notification
        from notifications.models import Notification
        Notification.objects.create(
            recipient=recipient,
            notification_type='new_message',
            title='Nouveau message',
            message=f'{request.user.get_full_name() or request.user.username} vous a envoyé un message.',
            link=f'/dashboard/messages/{conversation.pk}'
        )
        
        return Response(MessageSerializer(message).data, status=status.HTTP_201_CREATED)


class ConversationMessagesView(generics.ListCreateAPIView):
    """GET/POST /api/messaging/conversations/<id>/messages/ - Messages in a conversation."""
    serializer_class = MessageSerializer
    
    def get_queryset(self):
        return Message.objects.filter(
            conversation_id=self.kwargs['pk'],
            conversation__participants=self.request.user
        )
    
    def perform_create(self, serializer):
        conversation = Conversation.objects.get(
            pk=self.kwargs['pk'],
            participants=self.request.user
        )
        serializer.save(sender=self.request.user, conversation=conversation)
        conversation.save()  # Update updated_at


# CS Views
class CSConversationListView(generics.ListAPIView):
    """GET /api/messaging/cs/all/ - All conversations (CS only)."""
    serializer_class = ConversationListSerializer
    permission_classes = [IsCustomerService]
    queryset = Conversation.objects.all().prefetch_related('participants', 'messages')
