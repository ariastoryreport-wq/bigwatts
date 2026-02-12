import { useState, useEffect, useCallback } from 'react';
import { authAPI } from '../../../services/api';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import { PageHeader, LoadingSpinner, Badge } from '../../../components/ui';
import { CheckCircle, XCircle, Clock, AlertCircle, Eye, FileText, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';

const STATUS_OPTS = [
  { value: '', label: 'Toutes' },
  { value: 'pending', label: 'En attente' },
  { value: 'approved', label: 'Approuvées' },
  { value: 'rejected', label: 'Refusées' },
  { value: 'expired', label: 'Expirées' },
];

const STATUS_STYLE = {
  pending: { icon: Clock, cls: 'text-yellow-600 bg-yellow-50 dark:text-yellow-400 dark:bg-yellow-900/20', label: 'En attente' },
  approved: { icon: CheckCircle, cls: 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-900/20', label: 'Approuvé' },
  rejected: { icon: XCircle, cls: 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/20', label: 'Refusé' },
  expired: { icon: AlertCircle, cls: 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-800', label: 'Expiré' },
};

export default function CSCertifications() {
  const [certifications, setCertifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [reviewModal, setReviewModal] = useState(null); // cert object
  const [reviewAction, setReviewAction] = useState('');
  const [reviewNotes, setReviewNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [logs, setLogs] = useState({});

  const fetchCertifications = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      const { data } = await authAPI.csGetAllCertifications(params);
      setCertifications(data.results || data);
    } catch { toast.error('Erreur de chargement'); }
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => { fetchCertifications(); }, [fetchCertifications]);

  const handleReview = async () => {
    if (!reviewAction) return;
    setSubmitting(true);
    try {
      await authAPI.csReviewCertification(reviewModal.id, {
        action: reviewAction,
        review_notes: reviewNotes,
      });
      toast.success(reviewAction === 'approve' ? 'Certification approuvée' : 'Certification refusée');
      setReviewModal(null);
      setReviewAction('');
      setReviewNotes('');
      fetchCertifications();
    } catch { toast.error('Erreur'); }
    setSubmitting(false);
  };

  const toggleLogs = async (certId) => {
    if (expandedId === certId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(certId);
    if (!logs[certId]) {
      try {
        const { data } = await authAPI.getCertificationLogs(certId);
        setLogs(prev => ({ ...prev, [certId]: data.results || data }));
      } catch { /* ignore */ }
    }
  };

  return (
    <DashboardLayout>
      <PageHeader title="Certifications" description="Vérification des certifications professionnelles" />

      {/* Filters */}
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        {STATUS_OPTS.map((o) => (
          <button
            key={o.value}
            onClick={() => setStatusFilter(o.value)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition ${
              statusFilter === o.value
                ? 'border-brand-300 bg-brand-50 dark:bg-brand-900/30 text-black dark:text-white'
                : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-400'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>

      {loading ? <LoadingSpinner /> : certifications.length === 0 ? (
        <p className="text-gray-400 dark:text-gray-500 text-sm text-center py-12">Aucune certification trouvée.</p>
      ) : (
        <div className="space-y-3">
          {certifications.map((cert) => {
            const st = STATUS_STYLE[cert.status] || STATUS_STYLE.pending;
            const StIcon = st.icon;
            const isExpanded = expandedId === cert.id;
            return (
              <div key={cert.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
                <div className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-semibold text-sm text-black dark:text-white">{cert.certification_name}</span>
                      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${st.cls}`}>
                        <StIcon className="h-3 w-3" />{st.label}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 space-y-0.5">
                      <p>Prestataire : <span className="font-medium text-gray-700 dark:text-gray-300">{cert.user_name}</span> (ID {cert.user_id})</p>
                      <div className="flex flex-wrap gap-x-4">
                        {cert.issuing_authority && <span>Organisme : {cert.issuing_authority}</span>}
                        {cert.license_number && <span>N° : {cert.license_number}</span>}
                        {cert.expiration_date && <span>Expire : {new Date(cert.expiration_date).toLocaleDateString('fr-FR')}</span>}
                      </div>
                      <p>Soumise le : {new Date(cert.created_at).toLocaleDateString('fr-FR')}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {cert.document_url && (
                      <a href={cert.document_url} target="_blank" rel="noreferrer" className="p-2 text-gray-500 hover:text-brand-600 transition" title="Voir le document">
                        <FileText className="h-4 w-4" />
                      </a>
                    )}
                    <button onClick={() => toggleLogs(cert.id)} className="p-2 text-gray-500 hover:text-gray-700 transition" title="Historique">
                      <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    </button>
                    {cert.status === 'pending' && (
                      <button
                        onClick={() => { setReviewModal(cert); setReviewAction(''); setReviewNotes(''); }}
                        className="px-3 py-1.5 text-xs font-medium bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition"
                      >
                        Vérifier
                      </button>
                    )}
                  </div>
                </div>

                {/* Audit logs */}
                {isExpanded && (
                  <div className="border-t border-gray-100 dark:border-gray-800 px-4 py-3 bg-gray-50 dark:bg-gray-800/50">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">Historique</p>
                    {!(logs[cert.id]?.length) ? (
                      <p className="text-xs text-gray-400 italic">Chargement…</p>
                    ) : (
                      <div className="space-y-1.5">
                        {logs[cert.id].map((log) => (
                          <div key={log.id} className="text-xs text-gray-600 dark:text-gray-400 flex items-start gap-2">
                            <span className="text-gray-400 shrink-0">{new Date(log.created_at).toLocaleString('fr-FR')}</span>
                            <span>{log.old_status ? `${log.old_status} → ` : ''}{log.new_status}</span>
                            {log.changed_by_name && <span className="text-gray-500">par {log.changed_by_name}</span>}
                            {log.notes && <span className="italic">— {log.notes}</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Review Modal */}
      {reviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl max-w-md w-full p-6 border border-gray-200 dark:border-gray-800">
            <h3 className="text-lg font-semibold mb-2">Vérifier la certification</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              <span className="font-medium text-black dark:text-white">{reviewModal.certification_name}</span>
              {' '}— {reviewModal.user_name}
            </p>

            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setReviewAction('approve')}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium border-2 transition ${
                  reviewAction === 'approve'
                    ? 'border-green-400 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                    : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'
                }`}
              >
                ✓ Approuver
              </button>
              <button
                onClick={() => setReviewAction('reject')}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium border-2 transition ${
                  reviewAction === 'reject'
                    ? 'border-red-400 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                    : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'
                }`}
              >
                ✗ Refuser
              </button>
            </div>

            <textarea
              rows={3}
              className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-black dark:text-white bg-white dark:bg-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-brand-300 focus:border-transparent outline-none mb-4"
              placeholder="Notes de vérification (optionnel)…"
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
            />

            <div className="flex justify-end gap-2">
              <button onClick={() => setReviewModal(null)} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">
                Annuler
              </button>
              <button
                onClick={handleReview}
                disabled={!reviewAction || submitting}
                className="px-5 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg text-sm font-medium hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-50"
              >
                {submitting ? 'Envoi…' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
