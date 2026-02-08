from django.contrib import admin
from .models import ServiceCategory, Ad, QuoteRequest


@admin.register(ServiceCategory)
class ServiceCategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug', 'is_active')
    prepopulated_fields = {'slug': ('name',)}


@admin.register(Ad)
class AdAdmin(admin.ModelAdmin):
    list_display = ('title', 'provider', 'category', 'status', 'price', 'price_type', 'city', 'views_count', 'created_at')
    list_filter = ('status', 'category', 'price_type')
    search_fields = ('title', 'description', 'provider__username', 'city')
    prepopulated_fields = {'slug': ('title',)}


@admin.register(QuoteRequest)
class QuoteRequestAdmin(admin.ModelAdmin):
    list_display = ('id', 'ad', 'owner', 'status', 'quoted_price', 'created_at')
    list_filter = ('status',)
    search_fields = ('owner__username', 'ad__title')
