from django.contrib import admin
from .models import AvailabilitySlot, Booking, Payment


@admin.register(AvailabilitySlot)
class AvailabilitySlotAdmin(admin.ModelAdmin):
    list_display = ('provider', 'start', 'end', 'is_booked', 'created_at')
    list_filter = ('is_booked', 'provider')
    search_fields = ('provider__username', 'provider__first_name', 'provider__last_name')
    ordering = ('start',)


class PaymentInline(admin.TabularInline):
    model = Payment
    extra = 0
    readonly_fields = ('stripe_payment_intent_id', 'amount', 'platform_fee', 'status', 'created_at')


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = ('id', 'quote', 'homeowner', 'provider', 'status', 'created_at')
    list_filter = ('status',)
    search_fields = (
        'homeowner__username', 'homeowner__first_name',
        'provider__username', 'provider__first_name',
        'quote__ad__title',
    )
    readonly_fields = ('created_at', 'updated_at')
    inlines = [PaymentInline]


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ('id', 'booking', 'amount', 'platform_fee', 'payment_type', 'status', 'created_at')
    list_filter = ('status', 'payment_type')
    search_fields = ('stripe_payment_intent_id', 'booking__quote__ad__title')
    readonly_fields = ('created_at', 'updated_at')
