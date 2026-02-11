from rest_framework import serializers
from .models import Country, Location


class CountrySerializer(serializers.ModelSerializer):
    class Meta:
        model = Country
        fields = [
            'id', 'code', 'name', 'name_en', 'language',
            'currency', 'currency_symbol', 'flag_emoji',
            'regions', 'timezone',
        ]


class LocationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Location
        fields = [
            'id', 'country_code', 'city_name', 'postal_code',
            'region_name', 'region_code', 'population',
            'latitude', 'longitude',
        ]
