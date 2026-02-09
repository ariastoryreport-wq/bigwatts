import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { authAPI, adsAPI, reviewsAPI } from '../services/api';
import { LoadingSpinner, StarRating, Badge, Card } from '../components/ui';
import AdCard from '../components/cards/AdCard';
import { MapPin, Star, Briefcase, Award, Globe, Phone, ArrowLeft, CheckCircle, ShieldCheck, Trophy, Zap } from 'lucide-react';

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
  const [provider, setProvider] = useState(null);
  const [ads, setAds] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [badges, setBadges] = useState([]);
  const [loading, setLoading] = useState(true);

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
    </div>
  );
}
