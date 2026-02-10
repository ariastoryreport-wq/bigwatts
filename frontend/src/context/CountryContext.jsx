import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { countriesAPI } from '../services/api';

const CountryContext = createContext(null);

const DEFAULT_COUNTRY = {
  code: 'FR',
  name: 'France',
  name_en: 'France',
  language: 'fr',
  currency: 'EUR',
  currency_symbol: '€',
  flag_emoji: '🇫🇷',
  regions: [],
  timezone: 'Europe/Paris',
};

export function CountryProvider({ children }) {
  const [countries, setCountries] = useState([]);
  const [currentCountry, setCurrentCountry] = useState(() => {
    const saved = localStorage.getItem('country');
    return saved ? JSON.parse(saved) : DEFAULT_COUNTRY;
  });
  const [loading, setLoading] = useState(true);
  const [detected, setDetected] = useState(false);

  // Load all countries
  useEffect(() => {
    countriesAPI.getCountries()
      .then(({ data }) => {
        setCountries(data);
        // If we have a saved country, update with full data
        const saved = localStorage.getItem('country');
        if (saved) {
          const savedCode = JSON.parse(saved).code;
          const found = data.find((c) => c.code === savedCode);
          if (found) {
            setCurrentCountry(found);
            localStorage.setItem('country', JSON.stringify(found));
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Auto-detect country on first visit
  useEffect(() => {
    const hasManualChoice = localStorage.getItem('country_manual');
    if (hasManualChoice) return;
    if (countries.length === 0) return;

    countriesAPI.detect()
      .then(({ data }) => {
        const found = countries.find((c) => c.code === data.country_code);
        if (found) {
          setCurrentCountry(found);
          localStorage.setItem('country', JSON.stringify(found));
          setDetected(true);
        }
      })
      .catch(() => {});
  }, [countries]);

  const switchCountry = useCallback((code) => {
    const found = countries.find((c) => c.code === code);
    if (found) {
      setCurrentCountry(found);
      localStorage.setItem('country', JSON.stringify(found));
      localStorage.setItem('country_manual', 'true');
    }
  }, [countries]);

  const formatPrice = useCallback((amount) => {
    if (amount == null) return '';
    try {
      const locale = currentCountry.language === 'fr' ? 'fr-FR' : 'en-CA';
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currentCountry.currency,
      }).format(amount);
    } catch {
      return `${currentCountry.currency_symbol}${Number(amount).toFixed(2)}`;
    }
  }, [currentCountry]);

  return (
    <CountryContext.Provider value={{
      countries,
      currentCountry,
      switchCountry,
      formatPrice,
      loading,
      detected,
      countryCode: currentCountry.code,
      currency: currentCountry.currency,
      currencySymbol: currentCountry.currency_symbol,
      regions: currentCountry.regions || [],
      flagEmoji: currentCountry.flag_emoji,
    }}>
      {children}
    </CountryContext.Provider>
  );
}

export const useCountry = () => {
  const context = useContext(CountryContext);
  if (!context) throw new Error('useCountry must be used within CountryProvider');
  return context;
};
