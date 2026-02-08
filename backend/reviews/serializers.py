from rest_framework import serializers
from .models import Review
from accounts.serializers import UserPublicSerializer


class ReviewSerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(source='author.get_full_name', read_only=True)
    author_username = serializers.CharField(source='author.username', read_only=True)
    author_avatar = serializers.ImageField(source='author.avatar', read_only=True)
    
    class Meta:
        model = Review
        fields = '__all__'
        read_only_fields = ['author', 'is_verified', 'provider_response', 'response_date', 'created_at', 'updated_at']
    
    def create(self, validated_data):
        validated_data['author'] = self.context['request'].user
        return super().create(validated_data)


class ReviewResponseSerializer(serializers.ModelSerializer):
    """For providers to respond to reviews."""
    class Meta:
        model = Review
        fields = ['provider_response']
