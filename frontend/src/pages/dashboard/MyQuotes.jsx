import { useState, useEffect } from 'react';
import { adsAPI } from '../../services/api';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Card, PageHeader, LoadingSpinner, StatusBadge, EmptyState } from '../../components/ui';
import { FileText } from 'lucide-react';

export default function MyQuotes() {
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adsAPI.getMyQuotes()
      .then(({ data }) => setQuotes(data.results || data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <DashboardLayout>
      <PageHeader title="Mes demandes de devis" description="Suivez l'état de vos demandes" />

      {loading ? <LoadingSpinner /> : quotes.length === 0 ? (
        <EmptyState icon={FileText} title="Aucune demande" description="Parcourez les services et demandez un devis." />
      ) : (
        <div className="space-y-4">
          {quotes.map((q) => (
            <Card key={q.id} className="p-5">
              <div className="flex flex-col sm:flex-row justify-between gap-3">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-semibold text-gray-900">{q.ad_title}</h3>
                    <StatusBadge status={q.status} />
                  </div>
                  <p className="text-sm text-gray-600 line-clamp-2">{q.message}</p>
                  {q.quoted_price && (
                    <p className="text-sm mt-2 text-primary-600 font-medium">
                      Devis: {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(q.quoted_price)}
                    </p>
                  )}
                  {q.provider_response && (
                    <div className="mt-2 p-3 bg-gray-50 rounded-lg text-sm text-gray-600">
                      <span className="font-medium">Réponse:</span> {q.provider_response}
                    </div>
                  )}
                </div>
                <div className="text-xs text-gray-400 shrink-0">
                  {new Date(q.created_at).toLocaleDateString('fr-FR')}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
