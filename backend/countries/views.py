from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import Country, Location
from .serializers import CountrySerializer, LocationSerializer


class CountryListView(generics.ListAPIView):
    """GET /api/countries/ — list all active countries."""
    queryset = Country.objects.filter(is_active=True)
    serializer_class = CountrySerializer
    permission_classes = [permissions.AllowAny]
    authentication_classes = []
    pagination_class = None


class CountryDetailView(generics.RetrieveAPIView):
    """GET /api/countries/<code>/ — single country by code."""
    serializer_class = CountrySerializer
    permission_classes = [permissions.AllowAny]
    authentication_classes = []
    lookup_field = 'code'
    queryset = Country.objects.filter(is_active=True)


class DetectCountryView(APIView):
    """
    GET /api/countries/detect/ — detect country from IP.
    Falls back to FR if detection fails.
    """
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def get(self, request):
        ip = (
            request.META.get('HTTP_X_FORWARDED_FOR', '').split(',')[0].strip()
            or request.META.get('REMOTE_ADDR', '')
        )

        country_code = 'FR'  # default
        if ip and ip not in ('127.0.0.1', 'localhost', '::1'):
            try:
                import urllib.request
                import json
                resp = urllib.request.urlopen(
                    f'https://ipapi.co/{ip}/json/', timeout=3
                )
                data = json.loads(resp.read())
                detected = data.get('country_code', 'FR')
                if Country.objects.filter(code=detected, is_active=True).exists():
                    country_code = detected
            except Exception:
                pass

        try:
            country = Country.objects.get(code=country_code, is_active=True)
            return Response(CountrySerializer(country).data)
        except Country.DoesNotExist:
            country = Country.objects.filter(is_active=True).first()
            if country:
                return Response(CountrySerializer(country).data)
            return Response({'code': 'FR', 'name': 'France', 'currency': 'EUR', 'currency_symbol': '€'})


class LocationCitySearchView(APIView):
    """
    GET /api/countries/locations/cities/?search=mon&country=CA&region=QC
    Prefix search on city_name for self-hosted location data.
    """
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def get(self, request):
        search = request.query_params.get('search', '').strip()
        country = request.query_params.get('country', '').upper().strip()
        region = request.query_params.get('region', '').upper().strip()

        if not search or len(search) < 2:
            return Response([])

        qs = Location.objects.all()
        if country:
            qs = qs.filter(country_code=country)
        if region:
            qs = qs.filter(region_code=region)

        # Prefix search (case-insensitive, works on SQLite + PostgreSQL)
        qs = qs.filter(city_name__istartswith=search)
        qs = qs.order_by('-population', 'city_name')[:10]

        return Response(LocationSerializer(qs, many=True).data)


class LocationPostalCodeSearchView(APIView):
    """
    GET /api/countries/locations/postalcodes/?search=H2X&country=CA
    Prefix search on postal_code for self-hosted location data.
    """
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def get(self, request):
        search = request.query_params.get('search', '').strip()
        country = request.query_params.get('country', '').upper().strip()
        region = request.query_params.get('region', '').upper().strip()

        if not search or len(search) < 2:
            return Response([])

        qs = Location.objects.all()
        if country:
            qs = qs.filter(country_code=country)
        if region:
            qs = qs.filter(region_code=region)

        # Search by postal code prefix OR city name (to find postal code by city)
        from django.db.models import Q
        qs = qs.filter(
            Q(postal_code__istartswith=search) |
            Q(city_name__istartswith=search)
        )
        qs = qs.order_by('-population', 'city_name')[:10]

        return Response(LocationSerializer(qs, many=True).data)


class LocationValidateView(APIView):
    """
    POST /api/countries/locations/validate/
    Validate that a city/postal_code pair exists in the database.
    Body: { "city": "Montréal", "postal_code": "H2X", "country": "CA" }
    Returns: { "valid": true/false, "suggestion": {...} or null }
    """
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def post(self, request):
        city = request.data.get('city', '').strip()
        postal_code = request.data.get('postal_code', '').strip()
        country = request.data.get('country', '').upper().strip()

        if not country:
            return Response({'valid': False, 'suggestion': None})

        qs = Location.objects.filter(country_code=country)

        # Try exact match on city (case-insensitive)
        if city:
            match = qs.filter(city_name__iexact=city).first()
            if match:
                return Response({
                    'valid': True,
                    'suggestion': LocationSerializer(match).data,
                })

        # Try match on postal code
        if postal_code:
            match = qs.filter(postal_code__iexact=postal_code).first()
            if match:
                return Response({
                    'valid': True,
                    'suggestion': LocationSerializer(match).data,
                })

        # No match — try fuzzy suggestion
        suggestion = None
        if city:
            suggestion_qs = qs.filter(city_name__istartswith=city[:3]).order_by('-population').first()
            if suggestion_qs:
                suggestion = LocationSerializer(suggestion_qs).data

        return Response({'valid': False, 'suggestion': suggestion})
