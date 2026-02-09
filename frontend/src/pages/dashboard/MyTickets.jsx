import { useState, useEffect } from 'react';
import { ticketsAPI } from '../../services/api';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { PageHeader, LoadingSpinner, EmptyState, StatusBadge, Badge } from '../../components/ui';
import { LifeBuoy, Plus, Send, ChevronDown, ChevronUp } from 'lucide-react';
import toast from 'react-hot-toast';

const CATEGORIES = [
  { value: 'dispute', label: 'Litige' },
  { value: 'technical', label: 'Technique' },
  { value: 'billing', label: 'Facturation' },
  { value: 'account', label: 'Compte' },
  { value: 'other', label: 'Autre' },
];

const PRIORITIES = [
  { value: 'low', label: 'Faible' },
  { value: 'medium', label: 'Moyen' },
  { value: 'high', label: 'Élevé' },
  { value: 'urgent', label: 'Urgent' },
];

export default function MyTickets() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [detail, setDetail] = useState(null);
  const [responseText, setResponseText] = useState('');
  const [form, setForm] = useState({ subject: '', description: '', category: 'other', priority: 'medium' });

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = () => {
    ticketsAPI.getMyTickets()
      .then(({ data }) => setTickets(data.results || data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await ticketsAPI.createTicket(form);
      toast.success('Ticket créé');
      setShowForm(false);
      setForm({ subject: '', description: '', category: 'other', priority: 'medium' });
      fetchTickets();
    } catch { toast.error('Erreur'); }
  };

  const toggleExpand = async (id) => {
    if (expanded === id) { setExpanded(null); return; }
    setExpanded(id);
    try {
      const { data } = await ticketsAPI.getTicketDetail(id);
      setDetail(data);
    } catch { toast.error('Erreur de chargement'); }
  };

  const handleRespond = async (id) => {
    if (!responseText.trim()) return;
    try {
      await ticketsAPI.respondTicket(id, { content: responseText });
      toast.success('Réponse envoyée');
      setResponseText('');
      const { data } = await ticketsAPI.getTicketDetail(id);
      setDetail(data);
    } catch { toast.error('Erreur'); }
  };

  const inputClass = 'w-full px-4 py-2.5 border border-gray-200 dark:border-gray-800 rounded-lg text-sm focus:ring-2 focus:ring-brand-300 focus:border-transparent outline-none';

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-6">
        <PageHeader title="Mes tickets" description="Support et assistance" />
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-4 py-2.5 bg-black dark:bg-white text-white dark:text-black rounded-lg text-sm font-medium hover:bg-gray-800 dark:hover:bg-gray-200">
          <Plus size={16} /> Nouveau ticket
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <form onSubmit={handleCreate} className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">Créer un ticket</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sujet</label>
              <input className={inputClass} value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Catégorie</label>
              <select className={inputClass} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Priorité</label>
              <select className={inputClass} value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                {PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
              <textarea rows={4} className={inputClass} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border rounded-lg text-sm">Annuler</button>
            <button type="submit" className="px-6 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg text-sm font-medium hover:bg-gray-800 dark:hover:bg-gray-200">Créer</button>
          </div>
        </form>
      )}

      {loading ? <LoadingSpinner /> : tickets.length === 0 ? (
        <EmptyState icon={LifeBuoy} title="Aucun ticket" description="Créez un ticket pour contacter le support." />
      ) : (
        <div className="space-y-3">
          {tickets.map((t) => (
            <div key={t.id} className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800" onClick={() => toggleExpand(t.id)}>
                <div className="flex items-center gap-3">
                  <StatusBadge status={t.status} />
                  <div>
                    <p className="font-medium text-sm text-black dark:text-white">{t.subject}</p>
                    <p className="text-xs text-gray-400">#{t.id} · {new Date(t.created_at).toLocaleDateString('fr-FR')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={t.priority === 'urgent' ? 'danger' : t.priority === 'high' ? 'warning' : 'default'}>
                    {PRIORITIES.find((p) => p.value === t.priority)?.label || t.priority}
                  </Badge>
                  {expanded === t.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
              </div>

              {expanded === t.id && detail && (
                <div className="border-t px-5 py-4">
                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">{detail.description}</p>

                  {detail.responses?.length > 0 && (
                    <div className="space-y-3 mb-4">
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Conversation</p>
                      {detail.responses.map((r) => (
                        <div key={r.id} className={`p-3 rounded-lg text-sm ${r.is_internal ? 'bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800 border' : 'bg-gray-100 dark:bg-gray-800'}`}>
                          <div className="flex justify-between mb-1">
                            <span className="font-medium text-gray-700 dark:text-gray-300">{r.author_name || 'Support'}</span>
                            <span className="text-xs text-gray-400">{new Date(r.created_at).toLocaleDateString('fr-FR')}</span>
                          </div>
                          <p className="text-gray-600 dark:text-gray-400">{r.content}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {!['resolved', 'closed'].includes(detail.status) && (
                    <div className="flex gap-2">
                      <input
                        className={`${inputClass} flex-1`}
                        placeholder="Votre réponse..."
                        value={responseText}
                        onChange={(e) => setResponseText(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleRespond(t.id)}
                      />
                      <button onClick={() => handleRespond(t.id)} className="p-2.5 bg-black dark:bg-white text-white dark:text-black rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200">
                        <Send size={16} />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
