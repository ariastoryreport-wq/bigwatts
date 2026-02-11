import { useState, useEffect, useRef, useCallback } from 'react';
import { Hash } from 'lucide-react';
import { useCountry } from '../../context/CountryContext';

/**
 * PostalCodeAutocomplete — reusable postal code input with dropdown suggestions.
 *
 * Props:
 *   value         — current postal code string
 *   onChange       — (postalCode: string) => void
 *   onCityResolved — (cityName: string) => void  (optional — auto-fills a city field)
 *   placeholder    — input placeholder text
 *   className      — CSS class for the input element
 *   required       — HTML required attribute
 *   compact        — if true, renders without wrapper div
 */

const DEBOUNCE_MS = 250;

function searchFrenchPostalCodes(query) {
  // The geo API can search by postal code or city name via the /communes endpoint
  const isNumeric = /^\d+$/.test(query);
  const url = isNumeric
    ? `https://geo.api.gouv.fr/communes?codePostal=${encodeURIComponent(query)}&fields=nom,codesPostaux,departement,population&limit=10`
    : `https://geo.api.gouv.fr/communes?nom=${encodeURIComponent(query)}&fields=nom,codesPostaux,departement,population&boost=population&limit=7`;

  return fetch(url)
    .then((r) => r.json())
    .then((data) => {
      const results = [];
      data.forEach((c) => {
        // If searching by postal code, only show matching codes
        const codes = isNumeric
          ? (c.codesPostaux || []).filter((cp) => cp.startsWith(query))
          : (c.codesPostaux || []).slice(0, 1);
        codes.forEach((cp) => {
          results.push({
            postalCode: cp,
            city: c.nom,
            region: c.departement?.nom || '',
          });
        });
      });
      // Deduplicate
      const seen = new Set();
      return results.filter((r) => {
        const key = `${r.postalCode}-${r.city}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      }).slice(0, 8);
    });
}

function searchCanadianPostalCodes(query) {
  // Canada doesn't have a free postal code API like France
  // Return empty — the field remains a plain text input for CA
  return Promise.resolve([]);
}

export default function PostalCodeAutocomplete({
  value = '',
  onChange,
  onCityResolved,
  placeholder = 'Code postal...',
  className = '',
  required = false,
  compact = false,
}) {
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const wrapperRef = useRef(null);
  const debounceRef = useRef(null);
  const { countryCode } = useCountry();

  useEffect(() => {
    setQuery(value);
  }, [value]);

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

      const searchFn = countryCode === 'CA' ? searchCanadianPostalCodes : searchFrenchPostalCodes;
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
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(val), DEBOUNCE_MS);
  };

  const selectItem = (item) => {
    setQuery(item.postalCode);
    onChange(item.postalCode);
    if (onCityResolved) onCityResolved(item.city);
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
      selectItem(suggestions[activeIndex]);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const handleBlur = () => {
    setTimeout(() => setIsOpen(false), 200);
  };

  return (
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

      {isOpen && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-[9000] max-h-60 overflow-y-auto">
          {suggestions.map((item, idx) => (
            <button
              key={`${item.postalCode}-${item.city}-${idx}`}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => selectItem(item)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-sm transition ${
                idx === activeIndex
                  ? 'bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              <Hash className="h-3.5 w-3.5 text-gray-400 shrink-0" />
              <div className="min-w-0">
                <span className="font-medium">{item.postalCode}</span>
                <span className="text-xs text-gray-400 ml-1.5">
                  {item.city}
                  {item.region && ` · ${item.region}`}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
