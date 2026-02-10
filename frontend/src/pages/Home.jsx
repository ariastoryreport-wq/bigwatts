import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Sun, Zap, Thermometer, Shield, ArrowRight, Star, MapPin, CheckCircle, MessageCircle, FileText, CreditCard } from 'lucide-react';
import { adsAPI } from '../services/api';
import { useCountry } from '../context/CountryContext';
import AdCard from '../components/cards/AdCard';
import CountryPickerModal from '../components/ui/CountryPickerModal';

const CATEGORIES = [
  {
    icon: Sun,
    label: 'Panneaux Solaires',
    slug: 'panneaux-solaires',
    image: 'https://images.unsplash.com/photo-1509391366360-2e959784a276?auto=format&fit=crop&w=800&q=80',
  },
  {
    icon: Zap,
    label: 'Bornes de Recharge',
    slug: 'bornes-recharge',
    image: 'https://images.unsplash.com/photo-1593941707882-a5bba14938c7?auto=format&fit=crop&w=800&q=80',
  },
  {
    icon: Thermometer,
    label: 'Pompes à Chaleur',
    slug: 'pompe-chaleur',
    image: 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?auto=format&fit=crop&w=800&q=80',
  },
  {
    icon: Shield,
    label: 'Isolation Thermique',
    slug: 'isolation',
    image: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=800&q=80',
  },
];

const STATS = [
  { value: '500+', label: 'Prestataires certifiés' },
  { value: '2 000+', label: 'Projets réalisés' },
  { value: '4.7/5', label: 'Note moyenne' },
  { value: '100%', label: 'Énergie verte' },
];

const HOW_IT_WORKS = [
  { icon: Search, title: 'Trouvez un prestataire', description: 'Parcourez notre réseau de professionnels certifiés près de chez vous.' },
  { icon: MessageCircle, title: 'Contactez-le', description: 'Échangez directement avec le prestataire pour discuter de votre projet.' },
  { icon: FileText, title: 'Recevez un estimé', description: 'Obtenez un devis détaillé et transparent sans engagement.' },
  { icon: CreditCard, title: 'Paiement sécurisé', description: 'Réglez facilement et en toute sécurité via notre plateforme.' },
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
      {/* Country picker modal on first visit */}
      <CountryPickerModal />

      {/* ─── HERO + STATS ─── single full-screen block with shared background */}
      <section className="min-h-[calc(100vh-4rem)] flex flex-col relative overflow-hidden">
        {/* Background image */}
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1509391366360-2e959784a276?auto=format&fit=crop&w=1920&q=80"
            alt=""
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-black/30" />
        </div>

        {/* Hero content — grows to fill space */}
        <div className="relative flex-1 flex items-center">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 w-full">
            <div className="max-w-3xl">
              <h1 className="font-display text-5xl sm:text-6xl lg:text-8xl font-bold leading-[0.95] mb-8 tracking-tight text-white">
                Trouvez les meilleurs experts en{' '}
                <span className="text-brand-300">énergie verte</span>
              </h1>
              <p className="text-lg sm:text-xl text-gray-300 mb-10 max-w-xl leading-relaxed">
                Panneaux solaires, bornes de recharge, pompes à chaleur… Comparez les prestataires 
                certifiés près de chez vous et demandez un devis gratuit.
              </p>

              {/* Search bar — black text on white */}
              <div className="bg-white rounded-lg p-2 flex flex-col sm:flex-row gap-2 max-w-xl shadow-2xl">
                <div className="flex-1 flex items-center px-4">
                  <Search className="h-5 w-5 text-gray-500 mr-3" />
                  <input
                    type="text"
                    placeholder="Votre ville ou code postal..."
                    className="w-full py-3 bg-transparent text-gray-900 placeholder-gray-500 outline-none font-medium"
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
        </div>

        {/* Stats row — bottom of the same block, overlaying the background */}
        <div className="relative">
          <div className="bg-black/40 backdrop-blur-sm border-t border-white/10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                {STATS.map((s, i) => (
                  <div key={i} className="text-center">
                    <div className="text-3xl lg:text-5xl font-display font-bold text-brand-300">{s.value}</div>
                    <div className="text-sm font-medium text-white/70 mt-2 uppercase tracking-wide">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── CATEGORIES ─── full-screen, rich layout with photos */}
      <section className="min-h-screen flex items-center bg-white dark:bg-gray-950 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <h2 className="font-heading text-3xl lg:text-5xl font-bold text-center mb-4 text-black dark:text-white">
            Nos catégories de services
          </h2>
          <p className="text-center text-gray-500 dark:text-gray-400 mb-14 max-w-2xl mx-auto text-lg">
            Des professionnels certifiés pour chaque besoin énergétique, de l'installation à la maintenance.
          </p>

          {/* Category cards — 2x2 grid with full photo + overlay */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-20">
            {CATEGORIES.map((cat) => (
              <Link
                key={cat.slug}
                to={`/services?category=${cat.slug}`}
                className="group relative overflow-hidden rounded-2xl h-64 sm:h-72 hover:shadow-card-hover transition-all duration-300"
              >
                <img
                  src={cat.image}
                  alt={cat.label}
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-6 flex items-end justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-brand-300 flex items-center justify-center shrink-0">
                      <cat.icon className="h-5 w-5 text-black" />
                    </div>
                    <h3 className="font-heading font-bold text-white text-xl">{cat.label}</h3>
                  </div>
                  <ArrowRight className="h-5 w-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </Link>
            ))}
          </div>

          {/* How it works */}
          <div className="border-t border-gray-200 dark:border-gray-800 pt-16">
            <h3 className="font-heading text-2xl lg:text-3xl font-bold text-center mb-4 text-black dark:text-white">
              Comment ça marche ?
            </h3>
            <p className="text-center text-gray-500 dark:text-gray-400 mb-12 max-w-lg mx-auto">
              En 4 étapes simples, trouvez le bon professionnel pour votre projet.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {HOW_IT_WORKS.map((step, i) => (
                <div key={i} className="text-center">
                  <div className="w-16 h-16 rounded-full bg-brand-50 dark:bg-brand-900/30 flex items-center justify-center mx-auto mb-5">
                    <step.icon className="h-7 w-7 text-brand-600 dark:text-brand-300" />
                  </div>
                  <h4 className="font-semibold text-black dark:text-white mb-2">{step.title}</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{step.description}</p>
                </div>
              ))}
            </div>
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

      {/* ─── INCENTIVES CTA ─── full-screen with illustrative image */}
      <section className="min-h-screen flex items-center bg-gradient-to-br from-green-600 via-brand-500 to-green-700 relative overflow-hidden">
        {/* Decorative background image */}
        <div className="absolute inset-0 opacity-10">
          <img
            src="https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=1920&q=80"
            alt=""
            className="w-full h-full object-cover"
          />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full py-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left — text content */}
            <div className="text-white">
              <h2 className="font-display text-4xl lg:text-6xl font-bold mb-8 leading-tight">
                Quelles aides pour votre projet ?
              </h2>
              <ul className="space-y-4 mb-10">
                {[
                  'Simulation gratuite et sans engagement',
                  'Résultats personnalisés selon votre situation',
                  'Aides cumulables pour maximiser vos économies',
                ].map((text, i) => (
                  <li key={i} className="flex items-center gap-3 text-green-50">
                    <CheckCircle className="h-5 w-5 text-brand-300 shrink-0" />
                    <span>{text}</span>
                  </li>
                ))}
              </ul>
              <Link
                to="/incentives"
                className="inline-flex items-center bg-white text-green-700 px-8 py-4 rounded-lg font-bold text-lg hover:bg-green-50 transition shadow-xl"
              >
                Vérifier mon éligibilité <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </div>

            {/* Right — illustrative image */}
            <div className="hidden lg:block">
              <img
                src="https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=800&q=80"
                alt="Personne remplissant un formulaire"
                className="rounded-2xl shadow-2xl w-full max-h-[500px] object-cover"
              />
            </div>
          </div>
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
