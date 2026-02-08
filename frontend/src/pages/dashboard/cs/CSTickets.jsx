import { useState, useEffect } from 'react';
import { ticketsAPI } from '../../../services/api';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import { PageHeader, LoadingSpinner, EmptyState, StatusBadge, Badge } from '../../../components/ui';
import { LifeBuoy, Search, ChevronDown, ChevronUp, Send } from 'lucide-react';
import toast from 'react-hot-toast';

const STATUSES = [
  { value: '', label: 'Tous' },
  { value: 'open', label: 'Ouvert' },
  { value: 'in_progress', label: 'En cours' },
  { value: 'waiting', label: 'En attente' },
  { value: 'resolved', label: 'Résolu' },
  { value: 'closed', label: 'Fermé' },
];

const PRIORITIES = {
  low: 'Faible', medium: 'Moyen', high: 'Élevé', urgent: 'Urgent',
};

export default function CSTickets() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState(null);
  const [detail, setDetail] = useState(null);
  const [responseText, setResponseText] = useState('');
  const [statusUpdate, setStatusUpdate] = useState('');

  useEffect(() => { fetchTickets(); }, [statusFilter]);

  const fetchTickets = () => {
    setLoading(true);
    const params = {};
    if (statusFilter) params.status = statusFilter;
    ticketsAPI.csGetTickets(params)
      .then(({ data }) => setTickets(data.results || data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  const toggleExpand = async (id) => {
    if (expanded === id) { setExpanded(null); return; }
    setExpanded(id);
    try {
      const { data } = await ticketsAPI.getTicketDetail(id);
      setDetail(data);
      setStatusUpdate(data.status);
    } catch { toast.error('Erreur'); }
  };

  const handleRespond = async (id) => {
    if (!responseText.trim()) return;
    try {
      await ticketsAPI.respondTicket(id, { content: responseText });
      toast.success('Réponse envoyée');
      setResponseText('');
      const { data } = await ticketsAPI.getTicketDetail(id);
      setDetail(data);
      fetchTickets();
    } catch { toast.error('Erreur'); }
  };

  const handleStatusChange = async (id) => {
    try {
      await ticketsAPI.csUpdateTicket(id, { status: statusUpdate });
      toast.success('Statut mis à jour');
      fetchTickets();
      const { data } = await ticketsAPI.getTicketDetail(id);
      setDetail(data);
    } catch { toast.error('Erreur'); }
  };

  const filtered = tickets.filter((t) =>
    !search || t.subject.toLowerCase().includes(search.toLowerCase()) ||
    String(t.id).includes(search)
  );

  return (
    <DashboardLayout>
      <PageHeader title="Tickets support" description="Gérez les demandes de support des utilisateurs" />

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="Rechercher par sujet ou n° ticket..."
            value={search} onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500"
          value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
        >
          {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>

      {loading ? <LoadingSpinner /> : filtered.length === 0 ? (
        <EmptyState icon={LifeBuoy} title="Aucun ticket" description="Tous les tickets sont résolus." />
      ) : (
        <div className="space-y-3">
          {filtered.map((t) => (
            <div key={t.id} className="bg-white rounded-xl shadow-sm border overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-gray-50" onClick={() => toggleExpand(t.id)}>
                <div className="flex items-center gap-3">
                  <StatusBadge status={t.status} />
                  <div>
                    <p className="font-medium text-sm text-gray-900">{t.subject}</p>
                    <p className="text-xs text-gray-400">
                      #{t.id} · par {t.created_by_name || `User #${t.created_by}`} · {new Date(t.created_at).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={t.priority === 'urgent' ? 'danger' : t.priority === 'high' ? 'warning' : 'default'}>
                    {PRIORITIES[t.priority] || t.priority}
                  </Badge>
                  {expanded === t.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
              </div>

              {expanded === t.id && detail && (
                <div className="border-t px-5 py-4 space-y-4">
                  <p className="text-sm text-gray-700">{detail.description}</p>

                  {/* Status update */}
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-gray-600">Statut :</label>
                    <select
                      className="px-3 py-1.5 border rounded-lg text-sm outline-none"
                      value={statusUpdate} onChange={(e) => setStatusUpdate(e.target.value)}
                    >
                      {STATUSES.filter((s) => s.value).map((s) => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                    <button onClick={() => handleStatusChange(t.id)} className="px-3 py-1.5 bg-gray-800 text-white rounded-lg text-sm hover:bg-gray-900">
                      Mettre à jour
                    </button>
                  </div>

                  {/* Responses */}
                  {detail.responses?.length > 0 && (
                    <div className="space-y-3">
                      <p className="text-xs font-medium text-gray-500 uppercase">Conversation</p>
                      {detail.responses.map((r) => (
                        <div key={r.id} className={`p-3 rounded-lg text-sm ${r.is_internal ? 'bg-yellow-50 border border-yellow-200' : 'bg-gray-50'}`}>
                          <div className="flex justify-between mb-1">
                            <span className="font-medium text-gray-700">{r.author_name || 'Utilisateur'}</span>
                            <span className="text-xs text-gray-400">{new Date(r.created_at).toLocaleDateString('fr-FR')}</span>
                          </div>
                          <p className="text-gray-600">{r.content}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Respond */}
                  <div className="flex gap-2">
                    <input
                      className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="Répondre au ticket..."
                      value={responseText}
                      onChange={(e) => setResponseText(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleRespond(t.id)}
                    />
                    <button onClick={() => handleRespond(t.id)} className="p-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
                      <Send size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
