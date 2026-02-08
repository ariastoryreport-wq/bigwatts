import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Sun, Zap, Thermometer, Shield, ArrowRight, Star, MapPin } from 'lucide-react';
import { adsAPI } from '../services/api';
import AdCard from '../components/cards/AdCard';

const CATEGORIES = [
  { icon: Sun, label: 'Panneaux Solaires', slug: 'panneaux-solaires', color: 'bg-yellow-100 text-yellow-700' },
  { icon: Zap, label: 'Bornes de Recharge', slug: 'bornes-recharge', color: 'bg-blue-100 text-blue-700' },
  { icon: Thermometer, label: 'Pompes à Chaleur', slug: 'pompe-chaleur', color: 'bg-red-100 text-red-700' },
  { icon: Shield, label: 'Isolation Thermique', slug: 'isolation', color: 'bg-green-100 text-green-700' },
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
      <section className="bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
          <div className="max-w-3xl">
            <h1 className="text-4xl lg:text-5xl font-extrabold leading-tight mb-6">
              Trouvez les meilleurs experts en <span className="text-accent-300">énergie verte</span>
            </h1>
            <p className="text-xl text-primary-100 mb-8">
              Panneaux solaires, bornes de recharge, pompes à chaleur… Comparez les prestataires 
              certifiés près de chez vous et demandez un devis gratuit.
            </p>

            {/* Search bar */}
            <div className="bg-white rounded-xl p-2 flex flex-col sm:flex-row gap-2 shadow-xl">
              <div className="flex-1 flex items-center px-4">
                <Search className="h-5 w-5 text-gray-400 mr-3" />
                <input
                  type="text"
                  placeholder="Votre ville ou code postal..."
                  className="w-full py-3 text-gray-900 outline-none"
                  value={searchCity}
                  onChange={(e) => setSearchCity(e.target.value)}
                />
              </div>
              <Link
                to={`/services${searchCity ? `?city=${searchCity}` : ''}`}
                className="bg-primary-600 text-white px-8 py-3 rounded-lg hover:bg-primary-700 transition font-semibold text-center"
              >
                Rechercher
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {STATS.map((s, i) => (
              <div key={i} className="text-center">
                <div className="text-2xl lg:text-3xl font-bold text-primary-700">{s.value}</div>
                <div className="text-sm text-gray-500 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl lg:text-3xl font-bold text-center mb-10">Nos catégories de services</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {CATEGORIES.map((cat) => (
              <Link
                key={cat.slug}
                to={`/services?category=${cat.slug}`}
                className="bg-white rounded-xl shadow-sm border p-6 text-center hover:shadow-md transition group"
              >
                <div className={`w-14 h-14 rounded-xl ${cat.color} flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition`}>
                  <cat.icon className="h-7 w-7" />
                </div>
                <h3 className="font-semibold text-gray-900">{cat.label}</h3>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Latest ads */}
      {latestAds.length > 0 && (
        <section className="py-16 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl lg:text-3xl font-bold">Derniers services publiés</h2>
              <Link to="/services" className="text-primary-600 hover:text-primary-700 font-medium flex items-center">
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
      <section className="py-20 bg-gradient-to-r from-primary-600 to-primary-800 text-white">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-6">Vous êtes professionnel de l'énergie verte ?</h2>
          <p className="text-xl text-primary-100 mb-8">
            Rejoignez BigWatts et accédez à des milliers de propriétaires à la recherche de vos services.
          </p>
          <Link
            to="/register"
            className="inline-flex items-center bg-white text-primary-700 px-8 py-4 rounded-xl font-bold text-lg hover:bg-gray-50 transition shadow-lg"
          >
            Inscrivez-vous gratuitement <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
        </div>
      </section>
    </div>
  );
}
