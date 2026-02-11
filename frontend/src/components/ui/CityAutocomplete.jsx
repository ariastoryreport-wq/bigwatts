import { useState, useEffect, useRef, useCallback } from 'react';
import { MapPin } from 'lucide-react';
import { useCountry } from '../../context/CountryContext';
import api from '../../api';

/**
 * CityAutocomplete — reusable city input with dropdown suggestions.
 *
 * France  → geo.api.gouv.fr (official government API)
 * Canada  → self-hosted /api/countries/locations/cities/ (Statistics Canada data)
 *
 * Props:
 *   value        — current city string
 *   onChange      — (cityName: string) => void
 *   onLocationResolved — (location: {postalCode, region, regionCode}) => void (optional)
 *   placeholder   — input placeholder text
 *   className     — CSS class for the input element
 *   required      — HTML required attribute
 *   label         — optional label text (rendered above input)
 *   labelClass    — optional CSS class for the label
 *   compact       — if true, renders without wrapper div (for inline use)
 */

const DEBOUNCE_MS = 300;

// French government API for city autocompletion
function searchFrenchCities(query) {
  return fetch(
    `https://geo.api.gouv.fr/communes?nom=${encodeURIComponent(query)}&fields=nom,codesPostaux,departement,population&boost=population&limit=7`
  )
    .then((r) => r.json())
    .then((data) =>
      data.map((c) => ({
        name: c.nom,
        postalCode: c.codesPostaux?.[0] || '',
        region: c.departement?.nom || '',
        population: c.population || 0,
      }))
    );
}

// For Canada — self-hosted backend with Statistics Canada data
function searchCanadianCities(query) {
  return api
    .get('/countries/locations/cities/', { params: { search: query, country: 'CA' } })
    .then((res) =>
      (res.data || []).map((c) => ({
        name: c.city_name,
        postalCode: c.postal_code || '',
        region: c.region_name || '',
        regionCode: c.region_code || '',
        population: c.population || 0,
        latitude: c.latitude,
        longitude: c.longitude,
      }))
    )
    .catch(() => []);
}

export default function CityAutocomplete({
  value = '',
  onChange,
  onLocationResolved,
  placeholder = 'Ville...',
  className = '',
  required = false,
  label,
  labelClass,
  compact = false,
}) {
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const wrapperRef = useRef(null);
  const debounceRef = useRef(null);
  const { countryCode } = useCountry();

  // Sync external value changes
  useEffect(() => {
    setQuery(value);
  }, [value]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const fetchSuggestions = useCallback(
    (q) => {
      if (!q || q.length < 2) {
        setSuggestions([]);
        setIsOpen(false);
        return;
      }

      const searchFn = countryCode === 'CA' ? searchCanadianCities : searchFrenchCities;

      searchFn(q)
        .then((results) => {
          setSuggestions(results);
          setIsOpen(results.length > 0);
          setActiveIndex(-1);
        })
        .catch(() => {
          setSuggestions([]);
          setIsOpen(false);
        });
    },
    [countryCode]
  );

  const handleInputChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    onChange(val);

    // Debounce API call
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(val), DEBOUNCE_MS);
  };

  const selectCity = (city) => {
    setQuery(city.name);
    onChange(city.name);
    if (onLocationResolved) {
      onLocationResolved({
        postalCode: city.postalCode,
        region: city.region,
        regionCode: city.regionCode || '',
      });
    }
    setSuggestions([]);
    setIsOpen(false);
  };

  const handleKeyDown = (e) => {
    if (!isOpen || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      selectCity(suggestions[activeIndex]);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const handleBlur = () => {
    // Delay close to allow click on suggestion
    setTimeout(() => setIsOpen(false), 200);
  };

  const input = (
    <div className="relative" ref={wrapperRef}>
      <input
        type="text"
        value={query}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={() => { if (suggestions.length > 0) setIsOpen(true); }}
        onBlur={handleBlur}
        placeholder={placeholder}
        className={className}
        required={required}
        autoComplete="off"
      />

      {/* Dropdown */}
      {isOpen && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-[9000] max-h-60 overflow-y-auto">
          {suggestions.map((city, idx) => (
            <button
              key={`${city.name}-${city.postalCode}-${idx}`}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => selectCity(city)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-sm transition ${
                idx === activeIndex
                  ? 'bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              <MapPin className="h-3.5 w-3.5 text-gray-400 shrink-0" />
              <div className="min-w-0">
                <span className="font-medium">{city.name}</span>
                {(city.postalCode || city.region) && (
                  <span className="text-xs text-gray-400 ml-1.5">
                    {city.postalCode && city.postalCode}
                    {city.postalCode && city.region && ' · '}
                    {city.region}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );

  if (compact) return input;

  return (
    <div>
      {label && <label className={labelClass}>{label}</label>}
      {input}
    </div>
  );
}
