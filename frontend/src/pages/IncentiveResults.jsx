import { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, ExternalLink, Euro, Sparkles, RefreshCw } from 'lucide-react';
import { LoadingSpinner, PageHeader } from '../components/ui';
import { useCountry } from '../context/CountryContext';
import api from '../services/api';

const INSTALLATION_LABELS = {
  solar: 'Panneaux solaires',
  heat_pump: 'Pompe à chaleur',
  ev_charger: 'Borne de recharge VE',
  insulation: 'Isolation thermique',
  battery: 'Batterie de stockage',
  wind: 'Éolienne',
};

const PROVIDER_BADGES = {
  government: { label: 'État', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' },
  regional: { label: 'Région', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300' },
  local: { label: 'Commune', color: 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300' },
  utility: { label: 'Énergie', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' },
  other: { label: 'Autre', color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300' },
};

export default function IncentiveResults() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { formatPrice, countries } = useCountry();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalSavings, setTotalSavings] = useState(0);

  // Get the country info for the results
  const resultCountry = countries.find((c) => c.code === state?.country) || {};

  useEffect(() => {
    if (!state) {
      navigate('/incentives');
      return;
    }
    const fetchResults = async () => {
      try {
        setLoading(true);
        const payload = {
          country: state.country,
          region: state.region || '',
          installation_type: state.installation_type,
          property_type: state.property_type,
          is_owner: state.is_owner,
          annual_income: state.annual_income ? parseFloat(state.annual_income) : null,
          estimated_budget: state.estimated_budget ? parseFloat(state.estimated_budget) : null,
        };
        const { data } = await api.post('/incentives/check/', payload);
        setResults(data.results || []);
        const savings = (data.results || []).reduce((sum, r) => sum + (r.estimated_savings || 0), 0);
        setTotalSavings(savings);
      } catch (err) {
        console.error('Incentive check error:', err.response?.status, err.response?.data || err.message);
        const detail = err.response?.data?.detail || err.response?.data?.error || err.message;
        setError(`Impossible de charger les résultats. ${detail ? `(${detail})` : 'Veuillez réessayer.'}`);
      } finally {
        setLoading(false);
      }
    };
    fetchResults();
  }, [state, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center space-y-4">
          <LoadingSpinner />
          <p className="text-gray-500 dark:text-gray-400 animate-pulse">Analyse de votre éligibilité…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md">
          <p className="text-red-500 font-medium">{error}</p>
          <button onClick={() => navigate('/incentives')} className="px-5 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg font-bold">
            Recommencer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-10">
      <div className="max-w-3xl mx-auto px-4">
        {/* Back link */}
        <button
          onClick={() => navigate('/incentives')}
          className="flex items-center gap-2 text-gray-500 hover:text-black dark:hover:text-white transition mb-6 text-sm font-medium"
        >
          <ArrowLeft className="h-4 w-4" /> Nouvelle recherche
        </button>

        <PageHeader
          title="Vos aides éligibles"
          subtitle={`Pour un projet de ${INSTALLATION_LABELS[state?.installation_type] || 'rénovation'} — ${state?.region || resultCountry.name || 'Tout le pays'}`}
        />

        {/* Summary card */}
        {results.length > 0 && (
          <div className="mt-6 mb-8 bg-green-500 rounded-2xl p-6 text-white">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <p className="text-green-100 text-sm font-medium">Économies potentielles totales</p>
                <p className="text-4xl font-black mt-1">
                  {totalSavings > 0 ? formatPrice(totalSavings) : 'À calculer'}
                </p>
                <p className="text-green-100 text-sm mt-1">
                  {results.length} programme{results.length > 1 ? 's' : ''} disponible{results.length > 1 ? 's' : ''}
                </p>
              </div>
            </div>
            {state.estimated_budget && (
              <p className="text-green-100 text-xs mt-3">
                Sur un budget estimé de {formatPrice(parseFloat(state.estimated_budget))}.
                Les aides sont souvent cumulables !
              </p>
            )}
          </div>
        )}

        {/* Results */}
        {results.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-10 text-center mt-8">
            <RefreshCw className="h-12 w-12 text-gray-300 dark:text-gray-700 mx-auto" />
            <h3 className="mt-4 text-lg font-bold text-black dark:text-white">Aucune aide trouvée</h3>
            <p className="text-gray-500 dark:text-gray-400 mt-2 max-w-sm mx-auto">
              Nous n'avons trouvé aucun programme correspondant à vos critères. Essayez de modifier votre recherche.
            </p>
            <button
              onClick={() => navigate('/incentives')}
              className="mt-6 px-6 py-2.5 bg-black dark:bg-white text-white dark:text-black rounded-lg font-bold hover:bg-gray-800 dark:hover:bg-gray-200 transition"
            >
              Modifier la recherche
            </button>
          </div>
        ) : (
          <div className="space-y-4 mt-6">
            {results.map((r, idx) => {
              const badge = PROVIDER_BADGES[r.provider_type] || PROVIDER_BADGES.other;
              return (
                <div
                  key={r.id}
                  className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-xs font-bold text-gray-400">#{idx + 1}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${badge.color}`}>
                          {badge.label}
                        </span>
                        {r.region && (
                          <span className="text-xs text-gray-400">{r.region}</span>
                        )}
                      </div>
                      <h3 className="text-lg font-bold text-black dark:text-white">{r.name}</h3>
                    </div>
                    {r.estimated_savings != null && r.estimated_savings > 0 && (
                      <div className="text-right shrink-0">
                        <p className="text-2xl font-black text-green-600 dark:text-green-400">
                          {formatPrice(r.estimated_savings)}
                        </p>
                        <p className="text-xs text-gray-400">économie estimée</p>
                      </div>
                    )}
                  </div>

                  {/* Explanation */}
                  <div className="mt-4 bg-brand-50 dark:bg-brand-950/30 border border-brand-200 dark:border-brand-800/30 rounded-xl p-4">
                    <div className="flex items-start gap-2">
                      <Sparkles className="h-4 w-4 text-brand-500 mt-0.5 shrink-0" />
                      <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                        {r.explanation}
                      </p>
                    </div>
                  </div>

                  {/* Stats row */}
                  <div className="flex items-center gap-4 mt-4 flex-wrap text-sm">
                    {r.discount_percent > 0 && (
                      <span className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                        <Euro className="h-3.5 w-3.5" /> Jusqu'à {r.discount_percent}%
                      </span>
                    )}
                    {r.max_amount && (
                      <span className="text-gray-600 dark:text-gray-400">
                        Plafond : {formatPrice(r.max_amount)}
                      </span>
                    )}
                  </div>

                  {/* CTA */}
                  {r.official_url && (
                    <a
                      href={r.official_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-black dark:text-white rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                    >
                      <ExternalLink className="h-3.5 w-3.5" /> Voir le site officiel
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Footer CTA */}
        <div className="mt-10 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 text-center">
          <h3 className="font-bold text-black dark:text-white">Besoin d'un prestataire qualifié ?</h3>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            Trouvez un professionnel certifié sur BigWatts pour concrétiser votre projet.
          </p>
          <Link
            to="/services"
            className="inline-block mt-4 px-6 py-2.5 bg-black dark:bg-white text-white dark:text-black rounded-lg font-bold hover:bg-gray-800 dark:hover:bg-gray-200 transition"
          >
            Explorer les prestataires
          </Link>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Données indicatives mises à jour régulièrement. Vérifiez les conditions sur les sites officiels.
        </p>
      </div>
    </div>
  );
}
