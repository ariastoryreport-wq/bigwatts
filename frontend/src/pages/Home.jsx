import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Sun, Zap, Thermometer, Shield, ArrowRight, Star, MapPin } from 'lucide-react';
import { adsAPI } from '../services/api';
import { useCountry } from '../context/CountryContext';
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
  const { countryCode } = useCountry();

  useEffect(() => {
    adsAPI.getAds({ page_size: 6, country: countryCode }).then(({ data }) => {
      setLatestAds(data.results || data);
    }).catch(() => {});
  }, [countryCode]);

  return (
    <div>
      {/* ─── HERO ─── full-width solar panel background image */}
      <section className="min-h-screen flex items-center relative overflow-hidden">
        {/* Background image */}
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1509391366360-2e959784a276?auto=format&fit=crop&w=1920&q=80"
            alt=""
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-black/30" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 w-full">
          <div className="max-w-3xl">
            <h1 className="font-display text-5xl sm:text-6xl lg:text-8xl font-bold leading-[0.95] mb-8 tracking-tight text-white">
              Trouvez les meilleurs experts en{' '}
              <span className="text-brand-300">énergie verte</span>
            </h1>
            <p className="text-lg sm:text-xl text-gray-300 mb-10 max-w-xl leading-relaxed">
              Panneaux solaires, bornes de recharge, pompes à chaleur… Comparez les prestataires 
              certifiés près de chez vous et demandez un devis gratuit.
            </p>

            {/* Search bar */}
            <div className="bg-white/95 backdrop-blur-sm rounded-lg p-2 flex flex-col sm:flex-row gap-2 max-w-xl shadow-2xl">
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
                className="bg-brand-500 text-white px-8 py-3 rounded-lg hover:bg-brand-600 transition font-bold text-center"
              >
                Rechercher
              </Link>
            </div>
          </div>
        </div>
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

      {/* ─── INCENTIVES CTA ─── */}
      <section className="bg-gradient-to-r from-green-600 to-brand-500 py-16">
        <div className="max-w-4xl mx-auto px-4 text-center text-white">
          <h2 className="font-display text-3xl lg:text-5xl font-bold mb-4">
            Quelles aides pour votre projet ?
          </h2>
          <p className="text-lg text-green-100 mb-8 max-w-2xl mx-auto">
            MaPrimeRénov', CEE, aides régionales… Découvrez en 2 minutes les subventions auxquelles vous avez droit.
          </p>
          <Link
            to="/incentives"
            className="inline-flex items-center bg-white text-green-700 px-8 py-4 rounded-lg font-bold text-lg hover:bg-green-50 transition shadow-xl"
          >
            Vérifier mon éligibilité <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
        </div>
      </section>

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
