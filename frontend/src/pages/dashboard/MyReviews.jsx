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
                  <p className="font-medium text-black dark:text-white">{rev.author_name || rev.author_username}</p>
                  <StarRating rating={rev.rating} size={16} />
                </div>
                <span className="text-xs text-gray-400">{new Date(rev.created_at).toLocaleDateString('fr-FR')}</span>
              </div>
              {rev.title && <p className="font-medium text-sm mb-1">{rev.title}</p>}
              <p className="text-sm text-gray-600 dark:text-gray-400">{rev.comment}</p>

              {rev.provider_response ? (
                <div className="mt-3 ml-4 pl-4 border-l-2 border-brand-200 dark:border-brand-800">
                  <p className="text-sm text-gray-600 dark:text-gray-400"><span className="font-medium">Votre réponse :</span> {rev.provider_response}</p>
                </div>
              ) : (
                responding === rev.id ? (
                  <div className="mt-3 space-y-2">
                    <textarea
                      rows={3} className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-800 rounded-lg outline-none text-sm bg-gray-100 dark:bg-gray-800 text-black dark:text-white"
                      placeholder="Votre réponse..." value={responseText}
                      onChange={(e) => setResponseText(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <button onClick={() => setResponding(null)} className="px-4 py-1.5 border border-gray-200 dark:border-gray-800 rounded-lg text-sm text-gray-600 dark:text-gray-400">Annuler</button>
                      <button onClick={() => handleRespond(rev.id)} className="px-4 py-1.5 bg-black dark:bg-white text-white dark:text-black rounded-lg text-sm">Publier</button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => { setResponding(rev.id); setResponseText(''); }}
                    className="mt-3 text-sm text-brand-600 dark:text-brand-300 hover:text-brand-500 dark:hover:text-brand-200 font-medium"
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
