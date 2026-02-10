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
            fav = Favorite.objects.create(**filters)
            # Notify the provider or ad owner that someone liked them
            from notifications.models import Notification
            from django.contrib.auth import get_user_model
            User = get_user_model()
            if provider_id:
                try:
                    target = User.objects.get(pk=provider_id)
                    Notification.objects.create(
                        recipient=target,
                        notification_type='favorite',
                        title='Nouveau favori !',
                        message=f'{request.user.get_full_name() or request.user.username} a ajouté votre profil en favori.',
                        link='/dashboard'
                    )
                except User.DoesNotExist:
                    pass
            elif ad_id:
                from ads.models import Ad
                try:
                    ad = Ad.objects.get(pk=ad_id)
                    Notification.objects.create(
                        recipient=ad.provider,
                        notification_type='favorite',
                        title='Nouveau favori !',
                        message=f'{request.user.get_full_name() or request.user.username} a ajouté "{ad.title}" en favori.',
                        link='/dashboard'
                    )
                except Ad.DoesNotExist:
                    pass
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
