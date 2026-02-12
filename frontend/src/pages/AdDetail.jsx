import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { adsAPI, reviewsAPI, favoritesAPI, messagingAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useAuthModal } from '../components/ui/AuthModal';
import { LoadingSpinner, PriceDisplay, StatusBadge, StarRating, Badge, Card } from '../components/ui';
import { MapPin, Clock, Shield, Eye, MessageSquare, Heart, Star, Send, ArrowLeft, X, Flag, Pencil, ChevronLeft, ChevronRight, Phone, Mail, Lock, Globe } from 'lucide-react';
import toast from 'react-hot-toast';

const REPORT_REASONS = [
  { value: 'spam', label: 'Spam' },
  { value: 'fraud', label: 'Fraude' },
  { value: 'inappropriate', label: 'Contenu inapproprié' },
  { value: 'scam', label: 'Arnaque' },
  { value: 'other', label: 'Autre' },
];

function ImageCarousel({ images, alt }) {
  const [idx, setIdx] = useState(0);
  const prev = () => setIdx(i => (i - 1 + images.length) % images.length);
  const next = () => setIdx(i => (i + 1) % images.length);
  return (
    <div className="relative aspect-video bg-gray-100 dark:bg-gray-800 rounded-xl overflow-hidden group">
      <img src={images[idx]} alt={`${alt} ${idx + 1}`} className="w-full h-full object-cover transition-opacity duration-300" />
      {/* Arrows */}
      <button onClick={prev} className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/40 hover:bg-black/60 text-white rounded-full opacity-0 group-hover:opacity-100 transition">
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button onClick={next} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/40 hover:bg-black/60 text-white rounded-full opacity-0 group-hover:opacity-100 transition">
        <ChevronRight className="h-5 w-5" />
      </button>
      {/* Dots */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
        {images.map((_, i) => (
          <button key={i} onClick={() => setIdx(i)}
            className={`w-2.5 h-2.5 rounded-full transition ${i === idx ? 'bg-white scale-110' : 'bg-white/50 hover:bg-white/80'}`} />
        ))}
      </div>
      {/* Counter */}
      <div className="absolute top-3 right-3 px-2.5 py-1 bg-black/50 text-white text-xs rounded-full">
        {idx + 1} / {images.length}
      </div>
    </div>
  );
}

export default function AdDetail() {
  const { id } = useParams();
  const { user, isAuthenticated, isProprietaire } = useAuth();
  const { openLogin, openRegister } = useAuthModal();
  const navigate = useNavigate();
  const [ad, setAd] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFav, setIsFav] = useState(false);
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [quoteForm, setQuoteForm] = useState({ message: '', desired_timeframe: 'unknown' });
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [duplicateQuoteId, setDuplicateQuoteId] = useState(null);
  const [showContactForm, setShowContactForm] = useState(false);
  const [contactMsg, setContactMsg] = useState('');
  const [sendingContact, setSendingContact] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportDetails, setReportDetails] = useState('');
  const [sendingReport, setSendingReport] = useState(false);
  const [canReview, setCanReview] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewForm, setReviewForm] = useState({ rating: 5, title: '', comment: '' });
  const [submittingReview, setSubmittingReview] = useState(false);

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

  // Check if user can write a review (needs completed booking)
  useEffect(() => {
    if (isAuthenticated && ad?.provider?.id) {
      reviewsAPI.canReview({ provider: ad.provider.id, ad: id })
        .then(({ data }) => setCanReview(data.can_review))
        .catch(() => setCanReview(false));
    }
  }, [isAuthenticated, ad?.provider?.id, id]);

  const toggleFavorite = async () => {
    if (!isAuthenticated) { openLogin(); return; }
    try {
      const { data } = await favoritesAPI.toggleFavorite({ ad_id: Number(id) });
      setIsFav(data.status === 'added');
      toast.success(data.status === 'added' ? 'Ajouté aux favoris' : 'Retiré des favoris');
    } catch { toast.error('Erreur'); }
  };

  const handleRequestQuote = async () => {
    if (!isAuthenticated) { openLogin(); return; }
    try {
      const { data } = await adsAPI.checkDuplicateQuote(Number(id));
      if (data.has_active) {
        setDuplicateQuoteId(data.quote_id);
        setShowDuplicateWarning(true);
      } else {
        setShowQuoteForm(true);
      }
    } catch {
      // If check fails, just show the form
      setShowQuoteForm(true);
    }
  };

  const submitQuote = async (e) => {
    e.preventDefault();
    try {
      await adsAPI.createQuote({ ad: Number(id), ...quoteForm });
      toast.success('Demande de devis envoyée !');
      setShowQuoteForm(false);
      setQuoteForm({ message: '', desired_timeframe: 'unknown' });
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erreur lors de l\'envoi');
    }
  };

  const submitReview = async (e) => {
    e.preventDefault();
    setSubmittingReview(true);
    try {
      await reviewsAPI.createReview({
        provider: ad.provider.id,
        ad: Number(id),
        ...reviewForm,
      });
      toast.success('Avis publié !');
      setShowReviewForm(false);
      setCanReview(false);
      // Refresh reviews
      const revRes = await reviewsAPI.getReviews({ ad: id });
      setReviews(revRes.data.results || revRes.data);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erreur lors de la publication');
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (!ad) return <div className="text-center py-20">Annonce introuvable.</div>;

  const provider = ad.provider;
  const profile = provider?.prestataire_profile || {};

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button onClick={() => navigate(-1)} className="flex items-center text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 mb-6">
        <ArrowLeft className="h-4 w-4 mr-2" /> Retour
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Images carousel */}
          {(() => {
            const urlImages = ad.image_url ? ad.image_url.split(',').map(u => u.trim()).filter(Boolean) : [];
            const images = [ad.image_1, ad.image_2, ad.image_3, ...urlImages].filter(Boolean);
            if (images.length === 0) return (
              <div className="aspect-video bg-gray-100 dark:bg-gray-800 rounded-xl overflow-hidden">
                <div className="w-full h-full flex items-center justify-center text-6xl">⚡</div>
              </div>
            );
            if (images.length === 1) return (
              <div className="aspect-video bg-gray-100 dark:bg-gray-800 rounded-xl overflow-hidden">
                <img src={images[0]} alt={ad.title} className="w-full h-full object-cover" />
              </div>
            );
            return <ImageCarousel images={images} alt={ad.title} />;
          })()}

          {/* Info */}
          <Card className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                {ad.category_detail && <Badge variant="primary">{ad.category_detail.name}</Badge>}
                <h1 className="text-2xl font-display font-bold text-black dark:text-white mt-2">{ad.title}</h1>
              </div>
              <button onClick={toggleFavorite} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition">
                <Heart className={`h-6 w-6 ${isFav ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} />
              </button>
            </div>

            <div className="flex flex-wrap gap-4 text-sm text-gray-500 dark:text-gray-400 mb-6">
              <span className="flex items-center"><MapPin className="h-4 w-4 mr-1" />{ad.city}{ad.service_area && ` · ${ad.service_area}`}</span>
              {ad.duration_estimate && <span className="flex items-center"><Clock className="h-4 w-4 mr-1" />{ad.duration_estimate}</span>}
              <span className="flex items-center"><Eye className="h-4 w-4 mr-1" />{ad.views_count} vues</span>
            </div>

            <div className="mb-6">
              <PriceDisplay price={ad.price} priceMax={ad.price_max} priceType={ad.price_type} currency={ad.currency || 'EUR'} currencySymbol={ad.currency_symbol || '€'} />
            </div>

            <div className="prose max-w-none text-gray-700 dark:text-gray-300">
              <h3 className="text-lg font-heading font-semibold text-black dark:text-white mb-2">Description</h3>
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
                <h4 className="font-semibold text-black dark:text-white mb-2">Prérequis</h4>
                <p className="text-gray-600 dark:text-gray-400 text-sm">{ad.requirements}</p>
              </div>
            )}
          </Card>

          {/* Reviews */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-heading font-semibold text-black dark:text-white">Avis ({reviews.length})</h3>
              {canReview && !showReviewForm && (
                <button
                  onClick={() => setShowReviewForm(true)}
                  className="text-sm font-medium text-brand-600 dark:text-brand-300 hover:underline"
                >
                  Laisser un avis
                </button>
              )}
            </div>

            {/* Review form */}
            {showReviewForm && (
              <form onSubmit={submitReview} className="mb-6 p-4 border rounded-lg space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Note</label>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <button
                        key={s} type="button"
                        onClick={() => setReviewForm(prev => ({ ...prev, rating: s }))}
                        className="p-1"
                      >
                        <Star className={`h-6 w-6 ${s <= reviewForm.rating ? 'fill-brand-300 text-brand-300' : 'text-gray-300 dark:text-gray-600'}`} />
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Titre</label>
                  <input
                    type="text" required
                    value={reviewForm.title}
                    onChange={(e) => setReviewForm(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-900 text-black dark:text-white"
                    placeholder="Résumez votre expérience"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Commentaire</label>
                  <textarea
                    required rows={3}
                    value={reviewForm.comment}
                    onChange={(e) => setReviewForm(prev => ({ ...prev, comment: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-900 text-black dark:text-white"
                    placeholder="Décrivez votre expérience avec ce prestataire..."
                  />
                </div>
                <div className="flex gap-3 justify-end">
                  <button type="button" onClick={() => setShowReviewForm(false)} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                    Annuler
                  </button>
                  <button
                    type="submit" disabled={submittingReview}
                    className="px-4 py-2 text-sm font-medium bg-black dark:bg-white text-white dark:text-black rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 transition disabled:opacity-50"
                  >
                    {submittingReview ? 'Publication...' : 'Publier'}
                  </button>
                </div>
              </form>
            )}

            {reviews.length === 0 && !showReviewForm ? (
              <p className="text-gray-500 dark:text-gray-400">Aucun avis pour le moment.</p>
            ) : (
              <div className="space-y-4">
                {reviews.map((rev) => (
                  <div key={rev.id} className="border-b pb-4 last:border-0">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <span className="font-medium text-black dark:text-white">{rev.author_name || rev.author_username}</span>
                        <StarRating rating={rev.rating} size={14} />
                      </div>
                      <span className="text-xs text-gray-400">{new Date(rev.created_at).toLocaleDateString('fr-FR')}</span>
                    </div>
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

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Provider card */}
          <Card className="p-6">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">Prestataire</h3>
            <Link to={`/providers/${provider.id}`} className="flex items-center space-x-3 group mb-4">
              <div className="w-12 h-12 rounded-full bg-brand-50 dark:bg-brand-900/30 flex items-center justify-center">
                <span className="text-lg font-bold text-brand-600 dark:text-brand-300">
                  {(provider.first_name?.[0] || provider.username[0]).toUpperCase()}
                </span>
              </div>
              <div>
                <p className="font-semibold text-black dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-300 transition">
                  {profile.company_name || `${provider.first_name} ${provider.last_name}`}
                </p>
                <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                  {profile.average_rating > 0 && (
                    <span className="flex items-center mr-2">
                      <Star className="h-3.5 w-3.5 fill-brand-300 text-brand-300 mr-0.5" />
                      {Number(profile.average_rating).toFixed(1)}
                    </span>
                  )}
                  <MapPin className="h-3.5 w-3.5 mr-0.5" />{provider.city}
                </div>
              </div>
            </Link>

            {profile.certifications && (
              <div className="mb-4">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Certifications</p>
                <div className="flex flex-wrap gap-1">
                  {profile.certifications.split(',').map((c, i) => (
                    <Badge key={i} variant="success">{c.trim()}</Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Provider bio & contact info */}
            {provider.bio && (
              <div className="mb-4">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">À propos</p>
                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">{provider.bio}</p>
              </div>
            )}

            {/* Contact info — visible if opted in, blurred if not authenticated */}
            {(provider.show_email_on_ad || provider.show_phone_on_ad) && (
              <div className="mb-4 space-y-2">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Contact</p>
                {provider.show_email_on_ad && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                    {isAuthenticated ? (
                      <a href={`mailto:${provider.contact_email}`} className="text-brand-600 dark:text-brand-400 hover:underline truncate">
                        {provider.contact_email}
                      </a>
                    ) : (
                      <button onClick={openLogin} className="flex items-center gap-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition">
                        <span className="blur-[5px] select-none pointer-events-none">email@example.com</span>
                        <Lock className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                )}
                {provider.show_phone_on_ad && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                    {isAuthenticated ? (
                      <a href={`tel:${provider.contact_phone}`} className="text-brand-600 dark:text-brand-400 hover:underline">
                        {provider.contact_phone}
                      </a>
                    ) : (
                      <button onClick={openLogin} className="flex items-center gap-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition">
                        <span className="blur-[5px] select-none pointer-events-none">+33 6 12 34 56</span>
                        <Lock className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                )}
                {!isAuthenticated && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    Connectez-vous pour voir les coordonnées
                  </p>
                )}
              </div>
            )}

            {profile.website && (
              <div className="mb-4">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Site web</p>
                <div className="flex items-center gap-2 text-sm">
                  <Globe className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                  <a href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`} target="_blank" rel="noopener noreferrer" className="text-brand-600 dark:text-brand-400 hover:underline truncate">
                    {profile.website.replace(/^https?:\/\//, '')}
                  </a>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="space-y-3">
              {isAuthenticated && provider?.id === user?.id && (
                <Link
                  to={`/dashboard/ads/${ad.id}/edit`}
                  className="w-full bg-black dark:bg-white text-white dark:text-black py-3 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 transition font-semibold flex items-center justify-center gap-2"
                >
                  <Pencil className="h-4 w-4" /> Modifier mon annonce
                </Link>
              )}
              {isProprietaire && provider?.id !== user?.id && (
                <button
                  onClick={handleRequestQuote}
                  className="w-full bg-black dark:bg-white text-white dark:text-black py-3 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 transition font-semibold flex items-center justify-center gap-2"
                >
                  <Send className="h-4 w-4" /> Demander un devis
                </button>
              )}
              {isProprietaire && provider?.id !== user?.id && (
                <button
                  onClick={() => setShowContactForm(true)}
                  className="w-full border border-brand-300 text-brand-600 dark:text-brand-300 py-3 rounded-lg hover:bg-brand-50 dark:hover:bg-brand-900/30 transition font-medium flex items-center justify-center gap-2"
                >
                  <MessageSquare className="h-4 w-4" /> Contacter
                </button>
              )}
              {!isAuthenticated && (
                <>
                  <button
                    onClick={() => openRegister(null, 'proprietaire')}
                    className="w-full bg-black dark:bg-white text-white dark:text-black py-3 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 transition font-semibold flex items-center justify-center gap-2"
                  >
                    <Send className="h-4 w-4" /> Demander un devis
                  </button>
                  <button
                    onClick={() => openRegister(null, 'proprietaire')}
                    className="w-full border border-brand-300 text-brand-600 dark:text-brand-300 py-3 rounded-lg hover:bg-brand-50 dark:hover:bg-brand-900/30 transition font-medium flex items-center justify-center gap-2"
                  >
                    <MessageSquare className="h-4 w-4" /> Contacter
                  </button>
                </>
              )}
              {isAuthenticated && provider?.id !== user?.id && (
                <button
                  onClick={() => setShowReportModal(true)}
                  className="w-full text-sm text-gray-400 hover:text-red-500 dark:hover:text-red-400 py-2 flex items-center justify-center gap-1.5 transition"
                >
                  <Flag className="h-3.5 w-3.5" /> Signaler cette annonce
                </button>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Quote form modal */}
      {showQuoteForm && (
        <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg max-w-lg w-full p-6 border border-gray-200 dark:border-gray-800">
            <h3 className="text-lg font-bold mb-4 text-black dark:text-white">Demander un devis</h3>
            <form onSubmit={submitQuote} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Décrivez votre besoin *</label>
                <textarea
                  required rows={4}
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-800 rounded-lg outline-none focus:ring-2 focus:ring-brand-300 bg-white dark:bg-gray-900 text-black dark:text-white"
                  value={quoteForm.message}
                  onChange={(e) => setQuoteForm({ ...quoteForm, message: e.target.value })}
                  placeholder="Type de logement, surface, besoins spécifiques..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Quel est le délai souhaité pour l'installation ?</label>
                <div className="space-y-2">
                  {[
                    { value: 'asap', label: 'Le plus tôt possible' },
                    { value: '3months', label: "D'ici 3 mois" },
                    { value: '6months', label: "D'ici 6 mois" },
                    { value: '1year', label: "D'ici 1 an" },
                    { value: 'unknown', label: 'Je ne sais pas' },
                  ].map((opt) => (
                    <label key={opt.value} className="flex items-center gap-3 cursor-pointer group">
                      <input
                        type="radio"
                        name="desired_timeframe"
                        value={opt.value}
                        checked={quoteForm.desired_timeframe === opt.value}
                        onChange={(e) => setQuoteForm({ ...quoteForm, desired_timeframe: e.target.value })}
                        className="w-4 h-4 text-brand-600 border-gray-300 focus:ring-brand-300"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-black dark:group-hover:text-white transition">{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowQuoteForm(false)} className="flex-1 border border-gray-200 dark:border-gray-800 py-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-black dark:text-white">
                  Annuler
                </button>
                <button type="submit" className="flex-1 bg-black dark:bg-white text-white dark:text-black py-2.5 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 font-medium">
                  Envoyer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Contact Modal */}

      {/* Duplicate quote warning modal */}
      {showDuplicateWarning && (
        <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4" onClick={() => setShowDuplicateWarning(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-sm border border-gray-200 dark:border-gray-800 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                <Flag className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Demande en cours</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Vous avez déjà une demande de devis en cours pour cette annonce.
            </p>
            <Link
              to="/dashboard"
              className="block w-full text-center text-sm text-brand-600 dark:text-brand-400 hover:underline mb-4"
            >
              Voir ma demande en cours →
            </Link>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
              Voulez-vous vraiment envoyer une nouvelle demande ?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDuplicateWarning(false)}
                className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
              >
                Annuler
              </button>
              <button
                onClick={() => { setShowDuplicateWarning(false); setShowQuoteForm(true); }}
                className="flex-1 px-4 py-2.5 bg-black dark:bg-white text-white dark:text-black rounded-xl text-sm font-bold hover:bg-gray-800 dark:hover:bg-gray-200 transition"
              >
                Oui, continuer
              </button>
            </div>
          </div>
        </div>
      )}

      {showContactForm && (
        <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4" onClick={() => setShowContactForm(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-md border border-gray-200 dark:border-gray-800" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-black dark:text-white">Contacter {profile?.company_name || provider?.first_name}</h3>
              <button onClick={() => setShowContactForm(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              À propos de : <span className="font-medium text-gray-700 dark:text-gray-300">{ad?.title}</span>
            </p>
            <textarea
              className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-2 focus:ring-brand-300 bg-white dark:bg-gray-800 text-black dark:text-white resize-none"
              rows={4}
              placeholder="Écrivez votre message..."
              value={contactMsg}
              onChange={e => setContactMsg(e.target.value)}
            />
            <div className="flex gap-3 mt-4">
              <button
                type="button"
                onClick={() => setShowContactForm(false)}
                className="flex-1 border border-gray-200 dark:border-gray-800 py-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-black dark:text-white"
              >
                Annuler
              </button>
              <button
                disabled={!contactMsg.trim() || sendingContact}
                onClick={async () => {
                  try {
                    setSendingContact(true);
                    const { data } = await messagingAPI.sendMessage({ recipient_id: provider.id, content: contactMsg.trim(), ad_id: ad.id });
                    setShowContactForm(false);
                    setContactMsg('');
                    toast.success('Message envoyé !');
                    navigate(`/dashboard/messages?conv=${data.conversation_id}`);
                  } catch (err) {
                    toast.error(err.response?.data?.error || "Erreur lors de l'envoi du message");
                  } finally {
                    setSendingContact(false);
                  }
                }}
                className="flex-1 bg-black dark:bg-white text-white dark:text-black py-2.5 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 font-medium disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Send className="h-4 w-4" /> {sendingContact ? 'Envoi...' : 'Envoyer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4" onClick={() => setShowReportModal(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-md border border-gray-200 dark:border-gray-800" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-black dark:text-white flex items-center gap-2">
                <Flag className="h-5 w-5 text-red-500" /> Signaler cette annonce
              </h3>
              <button onClick={() => setShowReportModal(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Annonce : <span className="font-medium text-gray-700 dark:text-gray-300">{ad?.title}</span>
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
                        reported_user_id: provider.id,
                        reason: reportReason,
                        details: reportDetails,
                        content_type: 'ad',
                        content_id: ad.id,
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
