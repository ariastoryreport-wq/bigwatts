import { useState, useEffect } from 'react';
import { favoritesAPI } from '../../services/api';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Card, PageHeader, LoadingSpinner, EmptyState } from '../../components/ui';
import { Heart, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function Favorites() {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchFavorites = () => {
    setLoading(true);
    favoritesAPI.getFavorites()
      .then(({ data }) => setFavorites(data.results || data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchFavorites(); }, []);

  const removeFav = async (id) => {
    try {
      await favoritesAPI.removeFavorite(id);
      toast.success('Retiré des favoris');
      fetchFavorites();
    } catch { toast.error('Erreur'); }
  };

  return (
    <DashboardLayout>
      <PageHeader
        title="Mes favoris"
        description={`${favorites.length} favori${favorites.length !== 1 ? 's' : ''} sauvegardé${favorites.length !== 1 ? 's' : ''}`}
      />

      {/* Counter badge */}
      {!loading && favorites.length > 0 && (
        <div className="flex items-center gap-3 mb-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-50 dark:bg-brand-900/30 border border-brand-200 dark:border-brand-800">
            <Heart className="h-4 w-4 text-brand-500 fill-brand-500" />
            <span className="text-sm font-bold text-brand-700 dark:text-brand-300">{favorites.length}</span>
            <span className="text-sm text-brand-600 dark:text-brand-400">favori{favorites.length !== 1 ? 's' : ''}</span>
          </div>
        </div>
      )}

      {loading ? <LoadingSpinner /> : favorites.length === 0 ? (
        <EmptyState icon={Heart} title="Aucun favori" description="Ajoutez des prestataires ou services en favoris pour les retrouver ici." />
      ) : (
        <div className="space-y-3">
          {favorites.map((fav) => (
            <Card key={fav.id} className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  {fav.provider && (
                    <Link to={`/providers/${fav.provider}`} className="font-medium text-black dark:text-white hover:text-brand-600 dark:hover:text-brand-300">
                      {fav.provider_name || fav.provider_username}
                    </Link>
                  )}
                  {fav.ad && (
                    <Link to={`/services/${fav.ad}`} className="font-medium text-black dark:text-white hover:text-brand-600 dark:hover:text-brand-300">
                      {fav.ad_title}
                    </Link>
                  )}
                  <p className="text-xs text-gray-400 mt-1">{new Date(fav.created_at).toLocaleDateString('fr-FR')}</p>
                </div>
                <button onClick={() => removeFav(fav.id)} className="p-2 text-gray-400 hover:text-red-400 transition">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
