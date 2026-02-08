from rest_framework import serializers
from .models import Favorite


class FavoriteSerializer(serializers.ModelSerializer):
    provider_name = serializers.CharField(source='provider.get_full_name', read_only=True, default=None)
    provider_username = serializers.CharField(source='provider.username', read_only=True, default=None)
    ad_title = serializers.CharField(source='ad.title', read_only=True, default=None)
    
    class Meta:
        model = Favorite
        fields = ['id', 'user', 'provider', 'provider_name', 'provider_username', 'ad', 'ad_title', 'created_at']
        read_only_fields = ['user', 'created_at']
    
    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)
