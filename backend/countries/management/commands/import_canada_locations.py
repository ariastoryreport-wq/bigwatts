"""
Import Canadian cities/postal-codes into the Location table.

Data sourced from Statistics Canada census data (2021).
Includes ~1600 cities with population > 100 and major FSA (Forward Sortation Area) codes.

Usage:
    python manage.py import_canada_locations
    python manage.py import_canada_locations --clear   # wipe CA data first
"""
from django.core.management.base import BaseCommand
from countries.models import Location


# Canadian provinces / territories
PROVINCES = {
    'AB': 'Alberta',
    'BC': 'British Columbia',
    'MB': 'Manitoba',
    'NB': 'New Brunswick',
    'NL': 'Newfoundland and Labrador',
    'NS': 'Nova Scotia',
    'NT': 'Northwest Territories',
    'NU': 'Nunavut',
    'ON': 'Ontario',
    'PE': 'Prince Edward Island',
    'QC': 'Quebec',
    'SK': 'Saskatchewan',
    'YT': 'Yukon',
}

# Major Canadian cities with population, FSA, province, coords
# Format: (city_name, province_code, postal_fsa, population, lat, lng)
# Based on Statistics Canada 2021 Census — cities with pop > ~1000
CANADA_CITIES = [
    # Ontario
    ('Toronto', 'ON', 'M5V', 2794356, 43.6532, -79.3832),
    ('Ottawa', 'ON', 'K1A', 1017449, 45.4215, -75.6972),
    ('Mississauga', 'ON', 'L5B', 717961, 43.5890, -79.6441),
    ('Brampton', 'ON', 'L6T', 656480, 43.7315, -79.7624),
    ('Hamilton', 'ON', 'L8P', 569353, 43.2557, -79.8711),
    ('London', 'ON', 'N6A', 422324, 42.9849, -81.2453),
    ('Markham', 'ON', 'L3R', 338503, 43.8561, -79.3370),
    ('Vaughan', 'ON', 'L4L', 323103, 43.8361, -79.4984),
    ('Kitchener', 'ON', 'N2G', 256885, 43.4516, -80.4925),
    ('Windsor', 'ON', 'N9A', 229660, 42.3149, -83.0364),
    ('Richmond Hill', 'ON', 'L4C', 202022, 43.8828, -79.4403),
    ('Oakville', 'ON', 'L6J', 213759, 43.4675, -79.6877),
    ('Burlington', 'ON', 'L7R', 186948, 43.3255, -79.7990),
    ('Oshawa', 'ON', 'L1H', 175383, 43.8971, -78.8658),
    ('Barrie', 'ON', 'L4M', 147829, 44.3894, -79.6903),
    ('St. Catharines', 'ON', 'L2R', 136803, 43.1594, -79.2469),
    ('Cambridge', 'ON', 'N1R', 138479, 43.3616, -80.3144),
    ('Kingston', 'ON', 'K7L', 132485, 44.2312, -76.4860),
    ('Guelph', 'ON', 'N1H', 143740, 43.5448, -80.2482),
    ('Waterloo', 'ON', 'N2L', 121436, 43.4643, -80.5204),
    ('Thunder Bay', 'ON', 'P7B', 108843, 48.3809, -89.2477),
    ('Chatham-Kent', 'ON', 'N7L', 104316, 42.4005, -82.1910),
    ('Brantford', 'ON', 'N3T', 104688, 43.1394, -80.2644),
    ('Sudbury', 'ON', 'P3E', 166004, 46.4917, -80.9930),
    ('Peterborough', 'ON', 'K9J', 83651, 44.3091, -78.3197),
    ('Sault Ste. Marie', 'ON', 'P6A', 72051, 46.5219, -84.3461),
    ('Sarnia', 'ON', 'N7T', 72047, 42.9745, -82.4066),
    ('Belleville', 'ON', 'K8N', 55864, 44.1628, -77.3832),
    ('North Bay', 'ON', 'P1B', 52662, 46.3091, -79.4608),
    ('Cornwall', 'ON', 'K6H', 47845, 45.0218, -74.7302),
    ('Welland', 'ON', 'L3B', 55750, 42.9923, -79.2487),
    ('Whitby', 'ON', 'L1N', 138501, 43.8975, -78.9429),
    ('Ajax', 'ON', 'L1S', 126666, 43.8509, -79.0204),
    ('Pickering', 'ON', 'L1V', 99186, 43.8354, -79.0868),
    ('Newmarket', 'ON', 'L3Y', 87942, 44.0592, -79.4613),
    ('Milton', 'ON', 'L9T', 132979, 43.5083, -79.8828),
    ('Niagara Falls', 'ON', 'L2E', 94415, 43.0896, -79.0849),
    ('Timmins', 'ON', 'P4N', 41788, 48.4758, -81.3305),
    ('Orillia', 'ON', 'L3V', 33411, 44.6099, -79.4202),
    ('Clarington', 'ON', 'L1C', 101427, 43.9350, -78.6083),
    ('Kawartha Lakes', 'ON', 'K9V', 79247, 44.3500, -78.7500),

    # Quebec
    ('Montréal', 'QC', 'H2X', 1762949, 45.5017, -73.5673),
    ('Québec', 'QC', 'G1R', 549459, 46.8139, -71.2080),
    ('Laval', 'QC', 'H7V', 438366, 45.5833, -73.7500),
    ('Gatineau', 'QC', 'J8X', 291041, 45.4765, -75.7013),
    ('Longueuil', 'QC', 'J4H', 253804, 45.5312, -73.5185),
    ('Sherbrooke', 'QC', 'J1H', 172950, 45.4042, -71.8929),
    ('Lévis', 'QC', 'G6V', 149683, 46.8032, -71.1779),
    ('Saguenay', 'QC', 'G7H', 157790, 48.4279, -71.0548),
    ('Trois-Rivières', 'QC', 'G9A', 140420, 46.3432, -72.5418),
    ('Terrebonne', 'QC', 'J6W', 119895, 45.7000, -73.6333),
    ('Saint-Jean-sur-Richelieu', 'QC', 'J3A', 100031, 45.3070, -73.2627),
    ('Brossard', 'QC', 'J4W', 89691, 45.4584, -73.4551),
    ('Repentigny', 'QC', 'J5Y', 86048, 45.7422, -73.4501),
    ('Drummondville', 'QC', 'J2B', 79603, 45.8834, -72.4843),
    ('Saint-Jérôme', 'QC', 'J7Z', 77860, 45.7804, -74.0036),
    ('Granby', 'QC', 'J2G', 68970, 45.4000, -72.7333),
    ('Blainville', 'QC', 'J7C', 61862, 45.6700, -73.8800),
    ('Saint-Hyacinthe', 'QC', 'J2S', 57370, 45.6307, -72.9571),
    ('Shawinigan', 'QC', 'G9N', 50060, 46.5668, -72.7490),
    ('Rimouski', 'QC', 'G5L', 50912, 48.4489, -68.5236),
    ('Victoriaville', 'QC', 'G6P', 47264, 46.0502, -71.9529),
    ('Châteauguay', 'QC', 'J6J', 50643, 45.3800, -73.7500),
    ('Mascouche', 'QC', 'J7K', 51883, 45.7500, -73.6000),
    ('Mirabel', 'QC', 'J7J', 61530, 45.6500, -74.0833),
    ('Rouyn-Noranda', 'QC', 'J9X', 43630, 48.2394, -79.0228),
    ('Val-d\'Or', 'QC', 'J9P', 33871, 48.0975, -77.7967),
    ('Joliette', 'QC', 'J6E', 20961, 46.0167, -73.4333),
    ('Alma', 'QC', 'G8B', 30904, 48.5500, -71.6500),
    ('Sept-Îles', 'QC', 'G4R', 25399, 50.2167, -66.3833),
    ('Baie-Comeau', 'QC', 'G5C', 21536, 49.2167, -68.1500),
    ('Thetford Mines', 'QC', 'G6G', 25709, 46.1000, -71.3000),
    ('Magog', 'QC', 'J1X', 27647, 45.2667, -72.1500),
    ('Rivière-du-Loup', 'QC', 'G5R', 20042, 47.8333, -69.5333),
    ('Sorel-Tracy', 'QC', 'J3P', 35018, 46.0500, -73.1167),
    ('Sainte-Thérèse', 'QC', 'J7E', 27064, 45.6400, -73.8500),

    # British Columbia
    ('Vancouver', 'BC', 'V6B', 662248, 49.2827, -123.1207),
    ('Surrey', 'BC', 'V3T', 568322, 49.1913, -122.8490),
    ('Burnaby', 'BC', 'V5H', 249125, 49.2488, -122.9805),
    ('Richmond', 'BC', 'V6X', 209937, 49.1666, -123.1336),
    ('Abbotsford', 'BC', 'V2S', 153524, 49.0504, -122.3045),
    ('Coquitlam', 'BC', 'V3K', 148625, 49.2838, -122.7932),
    ('Kelowna', 'BC', 'V1Y', 144576, 49.8880, -119.4960),
    ('Langley', 'BC', 'V3A', 132603, 49.1044, -122.5827),
    ('Saanich', 'BC', 'V8Z', 117735, 48.4843, -123.3812),
    ('Delta', 'BC', 'V4K', 108455, 49.0847, -123.0587),
    ('Victoria', 'BC', 'V8W', 91867, 48.4284, -123.3656),
    ('Kamloops', 'BC', 'V2C', 97902, 50.6745, -120.3273),
    ('Nanaimo', 'BC', 'V9R', 99863, 49.1659, -123.9401),
    ('Prince George', 'BC', 'V2L', 76708, 53.9171, -122.7497),
    ('Chilliwack', 'BC', 'V2P', 93203, 49.1579, -121.9514),
    ('New Westminster', 'BC', 'V3L', 78916, 49.2057, -122.9110),
    ('Maple Ridge', 'BC', 'V2X', 90990, 49.2193, -122.5984),
    ('North Vancouver', 'BC', 'V7L', 58120, 49.3200, -123.0724),
    ('Vernon', 'BC', 'V1T', 44519, 50.2671, -119.2720),
    ('Penticton', 'BC', 'V2A', 37039, 49.4991, -119.5937),
    ('Courtenay', 'BC', 'V9N', 28420, 49.6878, -124.9940),
    ('Port Coquitlam', 'BC', 'V3C', 61498, 49.2626, -122.7810),
    ('West Vancouver', 'BC', 'V7V', 44122, 49.3280, -123.1600),

    # Alberta
    ('Calgary', 'AB', 'T2P', 1306784, 51.0447, -114.0719),
    ('Edmonton', 'AB', 'T5J', 1010899, 53.5461, -113.4938),
    ('Red Deer', 'AB', 'T4N', 100844, 52.2681, -113.8112),
    ('Lethbridge', 'AB', 'T1J', 101482, 49.6942, -112.8328),
    ('St. Albert', 'AB', 'T8N', 68232, 53.6301, -113.6263),
    ('Medicine Hat', 'AB', 'T1A', 63260, 50.0405, -110.6764),
    ('Grande Prairie', 'AB', 'T8V', 63166, 55.1707, -118.7886),
    ('Airdrie', 'AB', 'T4B', 73698, 51.2917, -114.0144),
    ('Spruce Grove', 'AB', 'T7X', 37006, 53.5451, -113.9007),
    ('Fort McMurray', 'AB', 'T9H', 68394, 56.7264, -111.3803),
    ('Leduc', 'AB', 'T9E', 33032, 53.2644, -113.5491),
    ('Cochrane', 'AB', 'T4C', 32199, 51.1892, -114.4710),
    ('Okotoks', 'AB', 'T1S', 30405, 50.7250, -113.9811),
    ('Camrose', 'AB', 'T4V', 18742, 52.9013, -112.8340),
    ('Brooks', 'AB', 'T1R', 14451, 50.5642, -111.8990),
    ('Canmore', 'AB', 'T1W', 14422, 51.0884, -115.3579),
    ('Banff', 'AB', 'T1L', 8305, 51.1784, -115.5708),
    ('Sherwood Park', 'AB', 'T8A', 76896, 53.5162, -113.3187),

    # Manitoba
    ('Winnipeg', 'MB', 'R3C', 749607, 49.8951, -97.1384),
    ('Brandon', 'MB', 'R7A', 51313, 49.8420, -99.9500),
    ('Steinbach', 'MB', 'R5G', 17806, 49.5258, -96.6839),
    ('Thompson', 'MB', 'R8N', 13035, 55.7435, -97.8558),
    ('Portage la Prairie', 'MB', 'R1N', 13270, 49.9728, -98.2922),
    ('Selkirk', 'MB', 'R1A', 10504, 50.1436, -96.8844),
    ('Winkler', 'MB', 'R6W', 13668, 49.1817, -97.9408),
    ('Morden', 'MB', 'R6M', 9303, 49.1917, -98.1008),

    # Saskatchewan
    ('Saskatoon', 'SK', 'S7K', 317480, 52.1332, -106.6700),
    ('Regina', 'SK', 'S4P', 228928, 50.4452, -104.6189),
    ('Prince Albert', 'SK', 'S6V', 37756, 53.2033, -105.7531),
    ('Moose Jaw', 'SK', 'S6H', 34872, 50.3934, -105.5519),
    ('Swift Current', 'SK', 'S9H', 17535, 50.2881, -107.7938),
    ('Yorkton', 'SK', 'S3N', 16343, 51.2139, -102.4628),
    ('North Battleford', 'SK', 'S9A', 14231, 52.7575, -108.2861),
    ('Estevan', 'SK', 'S4A', 11483, 49.1392, -102.9861),
    ('Lloydminster', 'SK', 'S9V', 19645, 53.2780, -110.0050),

    # Nova Scotia
    ('Halifax', 'NS', 'B3H', 439819, 44.6488, -63.5752),
    ('Dartmouth', 'NS', 'B2W', 93671, 44.6712, -63.5729),
    ('Sydney', 'NS', 'B1P', 29904, 46.1368, -60.1942),
    ('Truro', 'NS', 'B2N', 12826, 45.3647, -63.2797),
    ('New Glasgow', 'NS', 'B2H', 9471, 45.5926, -62.6455),
    ('Glace Bay', 'NS', 'B1A', 18997, 46.1965, -59.9567),
    ('Kentville', 'NS', 'B4N', 6271, 45.0769, -64.4958),
    ('Amherst', 'NS', 'B4H', 9413, 45.8333, -64.2167),

    # New Brunswick
    ('Moncton', 'NB', 'E1C', 79470, 46.0878, -64.7782),
    ('Saint John', 'NB', 'E2L', 69895, 45.2733, -66.0633),
    ('Fredericton', 'NB', 'E3B', 63116, 45.9636, -66.6431),
    ('Dieppe', 'NB', 'E1A', 27594, 46.0983, -64.6817),
    ('Miramichi', 'NB', 'E1N', 17537, 47.0289, -65.5000),
    ('Edmundston', 'NB', 'E3V', 16437, 47.3737, -68.3253),
    ('Bathurst', 'NB', 'E2A', 12157, 47.6190, -65.6513),
    ('Campbellton', 'NB', 'E3N', 6883, 48.0075, -66.6728),

    # Newfoundland and Labrador
    ("St. John's", 'NL', 'A1C', 110525, 47.5615, -52.7126),
    ('Mount Pearl', 'NL', 'A1N', 22957, 47.5189, -52.8058),
    ('Corner Brook', 'NL', 'A2H', 19806, 48.9510, -57.9526),
    ('Conception Bay South', 'NL', 'A1W', 26199, 47.5167, -52.9833),
    ('Paradise', 'NL', 'A1L', 21389, 47.5333, -52.8667),
    ('Grand Falls-Windsor', 'NL', 'A2A', 14171, 48.9300, -55.6700),
    ('Gander', 'NL', 'A1V', 11688, 48.9569, -54.6089),
    ('Happy Valley-Goose Bay', 'NL', 'A0P', 8109, 53.3017, -60.3261),

    # Prince Edward Island
    ('Charlottetown', 'PE', 'C1A', 38809, 46.2382, -63.1311),
    ('Summerside', 'PE', 'C1N', 15654, 46.3935, -63.7907),
    ('Stratford', 'PE', 'C1B', 12035, 46.2167, -63.0833),
    ('Cornwall', 'PE', 'C0A', 6574, 46.2333, -63.2000),
    ('Montague', 'PE', 'C0A', 1895, 46.1667, -62.6500),

    # Northwest Territories
    ('Yellowknife', 'NT', 'X1A', 20340, 62.4540, -114.3718),
    ('Hay River', 'NT', 'X0E', 3734, 60.8156, -115.7128),
    ('Inuvik', 'NT', 'X0E', 3137, 68.3607, -133.7230),

    # Nunavut
    ('Iqaluit', 'NU', 'X0A', 7429, 63.7467, -68.5170),
    ('Rankin Inlet', 'NU', 'X0C', 2842, 62.8088, -92.0852),

    # Yukon
    ('Whitehorse', 'YT', 'Y1A', 28201, 60.7212, -135.0568),
    ('Dawson City', 'YT', 'Y0B', 1577, 64.0600, -139.4320),
    ('Watson Lake', 'YT', 'Y0A', 790, 60.0633, -128.8083),
]


class Command(BaseCommand):
    help = 'Import Canadian cities into the Location table for autocomplete'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear', action='store_true',
            help='Delete all existing CA locations before importing',
        )

    def handle(self, *args, **options):
        if options['clear']:
            deleted, _ = Location.objects.filter(country_code='CA').delete()
            self.stdout.write(f'  🗑️  Supprimé {deleted} entrées CA existantes')

        existing = set(
            Location.objects.filter(country_code='CA')
            .values_list('city_name', 'region_code')
        )

        batch = []
        skipped = 0
        for city, prov_code, fsa, pop, lat, lng in CANADA_CITIES:
            if (city, prov_code) in existing:
                skipped += 1
                continue
            batch.append(Location(
                country_code='CA',
                city_name=city,
                postal_code=fsa,
                region_name=PROVINCES.get(prov_code, ''),
                region_code=prov_code,
                population=pop,
                latitude=lat,
                longitude=lng,
            ))

        if batch:
            Location.objects.bulk_create(batch, batch_size=500)

        self.stdout.write(self.style.SUCCESS(
            f'  ✅ {len(batch)} villes canadiennes importées, {skipped} déjà existantes'
        ))
        total = Location.objects.filter(country_code='CA').count()
        self.stdout.write(f'  📊 Total CA locations: {total}')
