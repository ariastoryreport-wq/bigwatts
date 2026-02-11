import { useState, useEffect } from 'react';
import { useCountry } from '../../context/CountryContext';
import { useAuth } from '../../context/AuthContext';
import { Globe } from 'lucide-react';

const COUNTRY_OPTIONS = [
  { code: 'FR', name: 'France', flag: '🇫🇷' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦' },
];

/**
 * Modal shown on first visit to ask which country the user lives in.
 * Only shows for unauthenticated users — authenticated users have their
 * country locked to their account.
 */
export default function CountryPickerModal() {
  const [show, setShow] = useState(false);
  const { switchCountry } = useCountry();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    // Never show for authenticated users
    if (isAuthenticated) return;
    const alreadyPicked = localStorage.getItem('country_manual');
    const dismissed = localStorage.getItem('country_popup_dismissed');
    if (!alreadyPicked && !dismissed) {
      // Small delay so it doesn't flash on page load
      const t = setTimeout(() => setShow(true), 600);
      return () => clearTimeout(t);
    }
  }, [isAuthenticated]);

  const handleSelect = (code) => {
    switchCountry(code);
    localStorage.setItem('country_popup_dismissed', 'true');
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-md w-full mx-4 p-8 text-center animate-in border border-gray-200 dark:border-gray-800">
        <div className="w-14 h-14 rounded-full bg-brand-50 dark:bg-brand-900/30 flex items-center justify-center mx-auto mb-5">
          <Globe className="h-7 w-7 text-brand-600 dark:text-brand-300" />
        </div>

        <h2 className="font-display text-2xl font-bold text-black dark:text-white mb-2">
          Vous habitez quel pays ?
        </h2>
        <p className="text-gray-500 dark:text-gray-400 mb-8 text-sm">
          Nous adapterons les services, les aides et la devise à votre région.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {COUNTRY_OPTIONS.map((c) => (
            <button
              key={c.code}
              onClick={() => handleSelect(c.code)}
              className="flex items-center justify-center gap-3 px-8 py-4 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-brand-300 transition-all duration-200 text-black dark:text-white font-semibold text-lg group"
            >
              <span className="text-3xl">{c.flag}</span>
              <span className="group-hover:text-brand-600 dark:group-hover:text-brand-300 transition">{c.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
