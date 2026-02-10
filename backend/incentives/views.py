from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django_filters.rest_framework import DjangoFilterBackend

from .models import IncentiveProgram
from .serializers import IncentiveProgramSerializer, EligibilityCheckSerializer
from .matching import match_incentives


class IncentiveProgramListView(generics.ListAPIView):
    """
    Public read-only list of active incentive programmes.
    Supports filtering by country, region, installation type.
    """
    permission_classes = [AllowAny]
    serializer_class = IncentiveProgramSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['country', 'provider_type', 'active']

    def get_queryset(self):
        qs = IncentiveProgram.objects.filter(active=True)
        installation_type = self.request.query_params.get('installation_type')
        if installation_type:
            qs = qs.filter(installation_types__contains=[installation_type])
        return qs


class CheckEligibilityView(APIView):
    """
    POST endpoint accepting the wizard form payload.
    Returns a ranked list of matching incentive programmes with
    estimated savings and human-readable explanations.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = EligibilityCheckSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        results = match_incentives(serializer.validated_data)
        return Response({
            'count': len(results),
            'results': results,
        }, status=status.HTTP_200_OK)
