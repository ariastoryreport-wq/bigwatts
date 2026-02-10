from django.contrib import admin
from .models import IncentiveProgram


@admin.register(IncentiveProgram)
class IncentiveProgramAdmin(admin.ModelAdmin):
    list_display = ['name', 'provider_type', 'country', 'region', 'discount_percent', 'max_amount', 'active', 'last_verified_date']
    list_filter = ['active', 'provider_type', 'country']
    search_fields = ['name', 'description', 'region']
    list_editable = ['active']
    ordering = ['-active', '-discount_percent']
    fieldsets = (
        ('Informations générales', {
            'fields': ('name', 'provider_type', 'country', 'region', 'description', 'official_url')
        }),
        ('Éligibilité', {
            'fields': ('installation_types', 'property_types', 'income_min', 'income_max', 'eligibility_rules')
        }),
        ('Montants', {
            'fields': ('discount_percent', 'max_amount')
        }),
        ('Statut', {
            'fields': ('active', 'last_verified_date')
        }),
    )
