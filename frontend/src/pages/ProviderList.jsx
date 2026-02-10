import { useState, useEffect } from 'react';
import { authAPI } from '../services/api';
import { useCountry } from '../context/CountryContext';
import ProviderCard from '../components/cards/ProviderCard';
import { LoadingSpinner, EmptyState } from '../components/ui';
import { Search, Users } from 'lucide-react';

export default function ProviderList() {
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [city, setCity] = useState('');
  const { countryCode } = useCountry();

  useEffect(() => {
    const params = {};
    if (countryCode) params.country = countryCode;
    if (search) params.search = search;
    if (city) params.city = city;

    setLoading(true);
    authAPI.getProviders(params)
      .then(({ data }) => setProviders(data.results || data))
      .catch((err) => { console.error('ProviderList fetch error:', err); })
      .finally(() => setLoading(false));
  }, [search, city, countryCode]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-black dark:text-white mb-2">Prestataires énergie verte</h1>
        <p className="text-gray-500 dark:text-gray-400">Trouvez le professionnel idéal pour votre projet</p>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4 mb-6 flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text" placeholder="Rechercher par nom, spécialité..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-black dark:text-white rounded-lg focus:ring-2 focus:ring-brand-300 outline-none"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <input
          type="text" placeholder="Ville..."
          className="px-4 py-2.5 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-black dark:text-white rounded-lg focus:ring-2 focus:ring-brand-300 outline-none sm:w-48"
          value={city}
          onChange={(e) => setCity(e.target.value)}
        />
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : providers.length === 0 ? (
        <EmptyState icon={Users} title="Aucun prestataire trouvé" description="Modifiez vos critères de recherche." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {providers.map((p) => (
            <ProviderCard key={p.id} provider={p} />
          ))}
        </div>
      )}
    </div>
  );
}
