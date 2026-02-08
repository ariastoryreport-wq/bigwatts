from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, PrestaireProfile, ProprietaireProfile


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ('username', 'email', 'role', 'is_verified', 'is_active', 'created_at')
    list_filter = ('role', 'is_verified', 'is_active')
    search_fields = ('username', 'email', 'first_name', 'last_name', 'city')
    fieldsets = BaseUserAdmin.fieldsets + (
        ('BigWatts', {'fields': ('role', 'phone', 'avatar', 'city', 'postal_code', 'address', 'bio', 'is_verified')}),
    )


@admin.register(PrestaireProfile)
class PrestataireProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'company_name', 'is_available', 'average_rating', 'completed_projects')
    list_filter = ('is_available',)
    search_fields = ('user__username', 'company_name')


@admin.register(ProprietaireProfile)
class ProprietaireProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'property_type', 'property_surface')
    list_filter = ('property_type',)
