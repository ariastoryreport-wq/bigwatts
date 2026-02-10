from rest_framework import serializers
from .models import IncentiveProgram


class IncentiveProgramSerializer(serializers.ModelSerializer):
    class Meta:
        model = IncentiveProgram
        fields = [
            'id', 'name', 'provider_type', 'country', 'region',
            'installation_types', 'property_types',
            'income_min', 'income_max',
            'discount_percent', 'max_amount',
            'description', 'official_url',
            'eligibility_rules', 'last_verified_date',
        ]


class EligibilityCheckSerializer(serializers.Serializer):
    """Validates the wizard form payload before matching."""
    country = serializers.CharField(max_length=10, default='FR')
    region = serializers.CharField(max_length=200, required=False, allow_blank=True, default='')
    installation_type = serializers.ChoiceField(choices=[
        ('solar', 'Panneaux solaires'),
        ('heat_pump', 'Pompe à chaleur'),
        ('ev_charger', 'Borne de recharge'),
        ('insulation', 'Isolation'),
        ('battery', 'Batterie de stockage'),
        ('wind', 'Éolienne'),
    ])
    property_type = serializers.ChoiceField(choices=[
        ('house', 'Maison individuelle'),
        ('apartment', 'Appartement'),
        ('commercial', 'Local commercial'),
        ('other', 'Autre'),
    ])
    is_owner = serializers.BooleanField(default=True)
    annual_income = serializers.DecimalField(
        max_digits=12, decimal_places=2, required=False, allow_null=True, default=None,
    )
    estimated_budget = serializers.DecimalField(
        max_digits=12, decimal_places=2, required=False, allow_null=True, default=None,
    )
