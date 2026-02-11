import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ArrowLeft, CheckCircle2, Sparkles, Sun, Thermometer, Plug, Layers, Battery, Wind, Home, Building2, Zap, MapPin } from 'lucide-react';
import { PageHeader } from '../components/ui';
import { useCountry } from '../context/CountryContext';

const INSTALLATION_TYPES = [
  { value: 'solar', label: 'Panneaux solaires', Icon: Sun },
  { value: 'heat_pump', label: 'Pompe à chaleur', Icon: Thermometer },
  { value: 'ev_charger', label: 'Borne de recharge VE', Icon: Plug },
  { value: 'insulation', label: 'Isolation thermique', Icon: Layers },
  { value: 'battery', label: 'Batterie de stockage', Icon: Battery },
  { value: 'wind', label: 'Éolienne', Icon: Wind },
];

const PROPERTY_TYPES = [
  { value: 'house', label: 'Maison individuelle', Icon: Home },
  { value: 'apartment', label: 'Appartement', Icon: Building2 },
  { value: 'commercial', label: 'Local commercial', Icon: Zap },
  { value: 'other', label: 'Autre', Icon: MapPin },
];

const STEPS = [
  { title: 'Localisation' },
  { title: 'Propriété' },
  { title: 'Installation' },
  { title: 'Budget' },
];

export default function IncentiveChecker() {
  const navigate = useNavigate();
  const { countries, currentCountry, countryCode } = useCountry();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    country: countryCode,
    region: '',
    property_type: '',
    is_owner: true,
    installation_type: '',
    annual_income: '',
    estimated_budget: '',
  });

  // Get regions for the selected country
  const selectedCountryObj = countries.find((c) => c.code === form.country) || currentCountry;
  const countryRegions = selectedCountryObj?.regions || [];

  const update = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const canNext = () => {
    if (step === 0) return true; // region is optional
    if (step === 1) return !!form.property_type;
    if (step === 2) return !!form.installation_type;
    if (step === 3) return true; // budget/income optional
    return true;
  };

  const handleNext = () => {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      // Submit - navigate to results with form data in state
      navigate('/incentives/results', { state: form });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-10">
      <div className="max-w-2xl mx-auto px-4">
        <PageHeader
          title="Vérificateur d'aides & subventions"
          subtitle="Découvrez les aides auxquelles vous avez droit pour votre projet d'énergie verte en quelques clics."
        />

        {/* Progress bar */}
        <div className="mt-8 mb-10">
          <div className="flex items-center justify-between mb-3">
            {STEPS.map((s, i) => {
              const done = i < step;
              const active = i === step;
              return (
                <div key={i} className="flex flex-col items-center flex-1">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                    done ? 'bg-black dark:bg-white text-white dark:text-black' :
                    active ? 'bg-black dark:bg-white text-white dark:text-black' :
                    'bg-gray-200 dark:bg-gray-800 text-gray-500'
                  }`}>
                    {done ? <CheckCircle2 className="h-5 w-5" /> : i + 1}
                  </div>
                  <span className={`text-xs mt-1 ${active ? 'font-bold text-black dark:text-white' : 'text-gray-500'}`}>
                    {s.title}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="w-full h-2 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-black dark:bg-white transition-all duration-500 rounded-full"
              style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Step content */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 sm:p-8 min-h-[320px] flex flex-col">
          {/* Step 0: Location */}
          {step === 0 && (
            <div className="flex-1 space-y-6">
              <h2 className="text-xl font-bold text-black dark:text-white">
                Où se situe votre projet ?
              </h2>
              <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Pays sélectionné</p>
                <p className="text-lg font-bold text-black dark:text-white flex items-center gap-2">
                  <span className="text-2xl">{selectedCountryObj?.flag_emoji}</span>
                  {selectedCountryObj?.name || 'France'}
                </p>
              </div>
              {countryRegions.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Région <span className="text-gray-400 text-xs">(optionnel – pour les aides régionales)</span>
                  </label>
                  <select
                    value={form.region}
                    onChange={(e) => update('region', e.target.value)}
                    className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-3 bg-white dark:bg-gray-800 text-black dark:text-white focus:ring-2 focus:ring-brand-300"
                  >
                    <option value="">— Toutes les régions —</option>
                    {countryRegions.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* Step 1: Property */}
          {step === 1 && (
            <div className="flex-1 space-y-6">
              <h2 className="text-xl font-bold text-black dark:text-white">
                Quel type de bien ?
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {PROPERTY_TYPES.map((pt) => (
                  <button
                    key={pt.value}
                    onClick={() => update('property_type', pt.value)}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      form.property_type === pt.value
                        ? 'border-gray-900 dark:border-white bg-gray-50 dark:bg-gray-800'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500'
                    }`}
                  >
                    <pt.Icon className="h-6 w-6 text-gray-700 dark:text-gray-300" />
                    <p className="mt-2 font-medium text-black dark:text-white text-sm">{pt.label}</p>
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-4">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Êtes-vous propriétaire ?
                </label>
                <div className="flex gap-2">
                  {[true, false].map((val) => (
                    <button
                      key={String(val)}
                      onClick={() => update('is_owner', val)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                        form.is_owner === val
                          ? 'bg-black dark:bg-white text-white dark:text-black'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                      }`}
                    >
                      {val ? 'Oui' : 'Non'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Installation type */}
          {step === 2 && (
            <div className="flex-1 space-y-6">
              <h2 className="text-xl font-bold text-black dark:text-white">
                Quel type d'installation ?
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {INSTALLATION_TYPES.map((it) => (
                  <button
                    key={it.value}
                    onClick={() => update('installation_type', it.value)}
                    className={`p-4 rounded-xl border-2 text-center transition-all ${
                      form.installation_type === it.value
                        ? 'border-gray-900 dark:border-white bg-gray-50 dark:bg-gray-800'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500'
                    }`}
                  >
                    <it.Icon className="h-7 w-7 text-gray-700 dark:text-gray-300 mx-auto" />
                    <p className="mt-2 font-medium text-black dark:text-white text-sm">{it.label}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Budget & Income */}
          {step === 3 && (
            <div className="flex-1 space-y-6">
              <h2 className="text-xl font-bold text-black dark:text-white">
                Budget & revenus
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Ces informations sont <strong>optionnelles</strong> mais permettent d'affiner les résultats et d'estimer vos économies.
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Budget estimé du projet ({selectedCountryObj?.currency_symbol || '€'})
                </label>
                <input
                  type="number"
                  min="0"
                  placeholder="ex : 15000"
                  value={form.estimated_budget}
                  onChange={(e) => update('estimated_budget', e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-3 bg-white dark:bg-gray-800 text-black dark:text-white focus:ring-2 focus:ring-brand-300"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Revenu fiscal de référence annuel ({selectedCountryObj?.currency_symbol || '€'})
                </label>
                <input
                  type="number"
                  min="0"
                  placeholder="ex : 28000"
                  value={form.annual_income}
                  onChange={(e) => update('annual_income', e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-3 bg-white dark:bg-gray-800 text-black dark:text-white focus:ring-2 focus:ring-brand-300"
                />
              </div>
            </div>
          )}

          {/* Navigation buttons */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200 dark:border-gray-800">
            {step > 0 ? (
              <button
                onClick={() => setStep(step - 1)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition font-medium"
              >
                <ArrowLeft className="h-4 w-4" /> Retour
              </button>
            ) : (
              <div />
            )}
            <button
              onClick={handleNext}
              disabled={!canNext()}
              className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-black dark:bg-white text-white dark:text-black font-bold hover:bg-gray-800 dark:hover:bg-gray-200 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {step === STEPS.length - 1 ? (
                <>
                  <Sparkles className="h-4 w-4" /> Voir les aides
                </>
              ) : (
                <>
                  Suivant <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Info footer */}
        <p className="text-center text-xs text-gray-400 mt-6">
          Outil gratuit et sans engagement. Les montants sont indicatifs et basés sur les programmes officiels en vigueur.
        </p>
      </div>
    </div>
  );
}
