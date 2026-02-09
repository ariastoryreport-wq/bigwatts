import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Sun, Zap, Thermometer, Shield, ArrowRight, Star, MapPin } from 'lucide-react';
import { adsAPI } from '../services/api';
import AdCard from '../components/cards/AdCard';

const CATEGORIES = [
  { icon: Sun, label: 'Panneaux Solaires', slug: 'panneaux-solaires' },
  { icon: Zap, label: 'Bornes de Recharge', slug: 'bornes-recharge' },
  { icon: Thermometer, label: 'Pompes à Chaleur', slug: 'pompe-chaleur' },
  { icon: Shield, label: 'Isolation Thermique', slug: 'isolation' },
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
      {/* ─── HERO ─── full-screen, bold black bg, high-contrast */}
      <section className="min-h-screen flex items-center bg-black text-white relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 w-full">
          <div className="max-w-3xl">
            <h1 className="font-display text-5xl sm:text-6xl lg:text-8xl font-bold leading-[0.95] mb-8 tracking-tight">
              Trouvez les meilleurs experts en{' '}
              <span className="text-brand-300">énergie verte</span>
            </h1>
            <p className="text-lg sm:text-xl text-gray-400 mb-10 max-w-xl leading-relaxed">
              Panneaux solaires, bornes de recharge, pompes à chaleur… Comparez les prestataires 
              certifiés près de chez vous et demandez un devis gratuit.
            </p>

            {/* Search bar */}
            <div className="bg-white rounded-lg p-2 flex flex-col sm:flex-row gap-2 max-w-xl">
              <div className="flex-1 flex items-center px-4">
                <Search className="h-5 w-5 text-gray-400 mr-3" />
                <input
                  type="text"
                  placeholder="Votre ville ou code postal..."
                  className="w-full py-3 bg-transparent text-black placeholder-gray-400 outline-none"
                  value={searchCity}
                  onChange={(e) => setSearchCity(e.target.value)}
                />
              </div>
              <Link
                to={`/services${searchCity ? `?city=${searchCity}` : ''}`}
                className="bg-black text-white px-8 py-3 rounded-lg hover:bg-gray-800 transition font-bold text-center"
              >
                Rechercher
              </Link>
            </div>
          </div>
        </div>
        {/* Large brand-colored accent block */}
        <div className="absolute right-0 top-0 w-1/3 h-full bg-brand-300 hidden lg:block" />
      </section>

      {/* ─── STATS ─── full-width, brand-green bg, black text */}
      <section className="bg-brand-300 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {STATS.map((s, i) => (
              <div key={i} className="text-center">
                <div className="text-3xl lg:text-5xl font-display font-bold text-black">{s.value}</div>
                <div className="text-sm font-medium text-black/70 mt-2 uppercase tracking-wide">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CATEGORIES ─── full-screen, white bg */}
      <section className="min-h-screen flex items-center bg-white dark:bg-gray-950 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <h2 className="font-heading text-3xl lg:text-5xl font-bold text-center mb-4 text-black dark:text-white">
            Nos catégories de services
          </h2>
          <p className="text-center text-gray-500 dark:text-gray-400 mb-12 max-w-xl mx-auto">
            Trouvez le bon professionnel pour chaque besoin énergétique.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {CATEGORIES.map((cat) => (
              <Link
                key={cat.slug}
                to={`/services?category=${cat.slug}`}
                className="bg-gray-50 dark:bg-gray-900 rounded-lg border-2 border-gray-200 dark:border-gray-800 p-8 text-center hover:border-brand-300 hover:shadow-card-hover transition-all duration-300 group"
              >
                <div className="w-16 h-16 rounded-full bg-brand-50 dark:bg-brand-900/30 flex items-center justify-center mx-auto mb-5 group-hover:bg-brand-300 transition-colors">
                  <cat.icon className="h-8 w-8 text-brand-600 dark:text-brand-300 group-hover:text-black transition-colors" />
                </div>
                <h3 className="font-heading font-bold text-black dark:text-white text-lg">{cat.label}</h3>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ─── LATEST ADS ─── full-screen, light gray bg */}
      {latestAds.length > 0 && (
        <section className="min-h-screen flex items-center bg-gray-50 dark:bg-gray-900 py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
            <div className="flex items-center justify-between mb-10">
              <h2 className="font-heading text-3xl lg:text-5xl font-bold text-black dark:text-white">Derniers services</h2>
              <Link to="/services" className="text-black dark:text-white hover:text-brand-600 dark:hover:text-brand-300 font-bold flex items-center text-lg">
                Voir tout <ArrowRight className="ml-2 h-5 w-5" />
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

      {/* ─── CTA ─── full-screen, black bg, impactful */}
      <section className="min-h-[60vh] flex items-center bg-black text-white py-20">
        <div className="max-w-4xl mx-auto px-4 text-center w-full">
          <h2 className="font-display text-4xl lg:text-6xl font-bold mb-6 leading-tight">
            Vous êtes professionnel de l'énergie verte ?
          </h2>
          <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto">
            Rejoignez BigWatts et accédez à des milliers de propriétaires à la recherche de vos services.
          </p>
          <Link
            to="/register"
            className="inline-flex items-center bg-brand-300 text-black px-10 py-4 rounded-lg font-bold text-lg hover:bg-brand-200 transition shadow-brand-lg"
          >
            Inscrivez-vous gratuitement <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
        </div>
      </section>
    </div>
  );
}
