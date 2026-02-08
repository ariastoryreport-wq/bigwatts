from rest_framework import serializers
from .models import ServiceCategory, Ad, QuoteRequest
from accounts.serializers import UserPublicSerializer


class ServiceCategorySerializer(serializers.ModelSerializer):
    ad_count = serializers.SerializerMethodField()
    
    class Meta:
        model = ServiceCategory
        fields = ['id', 'name', 'slug', 'description', 'icon', 'ad_count']
    
    def get_ad_count(self, obj):
        return obj.ads.filter(status='active').count()


class AdListSerializer(serializers.ModelSerializer):
    provider_name = serializers.CharField(source='provider.get_full_name', read_only=True)
    provider_username = serializers.CharField(source='provider.username', read_only=True)
    provider_avatar = serializers.ImageField(source='provider.avatar', read_only=True)
    provider_rating = serializers.DecimalField(
        source='provider.prestataire_profile.average_rating',
        max_digits=3, decimal_places=2, read_only=True, default=0
    )
    category_name = serializers.CharField(source='category.name', read_only=True)
    
    class Meta:
        model = Ad
        fields = [
            'id', 'title', 'slug', 'short_description', 'price', 'price_type',
            'city', 'status', 'image_1', 'category', 'category_name',
            'provider', 'provider_name', 'provider_username', 'provider_avatar',
            'provider_rating', 'views_count', 'created_at'
        ]


class AdDetailSerializer(serializers.ModelSerializer):
    provider = UserPublicSerializer(read_only=True)
    category_detail = ServiceCategorySerializer(source='category', read_only=True)
    reviews_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Ad
        fields = '__all__'
        read_only_fields = ['provider', 'views_count', 'inquiries_count', 'created_at', 'updated_at']
    
    def get_reviews_count(self, obj):
        return obj.reviews.count()


class AdCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Ad
        fields = [
            'title', 'slug', 'category', 'description', 'short_description',
            'price', 'price_type', 'city', 'postal_code', 'service_area',
            'status', 'image_1', 'image_2', 'image_3',
            'duration_estimate', 'warranty_info', 'requirements'
        ]
    
    def create(self, validated_data):
        validated_data['provider'] = self.context['request'].user
        return super().create(validated_data)


class QuoteRequestSerializer(serializers.ModelSerializer):
    owner_name = serializers.CharField(source='owner.get_full_name', read_only=True)
    owner_username = serializers.CharField(source='owner.username', read_only=True)
    ad_title = serializers.CharField(source='ad.title', read_only=True)
    
    class Meta:
        model = QuoteRequest
        fields = '__all__'
        read_only_fields = ['owner', 'created_at', 'updated_at']
    
    def create(self, validated_data):
        validated_data['owner'] = self.context['request'].user
        return super().create(validated_data)


class QuoteResponseSerializer(serializers.ModelSerializer):
    """For providers to respond to quote requests."""
    class Meta:
        model = QuoteRequest
        fields = ['status', 'provider_response', 'quoted_price']
