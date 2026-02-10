import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { adsAPI } from '../services/api';
import { useCountry } from '../context/CountryContext';
import AdCard from '../components/cards/AdCard';
import { LoadingSpinner, EmptyState } from '../components/ui';
import { Search, SlidersHorizontal, X } from 'lucide-react';

export default function AdList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { countryCode } = useCountry();
  const [ads, setAds] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '',
    city: searchParams.get('city') || '',
    category: searchParams.get('category') || '',
    price_min: searchParams.get('price_min') || '',
    price_max: searchParams.get('price_max') || '',
    ordering: searchParams.get('ordering') || '-created_at',
  });

  useEffect(() => {
    adsAPI.getCategories().then(({ data }) => setCategories(data)).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = { page, country: countryCode };
    if (filters.search) params.search = filters.search;
    if (filters.city) params.city = filters.city;
    if (filters.category) params.category = filters.category;
    if (filters.price_min) params.price_min = filters.price_min;
    if (filters.price_max) params.price_max = filters.price_max;
    if (filters.ordering) params.ordering = filters.ordering;

    adsAPI.getAds(params)
      .then(({ data }) => {
        setAds(data.results || data);
        setTotal(data.count || (data.results || data).length);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [filters, page, countryCode]);

  const applyFilter = (key, value) => {
    setFilters({ ...filters, [key]: value });
    setPage(1);
  };

  const clearFilters = () => {
    setFilters({ search: '', city: '', category: '', price_min: '', price_max: '', ordering: '-created_at' });
    setSearchParams({});
    setPage(1);
  };

  const hasActiveFilters = filters.search || filters.city || filters.category || filters.price_min || filters.price_max;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-black dark:text-white mb-2">Services énergie verte</h1>
        <p className="text-gray-500 dark:text-gray-400">Découvrez les services de nos prestataires certifiés</p>
      </div>

      {/* Search & Filter bar */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text" placeholder="Rechercher un service..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-black dark:text-white rounded-lg focus:ring-2 focus:ring-brand-300 outline-none"
              value={filters.search}
              onChange={(e) => applyFilter('search', e.target.value)}
            />
          </div>
          <input
            type="text" placeholder="Ville..."
            className="px-4 py-2.5 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-black dark:text-white rounded-lg focus:ring-2 focus:ring-brand-300 outline-none sm:w-44"
            value={filters.city}
            onChange={(e) => applyFilter('city', e.target.value)}
          />
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg transition text-black dark:text-white ${showFilters ? 'bg-brand-50 dark:bg-brand-900/30 border-brand-300 text-brand-600 dark:text-brand-300' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}
          >
            <SlidersHorizontal className="h-4 w-4" /> Filtres
          </button>
        </div>

        {/* Extended filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 grid grid-cols-1 sm:grid-cols-4 gap-4">
            <select
              className="px-4 py-2.5 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-black dark:text-white rounded-lg outline-none"
              value={filters.category}
              onChange={(e) => applyFilter('category', e.target.value)}
            >
              <option value="">Toutes catégories</option>
              {categories.map((c) => (
                <option key={c.slug} value={c.slug}>{c.name}</option>
              ))}
            </select>
            <input
              type="number" placeholder="Prix min (€)"
              className="px-4 py-2.5 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-black dark:text-white rounded-lg outline-none"
              value={filters.price_min}
              onChange={(e) => applyFilter('price_min', e.target.value)}
            />
            <input
              type="number" placeholder="Prix max (€)"
              className="px-4 py-2.5 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-black dark:text-white rounded-lg outline-none"
              value={filters.price_max}
              onChange={(e) => applyFilter('price_max', e.target.value)}
            />
            <select
              className="px-4 py-2.5 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-black dark:text-white rounded-lg outline-none"
              value={filters.ordering}
              onChange={(e) => applyFilter('ordering', e.target.value)}
            >
              <option value="-created_at">Plus récents</option>
              <option value="price">Prix croissant</option>
              <option value="-price">Prix décroissant</option>
              <option value="-views_count">Plus vus</option>
            </select>
          </div>
        )}

        {hasActiveFilters && (
          <div className="mt-3 flex items-center">
            <span className="text-sm text-gray-500 dark:text-gray-400 mr-3">{total} résultat(s)</span>
            <button onClick={clearFilters} className="text-sm text-brand-600 dark:text-brand-300 hover:text-brand-700 dark:hover:text-brand-200 flex items-center">
              <X className="h-3.5 w-3.5 mr-1" /> Effacer les filtres
            </button>
          </div>
        )}
      </div>

      {/* Results */}
      {loading ? (
        <LoadingSpinner />
      ) : ads.length === 0 ? (
        <EmptyState
          title="Aucun service trouvé"
          description="Essayez de modifier vos filtres de recherche."
        />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {ads.map((ad) => (
              <AdCard key={ad.id} ad={ad} />
            ))}
          </div>

          {/* Pagination */}
          {total > 12 && (
            <div className="flex justify-center mt-10 gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="px-4 py-2 border border-gray-200 dark:border-gray-700 text-black dark:text-white rounded-lg disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                Précédent
              </button>
              <span className="px-4 py-2 text-gray-500 dark:text-gray-400">Page {page}</span>
              <button
                disabled={ads.length < 12}
                onClick={() => setPage(page + 1)}
                className="px-4 py-2 border border-gray-200 dark:border-gray-700 text-black dark:text-white rounded-lg disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                Suivant
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
