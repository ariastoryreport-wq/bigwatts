import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Sun, Zap, Thermometer, Shield, ArrowRight, Star, MapPin } from 'lucide-react';
import { adsAPI } from '../services/api';
import AdCard from '../components/cards/AdCard';

const CATEGORIES = [
  { icon: Sun, label: 'Panneaux Solaires', slug: 'panneaux-solaires', color: 'bg-amber-500/10 text-amber-400 border border-amber-500/20' },
  { icon: Zap, label: 'Bornes de Recharge', slug: 'bornes-recharge', color: 'bg-sky-500/10 text-sky-400 border border-sky-500/20' },
  { icon: Thermometer, label: 'Pompes à Chaleur', slug: 'pompe-chaleur', color: 'bg-red-500/10 text-red-400 border border-red-500/20' },
  { icon: Shield, label: 'Isolation Thermique', slug: 'isolation', color: 'bg-primary-400/10 text-primary-400 border border-primary-400/20' },
];

const STATS = [
  { value: '500+', label: 'Prestataires certifiés' },
  { value: '2 000+', label: 'Projets réalisés' },
  { value: '4.7/5', label: 'Note moyenne' },
  { value: '100%', label: 'Énergie verte' },
];

export default function Home() {
  const [latestAds, setLatestAds] = useState([]);
  const [searchCity, setSearchCity] = useState('');

  useEffect(() => {
    adsAPI.getAds({ page_size: 6 }).then(({ data }) => {
      setLatestAds(data.results || data);
    }).catch(() => {});
  }, []);

  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-br from-dark-900 via-navy-900 to-dark-900 relative overflow-hidden">
        {/* Decorative glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary-400/5 rounded-full blur-3xl pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28 relative">
          <div className="max-w-3xl">
            <h1 className="text-4xl lg:text-6xl font-bold leading-tight mb-6 text-white">
              Trouvez les meilleurs experts en <span className="text-primary-400">énergie verte</span>
            </h1>
            <p className="text-xl text-dark-300 mb-8">
              Panneaux solaires, bornes de recharge, pompes à chaleur… Comparez les prestataires 
              certifiés près de chez vous et demandez un devis gratuit.
            </p>

            {/* Search bar */}
            <div className="bg-dark-800 rounded-lg p-2 flex flex-col sm:flex-row gap-2 border border-dark-600">
              <div className="flex-1 flex items-center px-4">
                <Search className="h-5 w-5 text-dark-500 mr-3" />
                <input
                  type="text"
                  placeholder="Votre ville ou code postal..."
                  className="w-full py-3 bg-transparent text-white placeholder-dark-500 outline-none"
                  value={searchCity}
                  onChange={(e) => setSearchCity(e.target.value)}
                />
              </div>
              <Link
                to={`/services${searchCity ? `?city=${searchCity}` : ''}`}
                className="bg-primary-400 text-dark-900 px-8 py-3 rounded-lg hover:bg-primary-300 transition font-bold text-center"
              >
                Rechercher
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-dark-800 border-b border-dark-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {STATS.map((s, i) => (
              <div key={i} className="text-center">
                <div className="text-2xl lg:text-3xl font-bold text-primary-400">{s.value}</div>
                <div className="text-sm text-dark-400 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl lg:text-3xl font-bold text-center mb-10 text-white">Nos catégories de services</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {CATEGORIES.map((cat) => (
              <Link
                key={cat.slug}
                to={`/services?category=${cat.slug}`}
                className="bg-dark-800 rounded-lg border border-dark-700 p-6 text-center hover:border-primary-400/30 hover:shadow-neon-sm transition-all duration-300 group"
              >
                <div className={`w-14 h-14 rounded-lg ${cat.color} flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition`}>
                  <cat.icon className="h-7 w-7" />
                </div>
                <h3 className="font-semibold text-white">{cat.label}</h3>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Latest ads */}
      {latestAds.length > 0 && (
        <section className="py-16 bg-dark-800/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl lg:text-3xl font-bold text-white">Derniers services publiés</h2>
              <Link to="/services" className="text-primary-400 hover:text-primary-300 font-medium flex items-center">
                Voir tout <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {latestAds.map((ad) => (
                <AdCard key={ad.id} ad={ad} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="py-20 bg-gradient-to-r from-navy-900 via-navy-800 to-navy-900 relative overflow-hidden">
        <div className="absolute inset-0 bg-primary-400/5 pointer-events-none" />
        <div className="max-w-4xl mx-auto px-4 text-center relative">
          <h2 className="text-3xl font-bold mb-6 text-white">Vous êtes professionnel de l'énergie verte ?</h2>
          <p className="text-xl text-dark-300 mb-8">
            Rejoignez BigWatts et accédez à des milliers de propriétaires à la recherche de vos services.
          </p>
          <Link
            to="/register"
            className="inline-flex items-center bg-primary-400 text-dark-900 px-8 py-4 rounded-lg font-bold text-lg hover:bg-primary-300 transition shadow-neon"
          >
            Inscrivez-vous gratuitement <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
        </div>
      </section>
    </div>
  );
}
