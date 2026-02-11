import { useState, useEffect } from 'react';
import { authAPI } from '../../services/api';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Card, PageHeader, LoadingSpinner } from '../../components/ui';
import { FileText, Upload, Trash2, CheckCircle, Clock, XCircle, Plus, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';

const DOC_TYPES = [
  { value: 'identity', label: "Pièce d'identité" },
  { value: 'rge', label: 'Certification RGE' },
  { value: 'insurance', label: 'Assurance décennale' },
  { value: 'qualipv', label: 'QualiPV / QualiBois' },
  { value: 'kbis', label: 'Extrait Kbis' },
  { value: 'other', label: 'Autre' },
];

const STATUS_CONFIG = {
  pending: { icon: Clock, label: 'En attente', color: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-50 dark:bg-yellow-900/20' },
  approved: { icon: CheckCircle, label: 'Approuvé', color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-900/20' },
  rejected: { icon: XCircle, label: 'Refusé', color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20' },
};

export default function Documents() {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ doc_type: 'rge', label: '', file_url: '' });
  const [submitting, setSubmitting] = useState(false);

  const fetchDocs = () => {
    setLoading(true);
    authAPI.getDocuments()
      .then(({ data }) => setDocs(data.results || data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchDocs(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.label.trim()) { toast.error('Veuillez saisir un libellé.'); return; }
    setSubmitting(true);
    try {
      await authAPI.createDocument(form);
      toast.success('Document envoyé !');
      setShowForm(false);
      setForm({ doc_type: 'rge', label: '', file_url: '' });
      fetchDocs();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erreur lors de l\'envoi.');
    }
    setSubmitting(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('Supprimer ce document ?')) return;
    try {
      await authAPI.deleteDocument(id);
      toast.success('Document supprimé');
      fetchDocs();
    } catch { toast.error('Erreur'); }
  };

  const inputClass = 'w-full px-4 py-2.5 border border-gray-200 dark:border-gray-800 rounded-lg text-sm focus:ring-2 focus:ring-brand-300 focus:border-transparent outline-none bg-white dark:bg-gray-900 text-black dark:text-white';

  return (
    <DashboardLayout>
      <PageHeader title="Documents & Certifications" description="Envoyez vos justificatifs pour valider votre profil" />

      {/* Info banner */}
      <Card className="p-4 mb-6 border-l-4 border-l-brand-500 bg-brand-50/50 dark:bg-brand-900/10">
        <div className="flex items-start gap-3">
          <ShieldCheck className="h-5 w-5 text-brand-600 dark:text-brand-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-brand-800 dark:text-brand-200">Augmentez la confiance des clients</p>
            <p className="text-xs text-brand-600 dark:text-brand-400 mt-1">
              Envoyez vos certifications (RGE, assurance décennale, etc.) pour obtenir des badges vérifiés sur votre profil.
              Notre équipe vérifiera vos documents sous 48h.
            </p>
          </div>
        </div>
      </Card>

      {/* Add button */}
      <div className="flex justify-end mb-4">
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2.5 bg-black dark:bg-white text-white dark:text-black rounded-lg text-sm font-medium hover:bg-gray-800 dark:hover:bg-gray-200 transition">
          <Plus className="h-4 w-4" />
          Ajouter un document
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <Card className="p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4 text-black dark:text-white">Nouveau document</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type de document</label>
                <select className={inputClass} value={form.doc_type} onChange={(e) => setForm({ ...form, doc_type: e.target.value })}>
                  {DOC_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Libellé</label>
                <input className={inputClass} value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="Ex: Certification RGE 2024" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">URL du document (optionnel)</label>
              <input type="url" className={inputClass} value={form.file_url} onChange={(e) => setForm({ ...form, file_url: e.target.value })} placeholder="https://..." />
              <p className="text-xs text-gray-400 mt-1">Lien vers le document hébergé (Google Drive, Dropbox, etc.)</p>
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={submitting}
                className="px-6 py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition">
                {submitting ? 'Envoi…' : 'Envoyer'}
              </button>
              <button type="button" onClick={() => setShowForm(false)}
                className="px-6 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition">
                Annuler
              </button>
            </div>
          </form>
        </Card>
      )}

      {/* Documents list */}
      {loading ? <LoadingSpinner /> : docs.length === 0 ? (
        <Card className="p-12 text-center">
          <FileText className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400 mb-2">Aucun document envoyé</p>
          <p className="text-sm text-gray-400 dark:text-gray-500">Cliquez sur "Ajouter un document" pour commencer.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {docs.map(doc => {
            const st = STATUS_CONFIG[doc.status] || STATUS_CONFIG.pending;
            const StIcon = st.icon;
            return (
              <Card key={doc.id} className="p-4">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-lg ${st.bg} flex items-center justify-center flex-shrink-0`}>
                    <StIcon className={`h-5 w-5 ${st.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="font-medium text-sm text-black dark:text-white truncate">{doc.label}</p>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${st.bg} ${st.color}`}>
                        {doc.status_display || st.label}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400">
                      {doc.doc_type_display} · Envoyé le {new Date(doc.created_at).toLocaleDateString('fr-FR')}
                    </p>
                    {doc.reviewer_notes && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 italic">Note : {doc.reviewer_notes}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {doc.file_url && (
                      <a href={doc.file_url} target="_blank" rel="noopener noreferrer"
                        className="p-2 text-gray-400 hover:text-brand-500 transition">
                        <Upload className="h-4 w-4" />
                      </a>
                    )}
                    {doc.status === 'pending' && (
                      <button onClick={() => handleDelete(doc.id)}
                        className="p-2 text-gray-400 hover:text-red-500 transition">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
}
