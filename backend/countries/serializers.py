from rest_framework import serializers
from .models import Country


class CountrySerializer(serializers.ModelSerializer):
    class Meta:
        model = Country
        fields = [
            'id', 'code', 'name', 'name_en', 'language',
            'currency', 'currency_symbol', 'flag_emoji',
            'regions', 'timezone',
        ]
