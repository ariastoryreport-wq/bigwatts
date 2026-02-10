"""Data migration: seed France and Canada countries."""
from django.db import migrations


FR_REGIONS = [
    'Auvergne-Rhône-Alpes', 'Bourgogne-Franche-Comté', 'Bretagne',
    'Centre-Val de Loire', 'Corse', 'Grand Est', 'Hauts-de-France',
    'Île-de-France', 'Normandie', 'Nouvelle-Aquitaine', 'Occitanie',
    'Pays de la Loire', "Provence-Alpes-Côte d'Azur",
    'Guadeloupe', 'Guyane', 'La Réunion', 'Martinique', 'Mayotte',
]

CA_REGIONS = [
    'Alberta', 'British Columbia', 'Manitoba', 'New Brunswick',
    'Newfoundland and Labrador', 'Northwest Territories', 'Nova Scotia',
    'Nunavut', 'Ontario', 'Prince Edward Island', 'Quebec',
    'Saskatchewan', 'Yukon',
]


def seed_countries(apps, schema_editor):
    Country = apps.get_model('countries', 'Country')

    Country.objects.get_or_create(code='FR', defaults={
        'name': 'France',
        'name_en': 'France',
        'language': 'fr',
        'currency': 'EUR',
        'currency_symbol': '€',
        'flag_emoji': '🇫🇷',
        'regions': FR_REGIONS,
        'timezone': 'Europe/Paris',
        'is_active': True,
        'sort_order': 0,
    })

    Country.objects.get_or_create(code='CA', defaults={
        'name': 'Canada',
        'name_en': 'Canada',
        'language': 'fr',
        'currency': 'CAD',
        'currency_symbol': '$',
        'flag_emoji': '🇨🇦',
        'regions': CA_REGIONS,
        'timezone': 'America/Toronto',
        'is_active': True,
        'sort_order': 1,
    })


def reverse(apps, schema_editor):
    Country = apps.get_model('countries', 'Country')
    Country.objects.filter(code__in=['FR', 'CA']).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('countries', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(seed_countries, reverse),
    ]
