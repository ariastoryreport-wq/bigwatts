from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Favorite
from .serializers import FavoriteSerializer


class FavoriteListView(generics.ListCreateAPIView):
    """GET/POST /api/favorites/ - List/add favorites."""
    serializer_class = FavoriteSerializer
    
    def get_queryset(self):
        return Favorite.objects.filter(user=self.request.user)


class FavoriteDeleteView(generics.DestroyAPIView):
    """DELETE /api/favorites/<id>/ - Remove a favorite."""
    
    def get_queryset(self):
        return Favorite.objects.filter(user=self.request.user)


class ToggleFavoriteView(APIView):
    """POST /api/favorites/toggle/ - Toggle favorite."""
    
    def post(self, request):
        provider_id = request.data.get('provider_id')
        ad_id = request.data.get('ad_id')
        
        filters = {'user': request.user}
        if provider_id:
            filters['provider_id'] = provider_id
        elif ad_id:
            filters['ad_id'] = ad_id
        else:
            return Response({'error': 'provider_id ou ad_id requis.'}, status=status.HTTP_400_BAD_REQUEST)
        
        fav = Favorite.objects.filter(**filters).first()
        if fav:
            fav.delete()
            return Response({'status': 'removed'})
        else:
            Favorite.objects.create(**filters)
            return Response({'status': 'added'}, status=status.HTTP_201_CREATED)


class CheckFavoriteView(APIView):
    """GET /api/favorites/check/?provider_id=X&ad_id=Y - Check if favorited."""
    
    def get(self, request):
        provider_id = request.query_params.get('provider_id')
        ad_id = request.query_params.get('ad_id')
        
        filters = {'user': request.user}
        if provider_id:
            filters['provider_id'] = provider_id
        elif ad_id:
            filters['ad_id'] = ad_id
        
        is_fav = Favorite.objects.filter(**filters).exists()
        return Response({'is_favorite': is_fav})
