import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { authAPI, adsAPI, bookingsAPI } from '../../services/api';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Card } from '../../components/ui';
import {
  PlusCircle, CheckCircle, ArrowRight,
  FileText, CalendarCheck, Sparkles, ChevronRight,
  UserCircle,
} from 'lucide-react';

/* ─── Shared onboarding steps & logic (also used by Dashboard widget) ─── */
export const ONBOARDING_STEPS = [
  {
    id: 'profile',
    icon: UserCircle,
    title: 'Complétez votre profil',
    description: 'Renseignez vos informations personnelles (nom, prénom, téléphone). Obligatoire avant de publier une annonce.',
    link: '/dashboard/profile',
    linkLabel: 'Compléter mon profil',
  },
  {
    id: 'ad',
    icon: PlusCircle,
    title: 'Créez votre première annonce',
    description: 'Publiez un service pour que les propriétaires puissent vous trouver.',
    link: '/dashboard/ads/new',
    linkLabel: 'Créer une annonce',
  },
  {
    id: 'document',
    icon: FileText,
    title: 'Ajoutez un document ou certification',
    description: 'Téléversez au moins un document (RGE, assurance, Kbis…) pour rassurer vos clients.',
    link: '/dashboard/documents',
    linkLabel: 'Ajouter un document',
  },
  {
    id: 'availability',
    icon: CalendarCheck,
    title: 'Configurez vos disponibilités',
    description: 'Définissez votre calendrier de disponibilité pour recevoir des demandes.',
    link: '/dashboard/availability',
    linkLabel: 'Gérer mes disponibilités',
  },
];

/** Check if user profile is sufficiently completed (first_name, last_name, phone). */
export function isProfileComplete(userData) {
  return !!(userData?.first_name?.trim() && userData?.last_name?.trim() && userData?.phone?.trim());
}

export function computeOnboardingFlags(userData, adCount, docCount, slotCount) {
  return {
    profile: isProfileComplete(userData),
    ad: adCount > 0,
    document: docCount > 0,
    availability: slotCount > 0,
  };
}

export async function fetchOnboardingData() {
  const [meRes, adsRes, docsRes, slotsRes] = await Promise.all([
    authAPI.getMe(),
    adsAPI.getMyAds().catch(() => ({ data: { results: [] } })),
    authAPI.getDocuments().catch(() => ({ data: [] })),
    bookingsAPI.getSlots().catch(() => ({ data: { results: [] } })),
  ]);
  const adCount = adsRes.data?.results?.length ?? adsRes.data?.length ?? 0;
  const docCount = Array.isArray(docsRes.data) ? docsRes.data.length
    : (docsRes.data?.results?.length ?? 0);
  const slotCount = Array.isArray(slotsRes.data) ? slotsRes.data.length
    : (slotsRes.data?.results?.length ?? slotsRes.data?.length ?? 0);
  return computeOnboardingFlags(meRes.data, adCount, docCount, slotCount);
}

/* ─── Full-page Onboarding ─── */
export default function Onboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [completion, setCompletion] = useState({ profile: false, ad: false, document: false, availability: false });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && user.role !== 'prestataire') {
      navigate('/dashboard', { replace: true });
      return;
    }
    fetchOnboardingData()
      .then(setCompletion)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  const completedCount = Object.values(completion).filter(Boolean).length;
  const totalSteps = ONBOARDING_STEPS.length;
  const allDone = completedCount === totalSteps;
  const progressPct = Math.round((completedCount / totalSteps) * 100);

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-brand-600 dark:text-brand-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-black dark:text-white">
                Bienvenue sur BigWatts{user?.first_name ? `, ${user.first_name}` : ''} !
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Configurez votre espace prestataire en quelques étapes.
              </p>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <Card className="p-5 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-black dark:text-white">
              {allDone ? 'Configuration terminée !' : `${completedCount} / ${totalSteps} étapes complétées`}
            </span>
            <span className="text-xs font-medium text-gray-400">{progressPct}%</span>
          </div>
          <div className="w-full h-2.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-300 transition-all duration-700"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </Card>

        {/* Steps */}
        <div className="space-y-4">
          {ONBOARDING_STEPS.map((step, idx) => {
            const done = completion[step.id];
            return (
              <Card
                key={step.id}
                className={`p-5 transition border-l-4 ${
                  done
                    ? 'border-l-green-500 bg-green-50/50 dark:bg-green-900/10'
                    : 'border-l-gray-300 dark:border-l-gray-700'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                    done
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500'
                  }`}>
                    {done ? <CheckCircle className="h-5 w-5" /> : <span className="text-sm font-bold">{idx + 1}</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <step.icon className={`h-4 w-4 ${done ? 'text-green-500' : 'text-gray-400'}`} />
                      <h3 className={`font-semibold ${
                        done ? 'text-green-700 dark:text-green-400 line-through' : 'text-black dark:text-white'
                      }`}>
                        {step.title}
                      </h3>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">{step.description}</p>
                    {!done && (
                      <Link
                        to={step.link}
                        className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-500 transition"
                      >
                        {step.linkLabel} <ChevronRight className="h-4 w-4" />
                      </Link>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* CTA when done */}
        {allDone && (
          <div className="mt-8 text-center">
            <Card className="p-6 bg-gradient-to-br from-brand-50 to-green-50 dark:from-brand-900/20 dark:to-green-900/20 border-brand-200 dark:border-brand-800">
              <CheckCircle className="h-10 w-10 text-green-500 mx-auto mb-3" />
              <h2 className="text-lg font-bold text-black dark:text-white mb-1">Vous êtes prêt !</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Votre profil est configuré. Les propriétaires peuvent maintenant vous trouver et vous contacter.
              </p>
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-2 bg-black dark:bg-white text-white dark:text-black px-6 py-2.5 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 transition font-semibold text-sm"
              >
                Accéder à mon tableau de bord <ArrowRight className="h-4 w-4" />
              </Link>
            </Card>
          </div>
        )}

        {/* Skip link */}
        {!allDone && (
          <div className="mt-6 text-center">
            <Link
              to="/dashboard"
              className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition underline underline-offset-2"
            >
              Passer cette étape et aller au tableau de bord
            </Link>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
