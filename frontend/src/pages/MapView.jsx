import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { adsAPI } from '../services/api';
import { useCountry } from '../context/CountryContext';
import { LoadingSpinner, PriceDisplay, Badge } from '../components/ui';
import { MapPin, List, Grid, Star, X } from 'lucide-react';

const COUNTRY_MAP_DEFAULTS = {
  FR: { center: [46.603354, 1.888334], zoom: 6 },
  CA: { center: [56.130366, -106.346771], zoom: 4 },
};

export default function MapView() {
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAd, setSelectedAd] = useState(null);
  const [viewMode, setViewMode] = useState('map'); // 'map' or 'list'
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markersRef = useRef([]);
  const { countryCode } = useCountry();

  useEffect(() => {
    setLoading(true);
    adsAPI.getAds({ page_size: 100, country: countryCode })
      .then(({ data }) => {
        const results = data.results || data;
        setAds(results.filter(a => a.latitude && a.longitude));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [countryCode]);

  useEffect(() => {
    if (viewMode !== 'map' || loading || !mapRef.current || ads.length === 0) return;

    // Load Leaflet CSS
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    // Load Leaflet JS
    const loadLeaflet = () => {
      return new Promise((resolve) => {
        if (window.L) { resolve(window.L); return; }
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.onload = () => resolve(window.L);
        document.body.appendChild(script);
      });
    };

    loadLeaflet().then((L) => {
      // Destroy previous map if any
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }

      const defaults = COUNTRY_MAP_DEFAULTS[countryCode] || COUNTRY_MAP_DEFAULTS.FR;
      const map = L.map(mapRef.current).setView(defaults.center, defaults.zoom);
      mapInstance.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 18,
      }).addTo(map);

      // Custom green marker
      const greenIcon = L.divIcon({
        className: 'custom-marker',
        html: `<div style="background:#72f6ae;width:28px;height:28px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="black" stroke="none"><path d="M13 2L3 14h9l-1 10 10-12h-9l1-10z"/></svg>
        </div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      // Clear old markers
      markersRef.current.forEach(m => m.remove());
      markersRef.current = [];

      ads.forEach(ad => {
        const marker = L.marker([ad.latitude, ad.longitude], { icon: greenIcon })
          .addTo(map)
          .on('click', () => setSelectedAd(ad));

        marker.bindTooltip(ad.title, { direction: 'top', offset: [0, -16] });
        markersRef.current.push(marker);
      });

      // Fit bounds
      if (ads.length > 0) {
        const bounds = L.latLngBounds(ads.map(a => [a.latitude, a.longitude]));
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 12 });
      }
    });

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, [ads, loading, viewMode, countryCode]);

  if (loading) return (
    <div className="page-padding">
      <LoadingSpinner />
    </div>
  );

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col">
      {/* Toolbar */}
      <div className="bg-white dark:bg-gray-950 border-b divider px-4 py-3 flex items-center justify-between relative z-[1000]">
        <div>
          <h1 className="text-lg font-bold text-black dark:text-white flex items-center gap-2">
            <MapPin className="h-5 w-5 text-brand-300" />
            Carte des services
          </h1>
          <p className="text-sm text-muted">{ads.length} services géolocalisés</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('map')}
            className={`btn-icon ${viewMode === 'map' ? 'bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-300' : ''}`}
          >
            <Grid className="h-5 w-5" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`btn-icon ${viewMode === 'list' ? 'bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-300' : ''}`}
          >
            <List className="h-5 w-5" />
          </button>
        </div>
      </div>

      {viewMode === 'map' ? (
        <div className="flex-1 relative">
          <div ref={mapRef} className="w-full h-full" />

          {/* Selected ad panel */}
          {selectedAd && (
            <div className="absolute bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-96 z-[1000]">
              <div className="card p-4">
                <button
                  onClick={() => setSelectedAd(null)}
                  className="absolute top-2 right-2 btn-icon"
                >
                  <X className="h-4 w-4" />
                </button>
                {(selectedAd.image_1 || selectedAd.image_url) && (
                  <img
                    src={selectedAd.image_1 || selectedAd.image_url}
                    alt={selectedAd.title}
                    className="w-full h-32 object-cover rounded-lg mb-3"
                  />
                )}
                <Link to={`/services/${selectedAd.id}`} className="group">
                  <h3 className="font-semibold text-black dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-300 transition mb-1">
                    {selectedAd.title}
                  </h3>
                </Link>
                {selectedAd.category_name && <Badge variant="primary" className="mb-2">{selectedAd.category_name}</Badge>}
                <div className="flex items-center justify-between mt-2">
                  <PriceDisplay price={selectedAd.price} priceType={selectedAd.price_type} />
                  <div className="flex items-center text-sm text-muted">
                    <MapPin className="h-3.5 w-3.5 mr-1" /> {selectedAd.city}
                  </div>
                </div>
                {selectedAd.provider_rating > 0 && (
                  <div className="flex items-center text-sm text-muted mt-2">
                    <Star className="h-4 w-4 fill-brand-300 text-brand-300 mr-1" />
                    {Number(selectedAd.provider_rating).toFixed(1)}
                    <span className="mx-2">·</span>
                    {selectedAd.provider_name || selectedAd.provider_username}
                  </div>
                )}
                <Link to={`/services/${selectedAd.id}`} className="btn-brand btn-sm w-full mt-3 text-center">
                  Voir le détail
                </Link>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 overflow-auto p-4">
          <div className="max-w-3xl mx-auto space-y-3">
            {ads.map(ad => (
              <Link key={ad.id} to={`/services/${ad.id}`} className="card-hover p-4 flex gap-4 group block">
                {(ad.image_1 || ad.image_url) && (
                  <img src={ad.image_1 || ad.image_url} alt="" className="w-24 h-24 rounded-lg object-cover shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-black dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-300 transition truncate">
                    {ad.title}
                  </h3>
                  <div className="flex items-center gap-3 text-sm text-muted mt-1">
                    <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {ad.city}</span>
                    {ad.provider_rating > 0 && (
                      <span className="flex items-center gap-1"><Star className="h-3.5 w-3.5 fill-brand-300 text-brand-300" /> {Number(ad.provider_rating).toFixed(1)}</span>
                    )}
                  </div>
                  <div className="mt-2">
                    <PriceDisplay price={ad.price} priceType={ad.price_type} />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
