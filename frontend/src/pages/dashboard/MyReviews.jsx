import { useState, useEffect } from 'react';
import { reviewsAPI } from '../../services/api';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Card, PageHeader, LoadingSpinner, EmptyState, StarRating } from '../../components/ui';
import { Star } from 'lucide-react';
import toast from 'react-hot-toast';

export default function MyReviews() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState(null);
  const [responseText, setResponseText] = useState('');

  useEffect(() => {
    reviewsAPI.getReceivedReviews()
      .then(({ data }) => setReviews(data.results || data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleRespond = async (id) => {
    try {
      await reviewsAPI.respondReview(id, { provider_response: responseText });
      toast.success('Réponse publiée');
      setResponding(null);
      setResponseText('');
      // Refresh
      reviewsAPI.getReceivedReviews().then(({ data }) => setReviews(data.results || data));
    } catch { toast.error('Erreur'); }
  };

  return (
    <DashboardLayout>
      <PageHeader title="Avis reçus" description="Les avis laissés par vos clients" />

      {loading ? <LoadingSpinner /> : reviews.length === 0 ? (
        <EmptyState icon={Star} title="Aucun avis" description="Les avis de vos clients apparaîtront ici." />
      ) : (
        <div className="space-y-4">
          {reviews.map((rev) => (
            <Card key={rev.id} className="p-5">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="font-medium text-white">{rev.author_name || rev.author_username}</p>
                  <StarRating rating={rev.rating} size={16} />
                </div>
                <span className="text-xs text-dark-500">{new Date(rev.created_at).toLocaleDateString('fr-FR')}</span>
              </div>
              {rev.title && <p className="font-medium text-sm mb-1">{rev.title}</p>}
              <p className="text-sm text-dark-300">{rev.comment}</p>

              {rev.provider_response ? (
                <div className="mt-3 ml-4 pl-4 border-l-2 border-primary-400/30">
                  <p className="text-sm text-dark-300"><span className="font-medium">Votre réponse :</span> {rev.provider_response}</p>
                </div>
              ) : (
                responding === rev.id ? (
                  <div className="mt-3 space-y-2">
                    <textarea
                      rows={3} className="w-full px-4 py-2.5 border border-dark-700 rounded-lg outline-none text-sm bg-dark-700 text-white"
                      placeholder="Votre réponse..." value={responseText}
                      onChange={(e) => setResponseText(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <button onClick={() => setResponding(null)} className="px-4 py-1.5 border border-dark-700 rounded-lg text-sm text-dark-300">Annuler</button>
                      <button onClick={() => handleRespond(rev.id)} className="px-4 py-1.5 bg-primary-400 text-dark-900 rounded-lg text-sm">Publier</button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => { setResponding(rev.id); setResponseText(''); }}
                    className="mt-3 text-sm text-primary-400 hover:text-primary-300 font-medium"
                  >
                    Répondre à cet avis
                  </button>
                )
              )}
            </Card>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
