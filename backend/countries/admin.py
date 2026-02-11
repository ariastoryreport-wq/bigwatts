from django.contrib import admin
from .models import Country, Location


@admin.register(Country)
class CountryAdmin(admin.ModelAdmin):
    list_display = ['flag_emoji', 'name', 'code', 'currency', 'language', 'is_active', 'sort_order']
    list_filter = ['is_active', 'language', 'currency']
    search_fields = ['name', 'code', 'name_en']
    list_editable = ['is_active', 'sort_order']
    ordering = ['sort_order', 'name']


@admin.register(Location)
class LocationAdmin(admin.ModelAdmin):
    list_display = ['city_name', 'postal_code', 'region_code', 'country_code', 'population']
    list_filter = ['country_code', 'region_code']
    search_fields = ['city_name', 'postal_code']
    ordering = ['-population']
