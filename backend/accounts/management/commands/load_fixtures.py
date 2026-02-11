"""
BigWatts — Django management command to load demo fixtures.
Usage: python manage.py load_fixtures
"""
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from ads.models import ServiceCategory, Ad
from accounts.models import PrestaireProfile, ProprietaireProfile, ProviderBadge, UserBadge
from reviews.models import Review
from countries.models import Country

User = get_user_model()


class Command(BaseCommand):
    help = 'Load demo fixtures: categories, users, ads, reviews, and badges'

    def handle(self, *args, **options):
        self.stdout.write('🌱 Chargement des fixtures BigWatts...\n')
        self._categories()
        self._staff()
        providers = self._providers()
        owners = self._owners()
        self._ads(providers)
        self._reviews(providers, owners)
        self._badges(providers)
        self._assign_countries()
        self.stdout.write(self.style.SUCCESS('\n🎉 Fixtures chargées avec succès!'))
        self._print_accounts()

    # ──────────────────── Categories ────────────────────

    def _categories(self):
        data = [
            {'name': 'Panneaux Solaires', 'slug': 'panneaux-solaires', 'icon': 'sun',
             'description': 'Installation et maintenance de panneaux solaires photovoltaïques et thermiques.'},
            {'name': 'Bornes de Recharge', 'slug': 'bornes-recharge', 'icon': 'zap',
             'description': 'Installation de bornes de recharge pour véhicules électriques.'},
            {'name': 'Pompe à Chaleur', 'slug': 'pompe-chaleur', 'icon': 'thermometer',
             'description': 'Installation et entretien de pompes à chaleur air/eau et air/air.'},
            {'name': 'Isolation Thermique', 'slug': 'isolation', 'icon': 'home',
             'description': "Travaux d'isolation thermique : murs, combles, planchers."},
            {'name': 'Chauffe-eau Thermodynamique', 'slug': 'chauffe-eau-thermo', 'icon': 'droplet',
             'description': 'Installation de chauffe-eau thermodynamiques.'},
            {'name': 'Éolienne Domestique', 'slug': 'eolienne', 'icon': 'wind',
             'description': 'Installation de petites éoliennes domestiques.'},
            {'name': 'Audit Énergétique', 'slug': 'audit-energetique', 'icon': 'clipboard',
             'description': "Réalisation d'audits énergétiques et DPE."},
            {'name': 'Batterie de Stockage', 'slug': 'batterie-stockage', 'icon': 'battery',
             'description': "Installation de batteries de stockage d'énergie."},
        ]
        for d in data:
            ServiceCategory.objects.get_or_create(slug=d['slug'], defaults=d)
        self.stdout.write(f'  ✅ {len(data)} catégories')

    # ──────────────────── Staff ────────────────────

    def _staff(self):
        if not User.objects.filter(username='admin').exists():
            User.objects.create_superuser('admin', 'admin@bigwatts.fr', 'admin123', role='customer_service')
        cs, created = User.objects.get_or_create(username='support', defaults={
            'email': 'support@bigwatts.fr', 'role': 'customer_service',
            'first_name': 'Marie', 'last_name': 'Dupuis', 'city': 'Paris', 'postal_code': '75001',
        })
        if created:
            cs.set_password('support123')
            cs.save()
        self.stdout.write('  ✅ Admin + Support')

    # ──────────────────── Prestataires ────────────────────

    def _providers(self):
        providers_data = [
            {
                'user': {'username': 'solarpro', 'email': 'jean.dupont@solarpro.fr',
                         'first_name': 'Jean', 'last_name': 'Dupont',
                         'city': 'Lyon', 'postal_code': '69001', 'phone': '06 12 34 56 78',
                         'bio': "Expert en installation de panneaux solaires depuis 10 ans. Certifié RGE, nous accompagnons les particuliers et professionnels dans leur transition énergétique."},
                'profile': {'company_name': 'SolarPro Lyon', 'siret': '12345678901234',
                            'years_experience': 10, 'service_radius_km': 80,
                            'certifications': 'RGE QualiPV, QualiSol, Qualibat',
                            'specialties': 'Photovoltaïque, Solaire thermique, Autoconsommation',
                            'is_available': True, 'average_rating': 4.5, 'completed_projects': 150},
            },
            {
                'user': {'username': 'ecocharge', 'email': 'sophie.martin@ecocharge.fr',
                         'first_name': 'Sophie', 'last_name': 'Martin',
                         'city': 'Paris', 'postal_code': '75008', 'phone': '06 23 45 67 89',
                         'bio': "Spécialiste de la mobilité électrique. Installation de bornes de recharge pour particuliers et copropriétés en Île-de-France."},
                'profile': {'company_name': 'EcoCharge Paris', 'siret': '23456789012345',
                            'years_experience': 5, 'service_radius_km': 60,
                            'certifications': 'IRVE, Habilitation électrique BR',
                            'specialties': 'Bornes résidentielles, Copropriété, Wallbox, Tesla',
                            'is_available': True, 'average_rating': 4.8, 'completed_projects': 200},
            },
            {
                'user': {'username': 'thermexpert', 'email': 'pierre.bernard@thermexpert.fr',
                         'first_name': 'Pierre', 'last_name': 'Bernard',
                         'city': 'Marseille', 'postal_code': '13001', 'phone': '06 34 56 78 90',
                         'bio': "Installateur certifié de pompes à chaleur et systèmes thermodynamiques en région PACA. 15 ans d'expérience."},
                'profile': {'company_name': 'ThermExpert PACA', 'siret': '34567890123456',
                            'years_experience': 15, 'service_radius_km': 100,
                            'certifications': 'RGE QualiPAC, Qualibat, Qualit\'EnR',
                            'specialties': 'PAC air/eau, PAC air/air, Chauffe-eau thermodynamique',
                            'is_available': True, 'average_rating': 4.3, 'completed_projects': 320},
            },
            {
                'user': {'username': 'isoconfort', 'email': 'nathalie.roux@isoconfort.fr',
                         'first_name': 'Nathalie', 'last_name': 'Roux',
                         'city': 'Toulouse', 'postal_code': '31000', 'phone': '06 45 67 89 01',
                         'bio': "Entreprise familiale spécialisée dans l'isolation thermique depuis 20 ans. Nous intervenons dans toute la région Occitanie."},
                'profile': {'company_name': 'IsoConfort Occitanie', 'siret': '45678901234567',
                            'years_experience': 20, 'service_radius_km': 120,
                            'certifications': 'RGE Qualibat, Certibat, Pros de la performance énergétique',
                            'specialties': 'ITE, Combles perdus, Combles aménagés, Planchers bas',
                            'is_available': True, 'average_rating': 4.6, 'completed_projects': 450},
            },
            {
                'user': {'username': 'greenenergy', 'email': 'marc.lefevre@greenenergy.fr',
                         'first_name': 'Marc', 'last_name': 'Lefèvre',
                         'city': 'Bordeaux', 'postal_code': '33000', 'phone': '06 56 78 90 12',
                         'bio': "Ingénieur de formation, passionné par les énergies renouvelables. Audits énergétiques et solutions sur mesure pour réduire votre empreinte carbone."},
                'profile': {'company_name': 'GreenEnergy Conseil', 'siret': '56789012345678',
                            'years_experience': 8, 'service_radius_km': 70,
                            'certifications': 'DPE, Audit RGE, Certification OPQIBI',
                            'specialties': 'Audit énergétique, DPE, Conseil en rénovation, AMO',
                            'is_available': True, 'average_rating': 4.9, 'completed_projects': 180},
            },
            {
                'user': {'username': 'voltamaison', 'email': 'lucas.garcia@voltamaison.fr',
                         'first_name': 'Lucas', 'last_name': 'Garcia',
                         'city': 'Nice', 'postal_code': '06000', 'phone': '06 67 89 01 23',
                         'bio': "Solutions complètes d'autoconsommation solaire avec stockage batterie sur la Côte d'Azur. Devis gratuit sous 48h."},
                'profile': {'company_name': 'VoltaMaison Côte d\'Azur', 'siret': '67890123456789',
                            'years_experience': 6, 'service_radius_km': 50,
                            'certifications': 'RGE QualiPV, Certification Tesla Powerwall',
                            'specialties': 'Autoconsommation, Batterie de stockage, Domotique solaire',
                            'is_available': True, 'average_rating': 4.7, 'completed_projects': 95},
            },
            {
                'user': {'username': 'eolvert', 'email': 'julie.morel@eolvert.fr',
                         'first_name': 'Julie', 'last_name': 'Morel',
                         'city': 'Nantes', 'postal_code': '44000', 'phone': '06 78 90 12 34',
                         'bio': "Pionnière de l'éolien domestique en France. Installation de petites éoliennes pour particuliers et exploitations agricoles."},
                'profile': {'company_name': 'ÉolVert Atlantique', 'siret': '78901234567890',
                            'years_experience': 12, 'service_radius_km': 150,
                            'certifications': 'Qualibat, Étude de vent certifiée',
                            'specialties': 'Éolienne domestique, Éolienne agricole, Hybride solaire-éolien',
                            'is_available': True, 'average_rating': 4.4, 'completed_projects': 65},
            },
            {
                'user': {'username': 'heatpump_pro', 'email': 'alexandre.petit@heatpumppro.fr',
                         'first_name': 'Alexandre', 'last_name': 'Petit',
                         'city': 'Strasbourg', 'postal_code': '67000', 'phone': '06 89 01 23 45',
                         'bio': "Spécialiste pompes à chaleur géothermiques et aérothermiques. Intervention en Alsace et Lorraine."},
                'profile': {'company_name': 'HeatPump Pro Alsace', 'siret': '89012345678901',
                            'years_experience': 11, 'service_radius_km': 90,
                            'certifications': 'RGE QualiPAC, Qualibat, NF PAC',
                            'specialties': 'Géothermie, PAC air/eau haute température, Plancher chauffant',
                            'is_available': True, 'average_rating': 4.5, 'completed_projects': 210},
            },
        ]

        # City coordinates for providers
        PROV_COORDS = {
            'Lyon': (45.7640, 4.8357), 'Paris': (48.8566, 2.3522),
            'Marseille': (43.2965, 5.3698), 'Toulouse': (43.6047, 1.4442),
            'Bordeaux': (44.8378, -0.5792), 'Nice': (43.7102, 7.2620),
            'Nantes': (47.2184, -1.5536), 'Strasbourg': (48.5734, 7.7521),
        }

        providers = []
        for pdata in providers_data:
            user_data = pdata['user']
            profile_data = pdata['profile']
            # Add coordinates
            city = user_data.get('city', '')
            if city in PROV_COORDS:
                user_data['latitude'], user_data['longitude'] = PROV_COORDS[city]
            user, created = User.objects.get_or_create(
                username=user_data['username'],
                defaults={**user_data, 'role': 'prestataire'}
            )
            if created:
                user.set_password('demo1234')
                user.save()
                PrestaireProfile.objects.create(user=user, **profile_data)
            else:
                # Update coordinates for existing users
                if city in PROV_COORDS and not user.latitude:
                    user.latitude, user.longitude = PROV_COORDS[city]
                    user.save(update_fields=['latitude', 'longitude'])
            providers.append(user)
        self.stdout.write(f'  ✅ {len(providers)} prestataires')
        return providers

    # ──────────────────── Propriétaires ────────────────────

    def _owners(self):
        owners_data = [
            {
                'user': {'username': 'alice_leroy', 'email': 'alice.leroy@email.fr',
                         'first_name': 'Alice', 'last_name': 'Leroy',
                         'city': 'Lyon', 'postal_code': '69003', 'phone': '07 11 22 33 44',
                         'bio': "Propriétaire d'une maison de 120m², intéressée par le solaire."},
                'profile': {'property_type': 'maison', 'property_surface': 120,
                            'energy_interests': 'Panneaux solaires, Batterie de stockage'},
            },
            {
                'user': {'username': 'thomas_moreau', 'email': 'thomas.moreau@email.fr',
                         'first_name': 'Thomas', 'last_name': 'Moreau',
                         'city': 'Paris', 'postal_code': '75015', 'phone': '07 22 33 44 55',
                         'bio': "Copropriétaire cherchant à installer une borne de recharge."},
                'profile': {'property_type': 'appartement', 'property_surface': 80,
                            'energy_interests': 'Borne de recharge, Économie d\'énergie'},
            },
            {
                'user': {'username': 'camille_duval', 'email': 'camille.duval@email.fr',
                         'first_name': 'Camille', 'last_name': 'Duval',
                         'city': 'Bordeaux', 'postal_code': '33200', 'phone': '07 33 44 55 66',
                         'bio': "Grande maison ancienne à rénover, cherche solutions d'isolation et chauffage."},
                'profile': {'property_type': 'maison', 'property_surface': 200,
                            'energy_interests': 'Isolation, Pompe à chaleur, Audit énergétique'},
            },
            {
                'user': {'username': 'emma_lambert', 'email': 'emma.lambert@email.fr',
                         'first_name': 'Emma', 'last_name': 'Lambert',
                         'city': 'Toulouse', 'postal_code': '31400', 'phone': '07 44 55 66 77',
                         'bio': "Maison neuve RT2020, souhaite ajouter des panneaux solaires."},
                'profile': {'property_type': 'maison', 'property_surface': 140,
                            'energy_interests': 'Panneaux solaires, Autoconsommation, Domotique'},
            },
            {
                'user': {'username': 'hugo_simon', 'email': 'hugo.simon@email.fr',
                         'first_name': 'Hugo', 'last_name': 'Simon',
                         'city': 'Marseille', 'postal_code': '13008', 'phone': '07 55 66 77 88',
                         'bio': "Propriétaire d'un commerce, intéressé par l'autoconsommation."},
                'profile': {'property_type': 'commerce', 'property_surface': 300,
                            'energy_interests': 'Autoconsommation, Réduction facture, Panneaux solaires'},
            },
        ]

        owners = []
        for odata in owners_data:
            user_data = odata['user']
            profile_data = odata['profile']
            user, created = User.objects.get_or_create(
                username=user_data['username'],
                defaults={**user_data, 'role': 'proprietaire'}
            )
            if created:
                user.set_password('demo1234')
                user.save()
                ProprietaireProfile.objects.create(user=user, **profile_data)
            owners.append(user)
        self.stdout.write(f'  ✅ {len(owners)} propriétaires')
        return owners

    # ──────────────────── Annonces ────────────────────

    def _ads(self, providers):
        cats = {c.slug: c for c in ServiceCategory.objects.all()}

        # City coordinates (lat, lng) for geo features
        COORDS = {
            'Lyon': (45.7640, 4.8357),
            'Paris': (48.8566, 2.3522),
            'Marseille': (43.2965, 5.3698),
            'Toulouse': (43.6047, 1.4442),
            'Bordeaux': (44.8378, -0.5792),
            'Nice': (43.7102, 7.2620),
            'Nantes': (47.2184, -1.5536),
            'Strasbourg': (48.5734, 7.7521),
        }

        # Unsplash image URLs — green energy theme (free, hotlinkable)
        IMG = {
            'solar_roof': 'https://images.unsplash.com/photo-1509391366360-2e959784a276?w=800&q=80',
            'solar_field': 'https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?w=800&q=80',
            'solar_panels': 'https://images.unsplash.com/photo-1559302504-64aae6ca6b6d?w=800&q=80',
            'ev_charger': 'https://images.unsplash.com/photo-1593941707882-a5bba14938c7?w=800&q=80',
            'ev_station': 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=800&q=80',
            'ev_parking': 'https://images.unsplash.com/photo-1647166545674-ce28ce93bdca?w=800&q=80',
            'heat_pump': 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=800&q=80',
            'heating': 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=800&q=80',
            'hvac': 'https://images.unsplash.com/photo-1631545806609-05fdb2f4e058?w=800&q=80',
            'insulation': 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&q=80',
            'renovation': 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=800&q=80',
            'house_ext': 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=800&q=80',
            'audit': 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80',
            'energy_report': 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80',
            'consult': 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&q=80',
            'battery': 'https://images.unsplash.com/photo-1620714223084-8fcacc6dfd8d?w=800&q=80',
            'wind_turbine': 'https://images.unsplash.com/photo-1532601224476-15c79f2f7a51?w=800&q=80',
            'wind_farm': 'https://images.unsplash.com/photo-1548337138-e87d889cc369?w=800&q=80',
            'eco_house': 'https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=800&q=80',
            'green_city': 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=800&q=80',
        }

        ads_data = [
            # SolarPro (Lyon)
            {'provider': providers[0], 'category': cats['panneaux-solaires'],
             'title': 'Installation Panneaux Solaires - Résidentiel', 'slug': 'installation-panneaux-solaires-residentiel',
             'description': "Installation complète de panneaux solaires photovoltaïques pour maisons individuelles. Étude de faisabilité, dimensionnement, installation et mise en service. Accompagnement dans les démarches administratives et aides financières (MaPrimeRénov', prime autoconsommation).",
             'short_description': 'Installation solaire clé en main pour votre maison avec accompagnement aides.',
             'price': 8500, 'price_type': 'fixed', 'city': 'Lyon', 'postal_code': '69001',
             'service_area': 'Rhône-Alpes', 'status': 'active',
             'image_url': IMG['solar_roof'],
             'duration_estimate': '2-3 jours', 'warranty_info': 'Garantie 20 ans sur les panneaux, 10 ans sur l\'onduleur'},
            {'provider': providers[0], 'category': cats['panneaux-solaires'],
             'title': 'Autoconsommation Solaire avec Batterie', 'slug': 'autoconsommation-solaire-batterie',
             'description': "Solution complète d'autoconsommation avec panneaux solaires et batterie de stockage. Maximisez votre indépendance énergétique et réduisez votre facture jusqu'à 80%.",
             'short_description': 'Autoconsommation solaire avec batterie de stockage intégrée.',
             'price': 15000, 'price_type': 'fixed', 'city': 'Lyon', 'service_area': 'Rhône-Alpes',
             'status': 'active', 'image_url': IMG['solar_field'],
             'duration_estimate': '3-5 jours',
             'warranty_info': 'Garantie 10 ans batterie, 25 ans panneaux'},

            # EcoCharge (Paris)
            {'provider': providers[1], 'category': cats['bornes-recharge'],
             'title': 'Borne de Recharge Wallbox - Maison', 'slug': 'borne-recharge-wallbox-maison',
             'description': "Installation de borne de recharge Wallbox pour véhicule électrique en maison individuelle. Compatible toutes marques (Tesla, Renault, Peugeot...). Installation aux normes NF C 15-100. Mise en service le jour même.",
             'short_description': 'Borne de recharge résidentielle Wallbox, installation en 1 journée.',
             'price': 1500, 'price_type': 'fixed', 'city': 'Paris',
             'service_area': 'Île-de-France', 'status': 'active',
             'image_url': IMG['ev_charger'], 'duration_estimate': '1 jour'},
            {'provider': providers[1], 'category': cats['bornes-recharge'],
             'title': 'Borne de Recharge Copropriété', 'slug': 'borne-recharge-copropriete',
             'description': "Solution de recharge pour copropriétés. Étude technique, dimensionnement, installation et gestion. Droit à la prise respecté. Facturation individuelle possible.",
             'short_description': 'Solution complète de recharge pour copropriétés et parkings collectifs.',
             'price': None, 'price_type': 'quote', 'city': 'Paris',
             'service_area': 'Île-de-France', 'status': 'active',
             'image_url': IMG['ev_station']},
            {'provider': providers[1], 'category': cats['bornes-recharge'],
             'title': 'Borne Rapide pour Entreprise', 'slug': 'borne-rapide-entreprise',
             'description': "Installation de bornes de recharge rapide pour flottes d'entreprise. Jusqu'à 22 kW par point de charge. Gestion et supervision à distance.",
             'short_description': 'Bornes de recharge rapide pour flottes professionnelles.',
             'price': 3500, 'price_type': 'fixed', 'city': 'Paris',
             'service_area': 'Île-de-France', 'status': 'active',
             'image_url': IMG['ev_parking'], 'duration_estimate': '1-2 jours'},

            # ThermExpert (Marseille)
            {'provider': providers[2], 'category': cats['pompe-chaleur'],
             'title': 'Pompe à Chaleur Air/Eau', 'slug': 'pompe-chaleur-air-eau',
             'description': "Installation de pompe à chaleur air/eau pour chauffage et eau chaude sanitaire. Remplacement de chaudière fioul ou gaz. Éligible MaPrimeRénov' et CEE. COP supérieur à 4.",
             'short_description': "PAC air/eau pour chauffage et ECS, éligible aux aides de l'État.",
             'price': 12000, 'price_type': 'fixed', 'city': 'Marseille',
             'service_area': 'PACA', 'status': 'active',
             'image_url': IMG['heat_pump'],
             'duration_estimate': '2-4 jours', 'warranty_info': 'Garantie 5 ans pièces et main d\'œuvre'},
            {'provider': providers[2], 'category': cats['chauffe-eau-thermo'],
             'title': 'Chauffe-eau Thermodynamique', 'slug': 'chauffe-eau-thermodynamique',
             'description': "Installation de chauffe-eau thermodynamique. Jusqu'à 70% d'économie sur l'eau chaude par rapport à un cumulus électrique classique.",
             'short_description': "Chauffe-eau thermodynamique pour des économies sur votre eau chaude.",
             'price': 3500, 'price_type': 'fixed', 'city': 'Marseille',
             'service_area': 'PACA', 'status': 'active',
             'image_url': IMG['heating'], 'duration_estimate': '1 jour'},
            {'provider': providers[2], 'category': cats['pompe-chaleur'],
             'title': 'PAC Air/Air Réversible (Climatisation)', 'slug': 'pac-air-air-reversible',
             'description': "Pompe à chaleur air/air réversible : chauffage en hiver, climatisation en été. Idéale pour le climat méditerranéen. Installation murale ou gainable.",
             'short_description': 'Chauffage et climatisation toute l\'année avec une PAC réversible.',
             'price': 5000, 'price_type': 'fixed', 'city': 'Marseille',
             'service_area': 'PACA', 'status': 'active',
             'image_url': IMG['hvac'], 'duration_estimate': '1-2 jours'},

            # IsoConfort (Toulouse)
            {'provider': providers[3], 'category': cats['isolation'],
             'title': 'Isolation des Combles Perdus', 'slug': 'isolation-combles-perdus',
             'description': "Isolation des combles perdus par soufflage de laine de roche ou ouate de cellulose. Technique rapide et efficace, jusqu'à 30% d'économies de chauffage.",
             'short_description': "Isolation de combles par soufflage, rapide et très efficace.",
             'price': 25, 'price_type': 'hourly', 'city': 'Toulouse',
             'service_area': 'Occitanie', 'status': 'active',
             'image_url': IMG['insulation'], 'duration_estimate': '1 jour'},
            {'provider': providers[3], 'category': cats['isolation'],
             'title': 'Isolation Thermique par l\'Extérieur (ITE)', 'slug': 'isolation-thermique-exterieur',
             'description': "Isolation thermique par l'extérieur : supprime les ponts thermiques, embellit la façade, valorise votre bien immobilier. Enduit ou bardage au choix.",
             'short_description': 'ITE pour supprimer les ponts thermiques et ravaler votre façade.',
             'price': None, 'price_type': 'quote', 'city': 'Toulouse',
             'service_area': 'Occitanie', 'status': 'active',
             'image_url': IMG['house_ext']},
            {'provider': providers[3], 'category': cats['isolation'],
             'title': 'Isolation Plancher Bas', 'slug': 'isolation-plancher-bas',
             'description': "Isolation du plancher bas (cave, vide sanitaire, garage). Réduisez la sensation de sol froid et économisez sur le chauffage.",
             'short_description': 'Isolation du plancher pour un sol chaud et des économies.',
             'price': 40, 'price_type': 'hourly', 'city': 'Toulouse',
             'service_area': 'Occitanie', 'status': 'active',
             'image_url': IMG['renovation'], 'duration_estimate': '1-2 jours'},

            # GreenEnergy (Bordeaux)
            {'provider': providers[4], 'category': cats['audit-energetique'],
             'title': 'Audit Énergétique Complet', 'slug': 'audit-energetique-complet',
             'description': "Audit énergétique réglementaire pour vente de maison ou copropriété. Analyse thermographique, bilan des consommations, recommandations de travaux prioritaires avec estimation budgétaire.",
             'short_description': 'Audit énergétique complet avec thermographie et recommandations.',
             'price': 800, 'price_type': 'fixed', 'city': 'Bordeaux',
             'service_area': 'Nouvelle-Aquitaine', 'status': 'active',
             'image_url': IMG['audit'], 'duration_estimate': '1 jour'},
            {'provider': providers[4], 'category': cats['audit-energetique'],
             'title': 'DPE - Diagnostic de Performance Énergétique', 'slug': 'dpe-diagnostic',
             'description': "Diagnostic de Performance Énergétique obligatoire pour la vente ou la location. Résultat sous 48h. Certifié et accrédité COFRAC.",
             'short_description': 'DPE certifié pour vente ou location, résultat sous 48h.',
             'price': 150, 'price_type': 'fixed', 'city': 'Bordeaux',
             'service_area': 'Nouvelle-Aquitaine', 'status': 'active',
             'image_url': IMG['energy_report'], 'duration_estimate': '2-3 heures'},
            {'provider': providers[4], 'category': cats['audit-energetique'],
             'title': 'Accompagnement Rénovation Globale', 'slug': 'accompagnement-renovation-globale',
             'description': "Assistance à maîtrise d'ouvrage (AMO) pour votre projet de rénovation globale. Coordination des artisans, suivi de chantier, optimisation des aides.",
             'short_description': 'AMO pour rénovation globale : coordination, aides, suivi.',
             'price': None, 'price_type': 'free_estimate', 'city': 'Bordeaux',
             'service_area': 'Nouvelle-Aquitaine', 'status': 'active',
             'image_url': IMG['consult']},

            # VoltaMaison (Nice)
            {'provider': providers[5], 'category': cats['batterie-stockage'],
             'title': 'Batterie de Stockage Tesla Powerwall', 'slug': 'batterie-tesla-powerwall',
             'description': "Installation de batterie Tesla Powerwall 13.5 kWh. Stockez l'énergie de vos panneaux solaires pour l'utiliser la nuit. Monitoring via l'app Tesla.",
             'short_description': 'Tesla Powerwall pour stocker votre énergie solaire.',
             'price': 10000, 'price_type': 'fixed', 'city': 'Nice',
             'service_area': 'Côte d\'Azur', 'status': 'active',
             'image_url': IMG['battery'],
             'duration_estimate': '1 jour', 'warranty_info': 'Garantie Tesla 10 ans'},
            {'provider': providers[5], 'category': cats['panneaux-solaires'],
             'title': 'Kit Solaire Autoconsommation 6 kWc', 'slug': 'kit-solaire-autoconsommation-6kwc',
             'description': "Kit solaire complet 6 kWc avec micro-onduleurs. Production estimée : 7 200 kWh/an sur la Côte d'Azur. Idéal pour une famille de 4 personnes.",
             'short_description': 'Kit solaire 6 kWc clé en main, idéal pour une famille.',
             'price': 11000, 'price_type': 'fixed', 'city': 'Nice',
             'service_area': 'Côte d\'Azur', 'status': 'active',
             'image_url': IMG['solar_panels'],
             'duration_estimate': '2 jours', 'warranty_info': '25 ans panneaux, 20 ans micro-onduleurs'},

            # ÉolVert (Nantes)
            {'provider': providers[6], 'category': cats['eolienne'],
             'title': 'Éolienne Domestique 3 kW', 'slug': 'eolienne-domestique-3kw',
             'description': "Installation d'éolienne domestique 3 kW sur mât de 18m. Étude de vent préalable incluse. Idéal en complément solaire pour les régions ventées.",
             'short_description': 'Éolienne 3 kW pour particulier, étude de vent incluse.',
             'price': 18000, 'price_type': 'fixed', 'city': 'Nantes',
             'service_area': 'Pays de la Loire, Bretagne', 'status': 'active',
             'image_url': IMG['wind_turbine'],
             'duration_estimate': '3-5 jours', 'warranty_info': 'Garantie 15 ans'},
            {'provider': providers[6], 'category': cats['eolienne'],
             'title': 'Système Hybride Solaire + Éolien', 'slug': 'systeme-hybride-solaire-eolien',
             'description': "Système hybride combinant panneaux solaires et éolienne domestique pour une production continue jour et nuit, été comme hiver.",
             'short_description': 'Production continue grâce au duo solaire + éolien.',
             'price': 25000, 'price_type': 'fixed', 'city': 'Nantes',
             'service_area': 'Grand Ouest', 'status': 'active',
             'image_url': IMG['wind_farm'], 'duration_estimate': '5-7 jours'},

            # HeatPump Pro (Strasbourg)
            {'provider': providers[7], 'category': cats['pompe-chaleur'],
             'title': 'PAC Géothermique - Chauffage par le Sol', 'slug': 'pac-geothermique',
             'description': "Pompe à chaleur géothermique avec capteurs verticaux ou horizontaux. Solution idéale pour les hivers rigoureux d'Alsace. COP jusqu'à 5.",
             'short_description': 'Géothermie performante pour les hivers rigoureux.',
             'price': 20000, 'price_type': 'fixed', 'city': 'Strasbourg',
             'service_area': 'Alsace, Lorraine', 'status': 'active',
             'image_url': IMG['eco_house'],
             'duration_estimate': '5-10 jours', 'warranty_info': 'Garantie 5 ans, capteurs 50 ans'},
            {'provider': providers[7], 'category': cats['pompe-chaleur'],
             'title': 'Remplacement Chaudière Fioul par PAC', 'slug': 'remplacement-chaudiere-fioul-pac',
             'description': "Dépose de votre ancienne chaudière fioul et remplacement par une pompe à chaleur air/eau haute température. Éligible aux aides MaPrimeRénov' Sérénité.",
             'short_description': 'Sortez du fioul : remplacement par PAC air/eau.',
             'price': 14000, 'price_type': 'fixed', 'city': 'Strasbourg',
             'service_area': 'Alsace, Lorraine', 'status': 'active',
             'image_url': IMG['green_city'],
             'duration_estimate': '3-4 jours', 'warranty_info': 'Garantie 5 ans pièces et MO'},
        ]

        created_count = 0
        updated_count = 0
        for ad_data in ads_data:
            slug = ad_data['slug']
            # Add coordinates based on city
            city = ad_data.get('city', '')
            if city in COORDS and 'latitude' not in ad_data:
                lat, lng = COORDS[city]
                ad_data['latitude'] = lat + (hash(slug) % 100 - 50) * 0.002  # slight jitter
                ad_data['longitude'] = lng + (hash(slug) % 100 - 50) * 0.002
            _, created = Ad.objects.update_or_create(slug=slug, defaults=ad_data)
            if created:
                created_count += 1
            else:
                updated_count += 1
        self.stdout.write(f'  ✅ {created_count} annonces créées, {updated_count} mises à jour ({len(ads_data)} total)')

    # ──────────────────── Avis ────────────────────

    def _reviews(self, providers, owners):
        reviews_data = [
            {'provider': providers[0], 'author': owners[0], 'rating': 5,
             'title': 'Installation impeccable !',
             'comment': "Jean et son équipe ont fait un travail remarquable. Les panneaux sont bien intégrés au toit, la mise en service a été rapide. Je produis déjà plus que prévu ! Je recommande vivement SolarPro.",
             'quality_rating': 5, 'punctuality_rating': 5, 'price_rating': 4},
            {'provider': providers[0], 'author': owners[2], 'rating': 4,
             'title': 'Très bon travail, délai un peu long',
             'comment': "La qualité de l'installation est top, les panneaux fonctionnent parfaitement. Seul bémol : un peu de retard sur la date prévue. Mais le résultat en vaut la peine.",
             'quality_rating': 5, 'punctuality_rating': 3, 'price_rating': 4},
            {'provider': providers[1], 'author': owners[1], 'rating': 5,
             'title': 'Rapide et efficace',
             'comment': "Sophie a installé ma borne Wallbox en une demi-journée. Tout fonctionne parfaitement avec ma Tesla Model 3. Communication excellente avant et après l'installation.",
             'quality_rating': 5, 'punctuality_rating': 5, 'price_rating': 5},
            {'provider': providers[1], 'author': owners[3], 'rating': 5,
             'title': 'Très professionnelle',
             'comment': "Installation propre, rapide, et Sophie a pris le temps de tout m'expliquer. La borne fonctionne très bien. Je recommande EcoCharge sans hésiter.",
             'quality_rating': 5, 'punctuality_rating': 5, 'price_rating': 4},
            {'provider': providers[2], 'author': owners[4], 'rating': 4,
             'title': 'Bonne PAC, bon suivi',
             'comment': "Pierre a remplacé ma vieille chaudière par une PAC air/eau. La maison est bien chauffée et la facture a baissé. Le suivi après installation est sérieux.",
             'quality_rating': 4, 'punctuality_rating': 4, 'price_rating': 4},
            {'provider': providers[3], 'author': owners[2], 'rating': 5,
             'title': 'Isolation au top, grosse différence !',
             'comment': "IsoConfort a isolé mes combles et la différence de confort est énorme. Fini les courants d'air et la maison garde la chaleur. Chantier propre. Excellent rapport qualité/prix.",
             'quality_rating': 5, 'punctuality_rating': 5, 'price_rating': 5},
            {'provider': providers[4], 'author': owners[2], 'rating': 5,
             'title': 'Audit très complet',
             'comment': "Marc a réalisé un audit très détaillé de ma maison. Le rapport est clair, avec des priorités bien hiérarchisées et les aides auxquelles j'ai droit. Ça m'a vraiment aidé à planifier mes travaux.",
             'quality_rating': 5, 'punctuality_rating': 5, 'price_rating': 5},
            {'provider': providers[5], 'author': owners[3], 'rating': 5,
             'title': 'Powerwall + panneaux = autonomie !',
             'comment': "Lucas a installé les panneaux et le Powerwall. Le monitoring via l'app est génial. On voit en temps réel la production et le stockage. On est presque autonomes !",
             'quality_rating': 5, 'punctuality_rating': 5, 'price_rating': 4},
            {'provider': providers[7], 'author': owners[4], 'rating': 4,
             'title': 'Bon remplacement de chaudière',
             'comment': "Alexandre a remplacé ma chaudière fioul par une PAC. Le chantier s'est bien passé. La maison est bien chauffée même par grand froid alsacien. Content du résultat.",
             'quality_rating': 4, 'punctuality_rating': 4, 'price_rating': 4},
        ]

        count = 0
        for r in reviews_data:
            _, created = Review.objects.get_or_create(
                provider=r['provider'], author=r['author'],
                defaults=r
            )
            if created:
                count += 1
        self.stdout.write(f'  ✅ {count} avis créés')

    # ──────────────────── Badges ────────────────────

    def _badges(self, providers):
        badges_data = [
            {'name': 'RGE Certifié', 'slug': 'rge-certifie', 'badge_type': 'certification',
             'description': 'Reconnu Garant de l\'Environnement — certification officielle pour les travaux de rénovation énergétique.',
             'icon': 'shield-check', 'color': 'green'},
            {'name': 'Expert Confirmé', 'slug': 'expert-confirme', 'badge_type': 'achievement',
             'description': 'Plus de 100 projets réalisés avec succès sur BigWatts.',
             'icon': 'trophy', 'color': 'gold'},
            {'name': 'Top Avis', 'slug': 'top-avis', 'badge_type': 'quality',
             'description': 'Note moyenne supérieure à 4.5/5 avec au moins 5 avis.',
             'icon': 'star', 'color': 'brand'},
            {'name': 'Réponse Rapide', 'slug': 'reponse-rapide', 'badge_type': 'trust',
             'description': 'Répond aux demandes de devis en moins de 24h.',
             'icon': 'zap', 'color': 'blue'},
            {'name': 'Qualibat', 'slug': 'qualibat', 'badge_type': 'certification',
             'description': 'Certification Qualibat pour la qualité des travaux de construction.',
             'icon': 'award', 'color': 'green'},
            {'name': 'Partenaire Vérifié', 'slug': 'partenaire-verifie', 'badge_type': 'trust',
             'description': 'Identité et documents professionnels vérifiés par BigWatts.',
             'icon': 'check-circle', 'color': 'brand'},
        ]

        created_badges = []
        for bd in badges_data:
            badge, _ = ProviderBadge.objects.get_or_create(slug=bd['slug'], defaults=bd)
            created_badges.append(badge)

        # Assign badges to some providers
        admin = User.objects.filter(username='admin').first()
        assignments = [
            # SolarPro: RGE, Expert, Top Avis, Partenaire Vérifié
            (providers[0], [0, 1, 2, 5]),
            # EcoCharge: Réponse Rapide, Top Avis, Partenaire Vérifié
            (providers[1], [3, 2, 5]),
            # ThermExpert: RGE, Expert, Qualibat
            (providers[2], [0, 1, 4]),
            # IsoConfort: RGE, Expert, Qualibat, Partenaire Vérifié
            (providers[3], [0, 1, 4, 5]),
            # GreenEnergy: Top Avis, Réponse Rapide, Partenaire Vérifié
            (providers[4], [2, 3, 5]),
            # VoltaMaison: Réponse Rapide, Partenaire Vérifié
            (providers[5], [3, 5]),
            # ÉolVert: RGE
            (providers[6], [0]),
            # HeatPump Pro: RGE, Qualibat
            (providers[7], [0, 4]),
        ]

        badge_count = 0
        for provider, badge_indices in assignments:
            provider.is_verified = True
            provider.save(update_fields=['is_verified'])
            for idx in badge_indices:
                _, created = UserBadge.objects.get_or_create(
                    user=provider, badge=created_badges[idx],
                    defaults={'awarded_by': admin, 'notes': 'Attribué automatiquement (démo)'}
                )
                if created:
                    badge_count += 1

        self.stdout.write(f'  ✅ {len(badges_data)} badges, {badge_count} attributions')

    # ──────────────────── Assign countries ────────────────────

    def _assign_countries(self):
        """Ensure all users and ads without a country are assigned to France."""
        try:
            fr = Country.objects.get(code='FR')
        except Country.DoesNotExist:
            self.stdout.write('  ⚠️  Country FR not found, skipping country assignment')
            return
        u_count = User.objects.filter(country__isnull=True).update(country=fr)
        a_count = Ad.objects.filter(country__isnull=True).update(country=fr)
        self.stdout.write(f'  ✅ Pays assigné: {u_count} utilisateurs, {a_count} annonces → FR')

    # ──────────────────── Summary ────────────────────

    def _print_accounts(self):
        self.stdout.write('\n📋 Comptes de démonstration (mot de passe : demo1234)')
        self.stdout.write('   ─────────────────────────────────────────')
        self.stdout.write('   Admin:         admin / admin123')
        self.stdout.write('   Support:       support / support123')
        self.stdout.write('   ─────────────────────────────────────────')
        for p in User.objects.filter(role='prestataire').order_by('username'):
            profile = getattr(p, 'prestataire_profile', None)
            company = profile.company_name if profile else ''
            self.stdout.write(f'   Prestataire:   {p.username:<16} ({company})')
        self.stdout.write('   ─────────────────────────────────────────')
        for o in User.objects.filter(role='proprietaire').order_by('username'):
            self.stdout.write(f'   Propriétaire:  {o.username:<16} ({o.first_name} {o.last_name})')
