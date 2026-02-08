import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { authAPI, adsAPI, reviewsAPI } from '../services/api';
import { LoadingSpinner, StarRating, Badge, Card } from '../components/ui';
import AdCard from '../components/cards/AdCard';
import { MapPin, Star, Briefcase, Award, Globe, Phone, ArrowLeft, CheckCircle } from 'lucide-react';

export default function ProviderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [provider, setProvider] = useState(null);
  const [ads, setAds] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      authAPI.getUser(id),
      adsAPI.getAds({ provider: id }),
      reviewsAPI.getReviews({ provider: id }),
    ]).then(([userRes, adsRes, revRes]) => {
      setProvider(userRes.data);
      setAds(adsRes.data.results || adsRes.data);
      setReviews(revRes.data.results || revRes.data);
    }).catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <LoadingSpinner />;
  if (!provider) return <div className="text-center py-20">Prestataire introuvable.</div>;

  const profile = provider.prestataire_profile || {};

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button onClick={() => navigate(-1)} className="flex items-center text-gray-500 hover:text-gray-700 mb-6">
        <ArrowLeft className="h-4 w-4 mr-2" /> Retour
      </button>

      {/* Profile header */}
      <Card className="p-8 mb-8">
        <div className="flex flex-col md:flex-row items-start gap-6">
          <div className="w-20 h-20 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
            {provider.avatar ? (
              <img src={provider.avatar} alt="" className="w-20 h-20 rounded-full object-cover" />
            ) : (
              <span className="text-3xl font-bold text-primary-600">
                {(provider.first_name?.[0] || provider.username[0]).toUpperCase()}
              </span>
            )}
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-gray-900">
                {profile.company_name || `${provider.first_name} ${provider.last_name}`}
              </h1>
              {provider.is_verified && <CheckCircle className="h-5 w-5 text-primary-500" />}
            </div>

            {provider.bio && <p className="text-gray-600 mb-4">{provider.bio}</p>}

            <div className="flex flex-wrap gap-4 text-sm">
              {provider.city && (
                <span className="flex items-center text-gray-500"><MapPin className="h-4 w-4 mr-1" />{provider.city}</span>
              )}
              {profile.average_rating > 0 && (
                <span className="flex items-center text-gray-500">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400 mr-1" />
                  {Number(profile.average_rating).toFixed(1)} ({profile.total_reviews} avis)
                </span>
              )}
              {profile.completed_projects > 0 && (
                <span className="flex items-center text-gray-500"><Briefcase className="h-4 w-4 mr-1" />{profile.completed_projects} projets</span>
              )}
              {profile.years_experience > 0 && (
                <span className="flex items-center text-gray-500"><Award className="h-4 w-4 mr-1" />{profile.years_experience} ans d'exp.</span>
              )}
              {profile.website && (
                <a href={profile.website} target="_blank" rel="noreferrer" className="flex items-center text-primary-600 hover:text-primary-700">
                  <Globe className="h-4 w-4 mr-1" />Site web
                </a>
              )}
            </div>

            {/* Certifications */}
            {profile.certifications && (
              <div className="mt-4">
                <p className="text-sm text-gray-500 mb-2">Certifications</p>
                <div className="flex flex-wrap gap-2">
                  {profile.certifications.split(',').map((c, i) => (
                    <Badge key={i} variant="success">{c.trim()}</Badge>
                  ))}
                </div>
              </div>
            )}

            {profile.specialties && (
              <div className="mt-3">
                <p className="text-sm text-gray-500 mb-2">Spécialités</p>
                <div className="flex flex-wrap gap-2">
                  {profile.specialties.split(',').map((s, i) => (
                    <Badge key={i} variant="primary">{s.trim()}</Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Ads */}
      {ads.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Services proposés ({ads.length})</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {ads.map((ad) => <AdCard key={ad.id} ad={ad} />)}
          </div>
        </div>
      )}

      {/* Reviews */}
      <Card className="p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Avis ({reviews.length})</h2>
        {reviews.length === 0 ? (
          <p className="text-gray-500">Pas encore d'avis.</p>
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
                {rev.title && <p className="font-medium text-sm text-gray-800 mb-1">{rev.title}</p>}
                <p className="text-sm text-gray-600">{rev.comment}</p>
                {rev.provider_response && (
                  <div className="mt-2 ml-4 pl-4 border-l-2 border-primary-200">
                    <p className="text-sm text-gray-600"><span className="font-medium">Réponse :</span> {rev.provider_response}</p>
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
