import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { authAPI, adsAPI, reviewsAPI, messagingAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { LoadingSpinner, StarRating, Badge, Card } from '../components/ui';
import AdCard from '../components/cards/AdCard';
import { MapPin, Star, Briefcase, Award, Globe, Phone, ArrowLeft, CheckCircle, ShieldCheck, Trophy, Zap, Flag, X } from 'lucide-react';
import toast from 'react-hot-toast';

const REPORT_REASONS = [
  { value: 'spam', label: 'Spam' },
  { value: 'harassment', label: 'Harcèlement' },
  { value: 'fraud', label: 'Fraude' },
  { value: 'inappropriate', label: 'Contenu inapproprié' },
  { value: 'scam', label: 'Arnaque' },
  { value: 'other', label: 'Autre' },
];

const BADGE_ICONS = {
  'shield-check': ShieldCheck,
  'trophy': Trophy,
  'star': Star,
  'zap': Zap,
  'award': Award,
  'check-circle': CheckCircle,
};

const BADGE_COLORS = {
  brand: 'bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-300 border-brand-200 dark:border-brand-800',
  gold: 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-300 border-amber-200 dark:border-amber-800',
  blue: 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 border-blue-200 dark:border-blue-800',
  green: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
};

export default function ProviderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [provider, setProvider] = useState(null);
  const [ads, setAds] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [badges, setBadges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportDetails, setReportDetails] = useState('');
  const [sendingReport, setSendingReport] = useState(false);

  useEffect(() => {
    Promise.all([
      authAPI.getUser(id),
      adsAPI.getAds({ provider: id }),
      reviewsAPI.getReviews({ provider: id }),
      authAPI.getUserBadges(id),
    ]).then(([userRes, adsRes, revRes, badgesRes]) => {
      setProvider(userRes.data);
      setAds(adsRes.data.results || adsRes.data);
      setReviews(revRes.data.results || revRes.data);
      setBadges(badgesRes.data.results || badgesRes.data || []);
    }).catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <LoadingSpinner />;
  if (!provider) return <div className="text-center py-20">Prestataire introuvable.</div>;

  const profile = provider.prestataire_profile || {};

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button onClick={() => navigate(-1)} className="flex items-center text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 mb-6">
        <ArrowLeft className="h-4 w-4 mr-2" /> Retour
      </button>

      {/* Profile header */}
      <Card className="p-8 mb-8">
        <div className="flex flex-col md:flex-row items-start gap-6">
          <div className="w-20 h-20 rounded-full bg-brand-50 dark:bg-brand-900/30 flex items-center justify-center shrink-0">
            {provider.avatar ? (
              <img src={provider.avatar} alt="" className="w-20 h-20 rounded-full object-cover" />
            ) : (
              <span className="text-3xl font-bold text-brand-600 dark:text-brand-300">
                {(provider.first_name?.[0] || provider.username[0]).toUpperCase()}
              </span>
            )}
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-display font-bold text-black dark:text-white">
                {profile.company_name || `${provider.first_name} ${provider.last_name}`}
              </h1>
              {provider.is_verified && <CheckCircle className="h-5 w-5 text-brand-600 dark:text-brand-300" />}
            </div>

            {provider.bio && <p className="text-gray-600 dark:text-gray-400 mb-4">{provider.bio}</p>}

            <div className="flex flex-wrap gap-4 text-sm">
              {provider.city && (
                <span className="flex items-center text-gray-500 dark:text-gray-400"><MapPin className="h-4 w-4 mr-1" />{provider.city}</span>
              )}
              {profile.average_rating > 0 && (
                <span className="flex items-center text-gray-500 dark:text-gray-400">
                  <Star className="h-4 w-4 fill-brand-300 text-brand-300 mr-1" />
                  {Number(profile.average_rating).toFixed(1)} ({profile.total_reviews} avis)
                </span>
              )}
              {profile.completed_projects > 0 && (
                <span className="flex items-center text-gray-500 dark:text-gray-400"><Briefcase className="h-4 w-4 mr-1" />{profile.completed_projects} projets</span>
              )}
              {profile.years_experience > 0 && (
                <span className="flex items-center text-gray-500 dark:text-gray-400"><Award className="h-4 w-4 mr-1" />{profile.years_experience} ans d'exp.</span>
              )}
              {profile.website && (
                <a href={profile.website} target="_blank" rel="noreferrer" className="flex items-center text-brand-600 dark:text-brand-300 hover:text-brand-700 dark:hover:text-brand-200">
                  <Globe className="h-4 w-4 mr-1" />Site web
                </a>
              )}
            </div>

            {/* Certifications */}
            {profile.certifications && (
              <div className="mt-4">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Certifications</p>
                <div className="flex flex-wrap gap-2">
                  {profile.certifications.split(',').map((c, i) => (
                    <Badge key={i} variant="success">{c.trim()}</Badge>
                  ))}
                </div>
              </div>
            )}

            {profile.specialties && (
              <div className="mt-3">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Spécialités</p>
                <div className="flex flex-wrap gap-2">
                  {profile.specialties.split(',').map((s, i) => (
                    <Badge key={i} variant="primary">{s.trim()}</Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Badges */}
            {badges.length > 0 && (
              <div className="mt-4">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Badges & Certifications</p>
                <div className="flex flex-wrap gap-2">
                  {badges.map((ub) => {
                    const IconComp = BADGE_ICONS[ub.badge?.icon] || Award;
                    const colorCls = BADGE_COLORS[ub.badge?.color] || BADGE_COLORS.brand;
                    return (
                      <div
                        key={ub.id}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${colorCls}`}
                        title={ub.badge?.description}
                      >
                        <IconComp className="h-3.5 w-3.5" />
                        {ub.badge?.name}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Report button */}
      {isAuthenticated && user?.id !== Number(id) && (
        <div className="flex justify-end -mt-4 mb-4">
          <button
            onClick={() => setShowReportModal(true)}
            className="text-sm text-gray-400 hover:text-red-500 dark:hover:text-red-400 flex items-center gap-1.5 transition"
          >
            <Flag className="h-3.5 w-3.5" /> Signaler ce profil
          </button>
        </div>
      )}

      {/* Ads */}
      {ads.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-heading font-bold text-black dark:text-white mb-4">Services proposés ({ads.length})</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {ads.map((ad) => <AdCard key={ad.id} ad={ad} />)}
          </div>
        </div>
      )}

      {/* Reviews */}
      <Card className="p-6">
        <h2 className="text-xl font-heading font-bold text-black dark:text-white mb-4">Avis ({reviews.length})</h2>
        {reviews.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400">Pas encore d'avis.</p>
        ) : (
          <div className="space-y-4">
            {reviews.map((rev) => (
              <div key={rev.id} className="border-b pb-4 last:border-0">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{rev.author_name || rev.author_username}</span>
                    <StarRating rating={rev.rating} size={14} />
                  </div>
                  <span className="text-xs text-gray-400">{new Date(rev.created_at).toLocaleDateString('fr-FR')}</span>
                </div>
                {rev.title && <p className="font-medium text-sm text-black dark:text-white mb-1">{rev.title}</p>}
                <p className="text-sm text-gray-600 dark:text-gray-400">{rev.comment}</p>
                {rev.provider_response && (
                  <div className="mt-2 ml-4 pl-4 border-l-2 border-brand-200 dark:border-brand-800">
                    <p className="text-sm text-gray-600 dark:text-gray-400"><span className="font-medium">Réponse :</span> {rev.provider_response}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowReportModal(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-black dark:text-white flex items-center gap-2">
                <Flag className="h-5 w-5 text-red-500" /> Signaler ce profil
              </h3>
              <button onClick={() => setShowReportModal(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Profil : <span className="font-medium text-gray-700 dark:text-gray-300">{profile.company_name || `${provider.first_name} ${provider.last_name}`}</span>
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Motif *</label>
                <select
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-800 rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand-300 bg-white dark:bg-gray-900 text-black dark:text-white"
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                >
                  <option value="">Sélectionner un motif</option>
                  {REPORT_REASONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Détails (optionnel)</label>
                <textarea
                  className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-2 focus:ring-brand-300 bg-white dark:bg-gray-800 text-black dark:text-white resize-none"
                  rows={3}
                  placeholder="Décrivez le problème..."
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value)}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowReportModal(false)}
                  className="flex-1 border border-gray-200 dark:border-gray-800 py-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-black dark:text-white"
                >
                  Annuler
                </button>
                <button
                  disabled={!reportReason || sendingReport}
                  onClick={async () => {
                    try {
                      setSendingReport(true);
                      await messagingAPI.reportUser({
                        reported_user_id: Number(id),
                        reason: reportReason,
                        details: reportDetails,
                        content_type: 'profile',
                      });
                      setShowReportModal(false);
                      setReportReason('');
                      setReportDetails('');
                      toast.success('Signalement envoyé. Merci.');
                    } catch (err) {
                      toast.error(err.response?.data?.error || 'Erreur lors du signalement');
                    } finally {
                      setSendingReport(false);
                    }
                  }}
                  className="flex-1 bg-red-600 text-white py-2.5 rounded-lg hover:bg-red-700 font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Flag className="h-4 w-4" /> {sendingReport ? 'Envoi...' : 'Signaler'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
