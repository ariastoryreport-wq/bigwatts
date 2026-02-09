import { useState, useEffect } from 'react';
import { adsAPI } from '../../services/api';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Card, PageHeader, LoadingSpinner, StatusBadge, EmptyState } from '../../components/ui';
import { ClipboardList } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ReceivedQuotes() {
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState(null);
  const [response, setResponse] = useState({ status: '', provider_response: '', quoted_price: '' });

  const fetchQuotes = () => {
    setLoading(true);
    adsAPI.getReceivedQuotes()
      .then(({ data }) => setQuotes(data.results || data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchQuotes(); }, []);

  const handleRespond = async (id) => {
    try {
      const data = { ...response };
      if (!data.quoted_price) delete data.quoted_price;
      await adsAPI.respondQuote(id, data);
      toast.success('Réponse envoyée');
      setResponding(null);
      fetchQuotes();
    } catch { toast.error('Erreur'); }
  };

  return (
    <DashboardLayout>
      <PageHeader title="Demandes reçues" description="Gérez les demandes de devis de vos clients" />

      {loading ? <LoadingSpinner /> : quotes.length === 0 ? (
        <EmptyState icon={ClipboardList} title="Aucune demande reçue" description="Les demandes de devis de vos clients apparaîtront ici." />
      ) : (
        <div className="space-y-4">
          {quotes.map((q) => (
            <Card key={q.id} className="p-5">
              <div className="flex flex-col gap-3">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-semibold text-black dark:text-white">{q.ad_title}</h3>
                      <StatusBadge status={q.status} />
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">De: {q.owner_name || q.owner_username}</p>
                  </div>
                  <span className="text-xs text-gray-400">{new Date(q.created_at).toLocaleDateString('fr-FR')}</span>
                </div>

                <p className="text-sm text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 p-3 rounded-lg">{q.message}</p>

                {q.budget_indication && <p className="text-sm text-gray-500 dark:text-gray-400">Budget indicatif: {q.budget_indication}</p>}
                {q.preferred_date && <p className="text-sm text-gray-500 dark:text-gray-400">Date souhaitée: {new Date(q.preferred_date).toLocaleDateString('fr-FR')}</p>}

                {q.status === 'pending' && (
                  responding === q.id ? (
                    <div className="border-t pt-4 space-y-3">
                      <select
                        className="w-full px-4 py-2.5 border rounded-lg outline-none"
                        value={response.status}
                        onChange={(e) => setResponse({ ...response, status: e.target.value })}
                      >
                        <option value="">Statut...</option>
                        <option value="accepted">Accepter</option>
                        <option value="declined">Refuser</option>
                      </select>
                      <input
                        type="number" step="0.01" placeholder="Prix proposé (€)"
                        className="w-full px-4 py-2.5 border rounded-lg outline-none"
                        value={response.quoted_price}
                        onChange={(e) => setResponse({ ...response, quoted_price: e.target.value })}
                      />
                      <textarea
                        rows={3} placeholder="Votre réponse..."
                        className="w-full px-4 py-2.5 border rounded-lg outline-none"
                        value={response.provider_response}
                        onChange={(e) => setResponse({ ...response, provider_response: e.target.value })}
                      />
                      <div className="flex gap-3">
                        <button onClick={() => setResponding(null)} className="px-4 py-2 border rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">Annuler</button>
                        <button
                          onClick={() => handleRespond(q.id)}
                          disabled={!response.status}
                          className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-50"
                        >
                          Envoyer
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setResponding(q.id); setResponse({ status: '', provider_response: '', quoted_price: '' }); }}
                      className="self-start px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 text-sm"
                    >
                      Répondre
                    </button>
                  )
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
