import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { adsAPI, reviewsAPI, favoritesAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { LoadingSpinner, PriceDisplay, StatusBadge, StarRating, Badge, Card } from '../components/ui';
import { MapPin, Clock, Shield, Eye, MessageSquare, Heart, Star, Send, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdDetail() {
  const { id } = useParams();
  const { user, isAuthenticated, isProprietaire } = useAuth();
  const navigate = useNavigate();
  const [ad, setAd] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFav, setIsFav] = useState(false);
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [quoteForm, setQuoteForm] = useState({ message: '', preferred_date: '', budget_indication: '' });

  useEffect(() => {
    Promise.all([
      adsAPI.getAd(id),
      reviewsAPI.getReviews({ ad: id }),
    ]).then(([adRes, revRes]) => {
      setAd(adRes.data);
      setReviews(revRes.data.results || revRes.data);
    }).catch(() => toast.error('Erreur de chargement'))
      .finally(() => setLoading(false));

    if (isAuthenticated) {
      favoritesAPI.checkFavorite({ ad_id: id }).then(({ data }) => setIsFav(data.is_favorite)).catch(() => {});
    }
  }, [id, isAuthenticated]);

  const toggleFavorite = async () => {
    if (!isAuthenticated) { navigate('/login'); return; }
    try {
      const { data } = await favoritesAPI.toggleFavorite({ ad_id: Number(id) });
      setIsFav(data.status === 'added');
      toast.success(data.status === 'added' ? 'Ajouté aux favoris' : 'Retiré des favoris');
    } catch { toast.error('Erreur'); }
  };

  const submitQuote = async (e) => {
    e.preventDefault();
    try {
      await adsAPI.createQuote({ ad: Number(id), ...quoteForm });
      toast.success('Demande de devis envoyée !');
      setShowQuoteForm(false);
      setQuoteForm({ message: '', preferred_date: '', budget_indication: '' });
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erreur lors de l\'envoi');
    }
  };

  if (loading) return <LoadingSpinner />;
  if (!ad) return <div className="text-center py-20">Annonce introuvable.</div>;

  const provider = ad.provider;
  const profile = provider?.prestataire_profile || {};

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button onClick={() => navigate(-1)} className="flex items-center text-dark-400 hover:text-dark-200 mb-6">
        <ArrowLeft className="h-4 w-4 mr-2" /> Retour
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Images */}
          <div className="aspect-video bg-gradient-to-br from-navy-800 to-primary-400/10 rounded-xl overflow-hidden">
            {(ad.image_1 || ad.image_url) ? (
              <img src={ad.image_1 || ad.image_url} alt={ad.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-6xl">⚡</div>
            )}
          </div>

          {/* Info */}
          <Card className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                {ad.category_detail && <Badge variant="primary">{ad.category_detail.name}</Badge>}
                <h1 className="text-2xl font-bold text-white mt-2">{ad.title}</h1>
              </div>
              <button onClick={toggleFavorite} className="p-2 hover:bg-dark-700 rounded-lg transition">
                <Heart className={`h-6 w-6 ${isFav ? 'fill-red-500 text-red-500' : 'text-dark-500'}`} />
              </button>
            </div>

            <div className="flex flex-wrap gap-4 text-sm text-dark-400 mb-6">
              <span className="flex items-center"><MapPin className="h-4 w-4 mr-1" />{ad.city}{ad.service_area && ` · ${ad.service_area}`}</span>
              {ad.duration_estimate && <span className="flex items-center"><Clock className="h-4 w-4 mr-1" />{ad.duration_estimate}</span>}
              <span className="flex items-center"><Eye className="h-4 w-4 mr-1" />{ad.views_count} vues</span>
            </div>

            <div className="mb-6">
              <PriceDisplay price={ad.price} priceType={ad.price_type} />
            </div>

            <div className="prose max-w-none text-dark-200">
              <h3 className="text-lg font-semibold text-white mb-2">Description</h3>
              <p className="whitespace-pre-line">{ad.description}</p>
            </div>

            {ad.warranty_info && (
              <div className="mt-6 p-4 bg-emerald-500/10 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="h-5 w-5 text-emerald-400" />
                  <h4 className="font-semibold text-emerald-300">Garantie</h4>
                </div>
                <p className="text-emerald-400 text-sm">{ad.warranty_info}</p>
              </div>
            )}

            {ad.requirements && (
              <div className="mt-4">
                <h4 className="font-semibold text-white mb-2">Prérequis</h4>
                <p className="text-dark-300 text-sm">{ad.requirements}</p>
              </div>
            )}
          </Card>

          {/* Reviews */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Avis ({reviews.length})</h3>
            {reviews.length === 0 ? (
              <p className="text-dark-400">Aucun avis pour le moment.</p>
            ) : (
              <div className="space-y-4">
                {reviews.map((rev) => (
                  <div key={rev.id} className="border-b pb-4 last:border-0">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <span className="font-medium text-white">{rev.author_name || rev.author_username}</span>
                        <StarRating rating={rev.rating} size={14} />
                      </div>
                      <span className="text-xs text-dark-500">{new Date(rev.created_at).toLocaleDateString('fr-FR')}</span>
                    </div>
                    <p className="text-sm text-dark-300">{rev.comment}</p>
                    {rev.provider_response && (
                      <div className="mt-2 ml-4 pl-4 border-l-2 border-primary-400/30">
                        <p className="text-sm text-dark-300"><span className="font-medium">Réponse :</span> {rev.provider_response}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Provider card */}
          <Card className="p-6">
            <h3 className="text-sm font-medium text-dark-400 mb-3">Prestataire</h3>
            <Link to={`/providers/${provider.id}`} className="flex items-center space-x-3 group mb-4">
              <div className="w-12 h-12 rounded-full bg-navy-800 flex items-center justify-center">
                <span className="text-lg font-bold text-primary-400">
                  {(provider.first_name?.[0] || provider.username[0]).toUpperCase()}
                </span>
              </div>
              <div>
                <p className="font-semibold text-white group-hover:text-primary-400 transition">
                  {profile.company_name || `${provider.first_name} ${provider.last_name}`}
                </p>
                <div className="flex items-center text-sm text-dark-400">
                  {profile.average_rating > 0 && (
                    <span className="flex items-center mr-2">
                      <Star className="h-3.5 w-3.5 fill-primary-400 text-primary-400 mr-0.5" />
                      {Number(profile.average_rating).toFixed(1)}
                    </span>
                  )}
                  <MapPin className="h-3.5 w-3.5 mr-0.5" />{provider.city}
                </div>
              </div>
            </Link>

            {profile.certifications && (
              <div className="mb-4">
                <p className="text-xs text-dark-400 mb-1">Certifications</p>
                <div className="flex flex-wrap gap-1">
                  {profile.certifications.split(',').map((c, i) => (
                    <Badge key={i} variant="success">{c.trim()}</Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="space-y-3">
              {isProprietaire && (
                <button
                  onClick={() => setShowQuoteForm(true)}
                  className="w-full bg-primary-400 text-dark-900 py-3 rounded-lg hover:bg-primary-300 transition font-semibold flex items-center justify-center gap-2"
                >
                  <Send className="h-4 w-4" /> Demander un devis
                </button>
              )}
              {isAuthenticated && (
                <Link
                  to={`/dashboard/messages?to=${provider.id}&ad=${ad.id}`}
                  className="w-full border border-primary-400 text-primary-400 py-3 rounded-lg hover:bg-primary-400/10 transition font-medium flex items-center justify-center gap-2"
                >
                  <MessageSquare className="h-4 w-4" /> Contacter
                </Link>
              )}
              {!isAuthenticated && (
                <Link to="/login" className="w-full bg-primary-400 text-dark-900 py-3 rounded-lg hover:bg-primary-300 transition font-semibold text-center block">
                  Connectez-vous pour demander un devis
                </Link>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Quote form modal */}
      {showQuoteForm && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-dark-800 rounded-lg max-w-lg w-full p-6">
            <h3 className="text-lg font-bold mb-4">Demander un devis</h3>
            <form onSubmit={submitQuote} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-dark-200 mb-1">Décrivez votre besoin *</label>
                <textarea
                  required rows={4}
                  className="w-full px-4 py-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-primary-400/50"
                  value={quoteForm.message}
                  onChange={(e) => setQuoteForm({ ...quoteForm, message: e.target.value })}
                  placeholder="Type de logement, surface, besoins spécifiques..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-dark-200 mb-1">Date souhaitée</label>
                  <input
                    type="date"
                    className="w-full px-4 py-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-primary-400/50"
                    value={quoteForm.preferred_date}
                    onChange={(e) => setQuoteForm({ ...quoteForm, preferred_date: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-200 mb-1">Budget indicatif</label>
                  <input
                    type="text"
                    className="w-full px-4 py-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-primary-400/50"
                    value={quoteForm.budget_indication}
                    onChange={(e) => setQuoteForm({ ...quoteForm, budget_indication: e.target.value })}
                    placeholder="ex: 5000-10000€"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowQuoteForm(false)} className="flex-1 border py-2.5 rounded-lg hover:bg-dark-700">
                  Annuler
                </button>
                <button type="submit" className="flex-1 bg-primary-400 text-dark-900 py-2.5 rounded-lg hover:bg-primary-300 font-medium">
                  Envoyer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
