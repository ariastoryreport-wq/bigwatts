import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCountry } from '../../context/CountryContext';
import { useAuth } from '../../context/AuthContext';
import { AlertTriangle } from 'lucide-react';
import Logo from '../ui/Logo';

export default function Footer() {
  const { countries, currentCountry, switchCountry } = useCountry();
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [switchWarning, setSwitchWarning] = useState(null); // { code, name, flag_emoji }
  const [logoutWarning, setLogoutWarning] = useState(false);

  const handleAnonSwitch = (c) => {
    if (c.code === currentCountry.code) return;
    setSwitchWarning(c);
  };

  const confirmAnonSwitch = () => {
    if (!switchWarning) return;
    switchCountry(switchWarning.code);
    setSwitchWarning(null);
  };

  const handleAuthCountryChange = async () => {
    await logout();
    navigate('/');
    setLogoutWarning(false);
  };

  return (
    <>
      <footer className="bg-black text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Brand */}
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <Logo forceDark />
                <span className="font-display text-3xl font-bold text-white tracking-tight">BIGWATTS</span>
              </div>
              <p className="text-gray-400 max-w-md">
                La marketplace qui connecte les professionnels de l'énergie verte avec les propriétaires. 
                Panneaux solaires, bornes de recharge, pompes à chaleur et plus encore.
              </p>
            </div>

            {/* Links */}
            <div>
              <h3 className="font-semibold mb-4">Navigation</h3>
              <ul className="space-y-2">
                <li><Link to="/services" className="text-gray-400 hover:text-brand-300 transition">Services</Link></li>
                <li><Link to="/providers" className="text-gray-400 hover:text-brand-300 transition">Prestataires</Link></li>
                <li><Link to="/map" className="text-gray-400 hover:text-brand-300 transition">Carte</Link></li>
                <li><Link to="/incentives" className="text-gray-400 hover:text-brand-300 transition">Aides</Link></li>
              </ul>
            </div>

            {/* Country + Contact */}
            <div>
              <h3 className="font-semibold mb-4">Pays</h3>
              {!isAuthenticated ? (
                /* Anonymous: clickable country list with confirmation */
                <div className="space-y-1.5 mb-6">
                  {countries.map((c) => (
                    <button
                      key={c.code}
                      onClick={() => handleAnonSwitch(c)}
                      className={`flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm transition ${
                        c.code === currentCountry.code
                          ? 'bg-white/10 text-white font-semibold'
                          : 'text-gray-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <span className="text-lg">{c.flag_emoji}</span>
                      <span>{c.name}</span>
                      <span className="text-xs text-gray-500 ml-auto">{c.currency}</span>
                    </button>
                  ))}
                </div>
              ) : (
                /* Authenticated: static list + change link */
                <div className="mb-6">
                  <ul className="space-y-1.5 mb-3">
                    {countries.map((c) => (
                      <li key={c.code} className="flex items-center gap-2.5 py-1.5 text-sm text-gray-400">
                        <span className="text-lg">{c.flag_emoji}</span>
                        <span>{c.name}</span>
                        <span className="text-xs text-gray-500 ml-auto">{c.currency}</span>
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => setLogoutWarning(true)}
                    className="text-sm text-gray-400 underline hover:text-brand-300 transition"
                  >
                    Changer de pays ?
                  </button>
                </div>
              )}

              <h3 className="font-semibold mb-4">Contact</h3>
              <ul className="space-y-2 text-gray-400">
                <li>contact@bigwatts.fr</li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-10 pt-6 text-center text-gray-500 text-sm">
            © {new Date().getFullYear()} BigWatts. Tous droits réservés.
          </div>
        </div>
      </footer>

      {/* Country switch confirmation — anonymous users */}
      {switchWarning && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setSwitchWarning(null)}>
          <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-sm w-full p-6 text-center border border-gray-200 dark:border-gray-800" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
            <h3 className="text-lg font-bold text-black dark:text-white mb-2">Changer de pays ?</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
              Passer de {currentCountry.flag_emoji} {currentCountry.name} à {switchWarning.flag_emoji} {switchWarning.name}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              Les services, aides et devise seront adaptés au nouveau pays.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setSwitchWarning(null)} className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-800 transition text-black dark:text-white">Annuler</button>
              <button onClick={confirmAnonSwitch} className="flex-1 px-4 py-2.5 bg-black dark:bg-white text-white dark:text-black rounded-lg text-sm font-bold hover:bg-gray-800 dark:hover:bg-gray-200 transition">Confirmer</button>
            </div>
          </div>
        </div>
      )}

      {/* Country change warning — authenticated users (will disconnect) */}
      {logoutWarning && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setLogoutWarning(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-sm w-full p-6 text-center border border-gray-200 dark:border-gray-800" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <h3 className="text-lg font-bold text-black dark:text-white mb-2">Changer de pays ?</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              Pour changer de pays, vous serez déconnecté. Vous pourrez ensuite sélectionner un nouveau pays et vous reconnecter.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setLogoutWarning(false)} className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-800 transition text-black dark:text-white">Annuler</button>
              <button onClick={handleAuthCountryChange} className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg text-sm font-bold hover:bg-red-700 transition">Me déconnecter</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
