from rest_framework import serializers
from .models import Conversation, Message
from accounts.serializers import UserPublicSerializer


class MessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.CharField(source='sender.get_full_name', read_only=True)
    sender_username = serializers.CharField(source='sender.username', read_only=True)
    
    class Meta:
        model = Message
        fields = ['id', 'conversation', 'sender', 'sender_name', 'sender_username', 'content', 'is_read', 'created_at']
        read_only_fields = ['sender', 'is_read', 'created_at']


class ConversationListSerializer(serializers.ModelSerializer):
    participants = UserPublicSerializer(many=True, read_only=True)
    last_message = MessageSerializer(read_only=True)
    unread_count = serializers.SerializerMethodField()
    ad_title = serializers.CharField(source='ad.title', read_only=True, default=None)
    
    class Meta:
        model = Conversation
        fields = ['id', 'participants', 'ad', 'ad_title', 'last_message', 'unread_count', 'created_at', 'updated_at']
    
    def get_unread_count(self, obj):
        user = self.context['request'].user
        return obj.messages.filter(is_read=False).exclude(sender=user).count()


class ConversationDetailSerializer(serializers.ModelSerializer):
    participants = UserPublicSerializer(many=True, read_only=True)
    messages = MessageSerializer(many=True, read_only=True)
    ad_title = serializers.CharField(source='ad.title', read_only=True, default=None)
    
    class Meta:
        model = Conversation
        fields = ['id', 'participants', 'ad', 'ad_title', 'messages', 'created_at']


class SendMessageSerializer(serializers.Serializer):
    recipient_id = serializers.IntegerField(required=False)
    ad_id = serializers.IntegerField(required=False)
    content = serializers.CharField()
