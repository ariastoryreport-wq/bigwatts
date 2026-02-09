import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adsAPI } from '../../services/api';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Card, PageHeader, LoadingSpinner, StatusBadge, EmptyState, PriceDisplay } from '../../components/ui';
import { Plus, Edit, Trash2, Megaphone } from 'lucide-react';
import toast from 'react-hot-toast';

export default function MyAds() {
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAds = () => {
    setLoading(true);
    adsAPI.getMyAds()
      .then(({ data }) => setAds(data.results || data))
      .catch(() => toast.error('Erreur de chargement'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchAds(); }, []);

  const deleteAd = async (id) => {
    if (!confirm('Supprimer cette annonce ?')) return;
    try {
      await adsAPI.deleteAd(id);
      toast.success('Annonce supprimée');
      fetchAds();
    } catch { toast.error('Erreur lors de la suppression'); }
  };

  return (
    <DashboardLayout>
      <PageHeader
        title="Mes annonces"
        description="Gérez vos services publiés"
        action={
          <Link to="/dashboard/ads/new" className="bg-black dark:bg-white text-white dark:text-black px-4 py-2 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 transition flex items-center gap-2">
            <Plus className="h-4 w-4" /> Nouvelle annonce
          </Link>
        }
      />

      {loading ? (
        <LoadingSpinner />
      ) : ads.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="Aucune annonce"
          description="Créez votre première annonce pour commencer à recevoir des demandes."
          action={
            <Link to="/dashboard/ads/new" className="bg-black dark:bg-white text-white dark:text-black px-6 py-2 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 inline-flex items-center gap-2">
              <Plus className="h-4 w-4" /> Créer une annonce
            </Link>
          }
        />
      ) : (
        <div className="space-y-4">
          {ads.map((ad) => (
            <Card key={ad.id} className="p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <Link to={`/services/${ad.id}`} className="font-semibold text-black dark:text-white hover:text-brand-600 dark:hover:text-brand-300 truncate">
                      {ad.title}
                    </Link>
                    <StatusBadge status={ad.status} />
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                    <PriceDisplay price={ad.price} priceType={ad.price_type} />
                    <span>{ad.city}</span>
                    <span>{ad.views_count} vues</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Link to={`/dashboard/ads/${ad.id}/edit`} className="p-2 text-gray-500 dark:text-gray-400 hover:text-brand-600 dark:hover:text-brand-300 hover:bg-brand-50 dark:hover:bg-brand-900/30 rounded-lg transition">
                    <Edit className="h-4 w-4" />
                  </Link>
                  <button onClick={() => deleteAd(ad.id)} className="p-2 text-gray-500 dark:text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
