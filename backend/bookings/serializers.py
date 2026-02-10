from rest_framework import serializers
from .models import AvailabilitySlot, Booking, Payment


class AvailabilitySlotSerializer(serializers.ModelSerializer):
    class Meta:
        model = AvailabilitySlot
        fields = ['id', 'provider', 'start', 'end', 'is_booked', 'created_at']
        read_only_fields = ['provider', 'is_booked', 'created_at']

    def create(self, validated_data):
        validated_data['provider'] = self.context['request'].user
        return super().create(validated_data)


class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = [
            'id', 'booking', 'stripe_payment_intent_id', 'amount',
            'platform_fee', 'payment_type', 'status', 'created_at'
        ]
        read_only_fields = ['id', 'stripe_payment_intent_id', 'platform_fee', 'status', 'created_at']


class BookingSerializer(serializers.ModelSerializer):
    homeowner_name = serializers.CharField(source='homeowner.get_full_name', read_only=True)
    provider_name = serializers.CharField(source='provider.get_full_name', read_only=True)
    ad_title = serializers.CharField(source='quote.ad.title', read_only=True)
    quoted_price = serializers.DecimalField(
        source='quote.quoted_price', max_digits=10, decimal_places=2, read_only=True
    )
    deposit_amount = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    slot_details = AvailabilitySlotSerializer(source='slot', read_only=True)
    payments = PaymentSerializer(many=True, read_only=True)
    quote_status = serializers.CharField(source='quote.status', read_only=True)

    class Meta:
        model = Booking
        fields = [
            'id', 'quote', 'homeowner', 'provider',
            'homeowner_name', 'provider_name', 'ad_title',
            'quoted_price', 'deposit_amount',
            'slot', 'slot_details', 'status', 'notes',
            'payments', 'quote_status',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'homeowner', 'provider', 'status',
            'created_at', 'updated_at'
        ]


class BookingCreateSerializer(serializers.Serializer):
    """Create a booking from an accepted quote + slot selection."""
    quote_id = serializers.IntegerField()
    slot_id = serializers.IntegerField()
    notes = serializers.CharField(required=False, allow_blank=True, default='')
