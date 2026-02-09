import { useState, useEffect } from 'react';
import { adsAPI } from '../../../services/api';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import { PageHeader, LoadingSpinner, EmptyState, StatusBadge, PriceDisplay } from '../../../components/ui';
import { FileText, Search, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';

const STATUSES = [
  { value: '', label: 'Tous' },
  { value: 'active', label: 'Active' },
  { value: 'draft', label: 'Brouillon' },
  { value: 'paused', label: 'En pause' },
  { value: 'archived', label: 'Archivée' },
];

export default function CSAds() {
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => { fetchAds(); }, [statusFilter]);

  const fetchAds = () => {
    setLoading(true);
    const params = {};
    if (statusFilter) params.status = statusFilter;
    adsAPI.csGetAds(params)
      .then(({ data }) => setAds(data.results || data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  const filtered = ads.filter((a) =>
    !search || a.title.toLowerCase().includes(search.toLowerCase()) ||
    a.provider_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout>
      <PageHeader title="Toutes les annonces" description="Vue d'ensemble de toutes les annonces de la plateforme" />

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-gray-800 rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand-300"
            placeholder="Rechercher par titre ou prestataire..."
            value={search} onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="px-4 py-2.5 border border-gray-200 dark:border-gray-800 rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand-300"
          value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
        >
          {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>

      {loading ? <LoadingSpinner /> : filtered.length === 0 ? (
        <EmptyState icon={FileText} title="Aucune annonce" />
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
              <thead className="bg-gray-100 dark:bg-gray-800">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Annonce</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Prestataire</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Catégorie</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Prix</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Statut</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Vues</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Date</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {filtered.map((ad) => (
                  <tr key={ad.id} className="hover:bg-gray-100 dark:hover:bg-gray-800">
                    <td className="px-5 py-3">
                      <p className="text-sm font-medium text-black dark:text-white truncate max-w-[200px]">{ad.title}</p>
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-600 dark:text-gray-400">{ad.provider_name || `#${ad.provider}`}</td>
                    <td className="px-5 py-3 text-sm text-gray-600 dark:text-gray-400">{ad.category_name || '–'}</td>
                    <td className="px-5 py-3 text-sm">
                      {ad.price ? <PriceDisplay price={ad.price} priceType={ad.price_type} /> : <span className="text-gray-400">–</span>}
                    </td>
                    <td className="px-5 py-3"><StatusBadge status={ad.status} /></td>
                    <td className="px-5 py-3 text-sm text-gray-500 dark:text-gray-400">{ad.views_count || 0}</td>
                    <td className="px-5 py-3 text-sm text-gray-400">{new Date(ad.created_at).toLocaleDateString('fr-FR')}</td>
                    <td className="px-5 py-3">
                      <Link to={`/services/${ad.slug || ad.id}`} className="text-brand-600 dark:text-brand-300 hover:text-brand-500 dark:hover:text-brand-200">
                        <Eye size={16} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
