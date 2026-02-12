import { useState, useEffect } from 'react';
import { authAPI } from '../../services/api';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Card, PageHeader, LoadingSpinner } from '../../components/ui';
import { FileText, Upload, Trash2, CheckCircle, Clock, XCircle, Plus, ShieldCheck, AlertCircle, Award } from 'lucide-react';
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

const CERT_STATUS = {
  pending: { icon: Clock, label: 'En attente', cls: 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20' },
  approved: { icon: CheckCircle, label: 'Approuvé', cls: 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20' },
  rejected: { icon: XCircle, label: 'Refusé', cls: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20' },
  expired: { icon: AlertCircle, label: 'Expiré', cls: 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800' },
};

export default function Documents() {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ doc_type: 'rge', label: '', file_url: '' });
  const [selectedFile, setSelectedFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useState(null);

  // Certifications
  const [certifications, setCertifications] = useState([]);
  const [showCertForm, setShowCertForm] = useState(false);
  const [certForm, setCertForm] = useState({ certification_name: '', license_number: '', issuing_authority: '', expiration_date: '' });
  const [certFile, setCertFile] = useState(null);
  const [certLoading, setCertLoading] = useState(false);

  const fetchDocs = () => {
    setLoading(true);
    authAPI.getDocuments()
      .then(({ data }) => setDocs(data.results || data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchDocs();
    authAPI.getCertifications().then(res => setCertifications(res.data.results || res.data)).catch(() => {});
  }, []);

  const handleCertSubmit = async (e) => {
    e.preventDefault();
    if (!certForm.certification_name.trim()) return toast.error('Nom de la certification requis');
    setCertLoading(true);
    try {
      const fd = new FormData();
      fd.append('certification_name', certForm.certification_name);
      if (certForm.license_number) fd.append('license_number', certForm.license_number);
      if (certForm.issuing_authority) fd.append('issuing_authority', certForm.issuing_authority);
      if (certForm.expiration_date) fd.append('expiration_date', certForm.expiration_date);
      if (certFile) {
        fd.append('document', certFile);
        fd.append('document_name', certFile.name);
      }
      const { data } = await authAPI.createCertification(fd);
      setCertifications(prev => [data, ...prev]);
      setCertForm({ certification_name: '', license_number: '', issuing_authority: '', expiration_date: '' });
      setCertFile(null);
      setShowCertForm(false);
      toast.success('Certification soumise pour vérification');
    } catch { toast.error('Erreur lors de la soumission'); }
    setCertLoading(false);
  };

  const handleCertDelete = async (id) => {
    try {
      await authAPI.deleteCertification(id);
      setCertifications(prev => prev.filter(c => c.id !== id));
      toast.success('Certification supprimée');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erreur');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.label.trim()) { toast.error('Veuillez saisir un libellé.'); return; }
    if (!form.file_url && !selectedFile) { toast.error('Veuillez ajouter un fichier ou une URL.'); return; }
    setSubmitting(true);
    try {
      let payload;
      if (selectedFile) {
        // Use FormData for real file upload
        payload = new FormData();
        payload.append('doc_type', form.doc_type);
        payload.append('label', form.label);
        payload.append('document', selectedFile);
        payload.append('file_name', selectedFile.name);
        if (form.file_url.trim()) payload.append('file_url', form.file_url.trim());
      } else {
        // JSON payload for URL-only submission
        payload = { doc_type: form.doc_type, label: form.label };
        if (form.file_url.trim()) payload.file_url = form.file_url.trim();
      }
      await authAPI.createDocument(payload);
      toast.success('Document envoyé !');
      setShowForm(false);
      setForm({ doc_type: 'rge', label: '', file_url: '' });
      setSelectedFile(null);
      fetchDocs();
    } catch (err) {
      toast.error(err.response?.data?.detail || err.response?.data?.file_url?.[0] || 'Erreur lors de l\'envoi.');
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
            {/* File upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fichier (PDF, image)</label>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 px-4 py-2.5 border border-dashed border-gray-300 dark:border-gray-700 rounded-lg cursor-pointer hover:border-brand-400 dark:hover:border-brand-600 hover:bg-brand-50/50 dark:hover:bg-brand-900/10 transition text-sm text-gray-600 dark:text-gray-400">
                  <Upload className="h-4 w-4" />
                  {selectedFile ? selectedFile.name : 'Choisir un fichier'}
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      if (file.size > 10 * 1024 * 1024) { toast.error('Max 10 Mo par fichier'); return; }
                      setSelectedFile(file);
                    }} />
                </label>
                {selectedFile && (
                  <button type="button" onClick={() => setSelectedFile(null)} className="text-sm text-red-500 hover:text-red-700">Retirer</button>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-1">PDF, JPG, PNG, WebP · Max 10 Mo</p>
            </div>
            <div className="relative">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200 dark:border-gray-800" /></div>
              <div className="relative flex justify-center"><span className="bg-white dark:bg-gray-900 px-3 text-xs text-gray-400">ou</span></div>
            </div>
            {/* URL fallback */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">URL du document</label>
              <input type="url" className={inputClass} value={form.file_url} onChange={(e) => setForm({ ...form, file_url: e.target.value })} placeholder="https://drive.google.com/..." autoComplete="url" />
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
                    {(doc.document_url || doc.file_url) && (
                      <a href={doc.document_url || doc.file_url} target="_blank" rel="noopener noreferrer"
                        className="p-2 text-gray-400 hover:text-brand-500 transition" title="Voir le document">
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

      {/* Certifications Section */}
      <div className="mt-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Award className="h-5 w-5 text-brand-600 dark:text-brand-400" />
            <h2 className="text-lg font-semibold text-black dark:text-white">Certifications professionnelles</h2>
          </div>
          <button
            type="button"
            onClick={() => setShowCertForm(!showCertForm)}
            className="px-4 py-2 text-sm font-medium bg-black dark:bg-white text-white dark:text-black rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 transition flex items-center gap-2"
          >
            <Upload className="h-4 w-4" /> Ajouter
          </button>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Soumettez vos certifications professionnelles (RGE, QualiSol, etc.) pour vérification. Une fois approuvées, un badge « Certifié » sera affiché sur votre profil.
        </p>

        {/* Cert submit form */}
        {showCertForm && (
          <Card className="p-4 mb-4">
            <form onSubmit={handleCertSubmit} className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nom de la certification *</label>
                  <input className={inputClass} value={certForm.certification_name} onChange={(e) => setCertForm({ ...certForm, certification_name: e.target.value })} placeholder="Ex: RGE QualiSol" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Numéro de licence</label>
                  <input className={inputClass} value={certForm.license_number} onChange={(e) => setCertForm({ ...certForm, license_number: e.target.value })} placeholder="N° de certificat" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Organisme émetteur</label>
                  <input className={inputClass} value={certForm.issuing_authority} onChange={(e) => setCertForm({ ...certForm, issuing_authority: e.target.value })} placeholder="Ex: Qualit'EnR" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date d'expiration</label>
                  <input type="date" className={inputClass} value={certForm.expiration_date} onChange={(e) => setCertForm({ ...certForm, expiration_date: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Document justificatif</label>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => setCertFile(e.target.files[0] || null)}
                  className="text-sm text-gray-600 dark:text-gray-400 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-gray-100 dark:file:bg-gray-800 file:text-black dark:file:text-white hover:file:bg-gray-200 dark:hover:file:bg-gray-700"
                />
                <p className="text-xs text-gray-400 mt-1">PDF, JPG ou PNG. Max 10 Mo.</p>
              </div>
              <div className="flex gap-2">
                <button type="submit" disabled={certLoading} className="px-5 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg text-sm font-medium hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-50">
                  {certLoading ? 'Envoi…' : 'Soumettre'}
                </button>
                <button type="button" onClick={() => setShowCertForm(false)} className="px-5 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200">
                  Annuler
                </button>
              </div>
            </form>
          </Card>
        )}

        {/* Certifications list */}
        {certifications.length === 0 ? (
          <Card className="p-8 text-center">
            <Award className="h-10 w-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-sm text-gray-400 dark:text-gray-500">Aucune certification soumise.</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {certifications.map((cert) => {
              const st = CERT_STATUS[cert.status] || CERT_STATUS.pending;
              const StIcon = st.icon;
              return (
                <Card key={cert.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm text-black dark:text-white truncate">{cert.certification_name}</span>
                        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${st.cls}`}>
                          <StIcon className="h-3 w-3" />{st.label}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                        {cert.issuing_authority && <span>Organisme : {cert.issuing_authority}</span>}
                        {cert.license_number && <span>N° : {cert.license_number}</span>}
                        {cert.expiration_date && <span>Expire le : {new Date(cert.expiration_date).toLocaleDateString('fr-FR')}</span>}
                      </div>
                      {cert.review_notes && cert.status !== 'pending' && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 italic">Note : {cert.review_notes}</p>
                      )}
                    </div>
                    {cert.status !== 'approved' && (
                      <button onClick={() => handleCertDelete(cert.id)} className="p-2 text-gray-400 hover:text-red-500 transition ml-2" title="Supprimer">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
