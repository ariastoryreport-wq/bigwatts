"""Seed script: create demo data for BigWatts marketplace."""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bigwatts.settings')
django.setup()

from django.contrib.auth import get_user_model
from ads.models import ServiceCategory, Ad
from accounts.models import PrestaireProfile, ProprietaireProfile

User = get_user_model()


def seed():
    print("🌱 Seeding BigWatts database...")

    # --- Categories ---
    categories_data = [
        {'name': 'Panneaux Solaires', 'slug': 'panneaux-solaires', 'icon': 'sun', 'description': 'Installation et maintenance de panneaux solaires photovoltaïques et thermiques.'},
        {'name': 'Bornes de Recharge', 'slug': 'bornes-recharge', 'icon': 'zap', 'description': 'Installation de bornes de recharge pour véhicules électriques.'},
        {'name': 'Pompe à Chaleur', 'slug': 'pompe-chaleur', 'icon': 'thermometer', 'description': 'Installation et entretien de pompes à chaleur air/eau et air/air.'},
        {'name': 'Isolation Thermique', 'slug': 'isolation', 'icon': 'home', 'description': 'Travaux d\'isolation thermique : murs, combles, planchers.'},
        {'name': 'Chauffe-eau Thermodynamique', 'slug': 'chauffe-eau-thermo', 'icon': 'droplet', 'description': 'Installation de chauffe-eau thermodynamiques.'},
        {'name': 'Éolienne Domestique', 'slug': 'eolienne', 'icon': 'wind', 'description': 'Installation de petites éoliennes domestiques.'},
        {'name': 'Audit Énergétique', 'slug': 'audit-energetique', 'icon': 'clipboard', 'description': 'Réalisation d\'audits énergétiques et DPE.'},
        {'name': 'Batterie de Stockage', 'slug': 'batterie-stockage', 'icon': 'battery', 'description': 'Installation de batteries de stockage d\'énergie.'},
    ]
    
    categories = {}
    for cat_data in categories_data:
        cat, _ = ServiceCategory.objects.get_or_create(slug=cat_data['slug'], defaults=cat_data)
        categories[cat.slug] = cat
        print(f"  ✅ Catégorie: {cat.name}")

    # --- Admin user ---
    if not User.objects.filter(username='admin').exists():
        User.objects.create_superuser('admin', 'admin@bigwatts.fr', 'admin123', role='customer_service')
        print("  ✅ Admin créé (admin / admin123)")

    # --- CS User ---
    cs_user, created = User.objects.get_or_create(
        username='support',
        defaults={
            'email': 'support@bigwatts.fr', 'role': 'customer_service',
            'first_name': 'Marie', 'last_name': 'Support',
            'city': 'Paris', 'postal_code': '75001',
        }
    )
    if created:
        cs_user.set_password('support123')
        cs_user.save()
        print("  ✅ CS créé (support / support123)")

    # --- Prestataires ---
    providers_data = [
        {
            'username': 'solarpro', 'email': 'solar@demo.fr',
            'first_name': 'Jean', 'last_name': 'Dupont',
            'city': 'Lyon', 'postal_code': '69001',
            'bio': 'Expert en installation de panneaux solaires depuis 10 ans.',
            'profile': {
                'company_name': 'SolarPro Lyon',
                'siret': '12345678901234', 'years_experience': 10,
                'certifications': 'RGE QualiPV, QualiSol',
                'specialties': 'Photovoltaïque, Solaire thermique, Autoconsommation',
                'is_available': True, 'average_rating': 4.5, 'completed_projects': 150
            }
        },
        {
            'username': 'ecocharge', 'email': 'eco@demo.fr',
            'first_name': 'Sophie', 'last_name': 'Martin',
            'city': 'Paris', 'postal_code': '75008',
            'bio': 'Spécialiste bornes de recharge et mobilité électrique.',
            'profile': {
                'company_name': 'EcoCharge Paris',
                'years_experience': 5,
                'certifications': 'IRVE, Habilitation électrique',
                'specialties': 'Bornes résidentielles, Bornes copropriété, Wallbox',
                'is_available': True, 'average_rating': 4.8, 'completed_projects': 200
            }
        },
        {
            'username': 'thermexpert', 'email': 'therm@demo.fr',
            'first_name': 'Pierre', 'last_name': 'Bernard',
            'city': 'Marseille', 'postal_code': '13001',
            'bio': 'Installateur certifié de pompes à chaleur et systèmes thermodynamiques.',
            'profile': {
                'company_name': 'ThermExpert PACA',
                'years_experience': 15,
                'certifications': 'RGE QualiPAC, Qualibat',
                'specialties': 'PAC air/eau, PAC air/air, Chauffe-eau thermodynamique',
                'is_available': True, 'average_rating': 4.3, 'completed_projects': 320
            }
        },
    ]
    
    providers = []
    for pdata in providers_data:
        profile_data = pdata.pop('profile')
        user, created = User.objects.get_or_create(
            username=pdata['username'],
            defaults={**pdata, 'role': 'prestataire'}
        )
        if created:
            user.set_password('demo1234')
            user.save()
            PrestaireProfile.objects.create(user=user, **profile_data)
            print(f"  ✅ Prestataire: {user.username}")
        providers.append(user)

    # --- Propriétaires ---
    owners_data = [
        {
            'username': 'proprietaire1', 'email': 'proprio1@demo.fr',
            'first_name': 'Alice', 'last_name': 'Leroy',
            'city': 'Lyon', 'postal_code': '69003',
            'bio': 'Propriétaire d\'une maison individuelle, intéressée par le solaire.',
            'profile': {'property_type': 'maison', 'property_surface': 120, 'energy_interests': 'Solaire, Isolation'}
        },
        {
            'username': 'proprietaire2', 'email': 'proprio2@demo.fr',
            'first_name': 'Thomas', 'last_name': 'Moreau',
            'city': 'Paris', 'postal_code': '75015',
            'bio': 'Cherche à installer une borne de recharge en copropriété.',
            'profile': {'property_type': 'appartement', 'property_surface': 80, 'energy_interests': 'Borne de recharge, Économie d\'énergie'}
        },
    ]
    
    owners = []
    for odata in owners_data:
        profile_data = odata.pop('profile')
        user, created = User.objects.get_or_create(
            username=odata['username'],
            defaults={**odata, 'role': 'proprietaire'}
        )
        if created:
            user.set_password('demo1234')
            user.save()
            ProprietaireProfile.objects.create(user=user, **profile_data)
            print(f"  ✅ Propriétaire: {user.username}")
        owners.append(user)

    # --- Annonces ---
    ads_data = [
        {
            'provider': providers[0], 'category': categories['panneaux-solaires'],
            'title': 'Installation Panneaux Solaires - Résidentiel',
            'slug': 'installation-panneaux-solaires-residentiel',
            'description': 'Installation complète de panneaux solaires photovoltaïques pour maisons individuelles. Étude de faisabilité, dimensionnement, installation et mise en service. Accompagnement dans les démarches administratives et aides financières (MaPrimeRénov\', prime autoconsommation).',
            'short_description': 'Installation solaire clé en main pour votre maison avec accompagnement aides.',
            'price': 8500, 'price_type': 'fixed', 'city': 'Lyon', 'postal_code': '69001',
            'service_area': 'Rhône-Alpes', 'status': 'active',
            'duration_estimate': '2-3 jours', 'warranty_info': 'Garantie 20 ans sur les panneaux, 10 ans sur l\'onduleur',
        },
        {
            'provider': providers[0], 'category': categories['panneaux-solaires'],
            'title': 'Autoconsommation Solaire + Batterie',
            'slug': 'autoconsommation-solaire-batterie',
            'description': 'Solution complète d\'autoconsommation avec panneaux solaires et batterie de stockage. Maximisez votre indépendance énergétique.',
            'short_description': 'Autoconsommation solaire avec batterie de stockage intégrée.',
            'price': 15000, 'price_type': 'fixed', 'city': 'Lyon',
            'service_area': 'Rhône-Alpes', 'status': 'active',
            'duration_estimate': '3-5 jours',
        },
        {
            'provider': providers[1], 'category': categories['bornes-recharge'],
            'title': 'Borne de Recharge Wallbox - Maison',
            'slug': 'borne-recharge-wallbox-maison',
            'description': 'Installation de borne de recharge Wallbox pour véhicule électrique en maison individuelle. Compatible toutes marques. Installation aux normes NF C 15-100.',
            'short_description': 'Borne de recharge résidentielle Wallbox, installation en 1 journée.',
            'price': 1500, 'price_type': 'fixed', 'city': 'Paris',
            'service_area': 'Île-de-France', 'status': 'active',
            'duration_estimate': '1 jour',
        },
        {
            'provider': providers[1], 'category': categories['bornes-recharge'],
            'title': 'Borne de Recharge Copropriété',
            'slug': 'borne-recharge-copropriete',
            'description': 'Solution de recharge pour copropriétés. Étude technique, dimensionnement, installation et gestion. Droit à la prise respecté.',
            'short_description': 'Solution complète de recharge pour copropriétés et parkings collectifs.',
            'price': None, 'price_type': 'quote', 'city': 'Paris',
            'service_area': 'Île-de-France', 'status': 'active',
        },
        {
            'provider': providers[2], 'category': categories['pompe-chaleur'],
            'title': 'Pompe à Chaleur Air/Eau',
            'slug': 'pompe-chaleur-air-eau',
            'description': 'Installation de pompe à chaleur air/eau pour chauffage et eau chaude sanitaire. Remplacement de chaudière fioul ou gaz. Éligible MaPrimeRénov\' et CEE.',
            'short_description': 'PAC air/eau pour chauffage et ECS, éligible aux aides de l\'État.',
            'price': 12000, 'price_type': 'fixed', 'city': 'Marseille',
            'service_area': 'PACA', 'status': 'active',
            'duration_estimate': '2-4 jours', 'warranty_info': 'Garantie 5 ans pièces et main d\'œuvre',
        },
        {
            'provider': providers[2], 'category': categories['chauffe-eau-thermo'],
            'title': 'Chauffe-eau Thermodynamique',
            'slug': 'chauffe-eau-thermodynamique',
            'description': 'Installation de chauffe-eau thermodynamique. Jusqu\'à 70% d\'économie sur l\'eau chaude par rapport à un cumulus électrique.',
            'short_description': 'Chauffe-eau thermodynamique pour des économies sur votre eau chaude.',
            'price': 3500, 'price_type': 'fixed', 'city': 'Marseille',
            'service_area': 'PACA', 'status': 'active',
            'duration_estimate': '1 jour',
        },
    ]
    
    for ad_data in ads_data:
        ad, created = Ad.objects.get_or_create(
            slug=ad_data['slug'],
            defaults=ad_data
        )
        if created:
            print(f"  ✅ Annonce: {ad.title}")

    print("\n🎉 Seed terminé!")
    print("\n📋 Comptes de démo:")
    print("   Admin:        admin / admin123")
    print("   CS:           support / support123")
    print("   Prestataire:  solarpro / demo1234")
    print("   Prestataire:  ecocharge / demo1234")
    print("   Prestataire:  thermexpert / demo1234")
    print("   Propriétaire: proprietaire1 / demo1234")
    print("   Propriétaire: proprietaire2 / demo1234")


if __name__ == '__main__':
    seed()
