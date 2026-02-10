from rest_framework import generics, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import Country
from .serializers import CountrySerializer


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
