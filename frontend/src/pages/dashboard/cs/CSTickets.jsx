import { useState, useEffect, useRef } from 'react';
import { ticketsAPI } from '../../../services/api';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import { PageHeader, LoadingSpinner, EmptyState, StatusBadge, Badge } from '../../../components/ui';
import { LifeBuoy, Search, ChevronDown, ChevronUp, Send, User, Headphones } from 'lucide-react';
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

const fmt = (d) => {
  const dt = new Date(d);
  return dt.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }) + ' ' + dt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
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
  const chatEndRef = useRef(null);

  useEffect(() => { fetchTickets(); }, [statusFilter]);

  useEffect(() => {
    if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [detail]);

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
    if (expanded === id) { setExpanded(null); setDetail(null); return; }
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

  const isCS = (r) => r.author_role === 'customer_service';

  return (
    <DashboardLayout>
      <PageHeader title="Tickets support" description="Gérez les demandes de support des utilisateurs" />

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-gray-800 rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand-300 bg-white dark:bg-gray-900 text-black dark:text-white"
            placeholder="Rechercher par sujet ou n° ticket..."
            value={search} onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="px-4 py-2.5 border border-gray-200 dark:border-gray-800 rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand-300 bg-white dark:bg-gray-900 text-black dark:text-white"
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
            <div key={t.id} className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
              {/* Ticket header row */}
              <button
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition text-left"
                onClick={() => toggleExpand(t.id)}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <StatusBadge status={t.status} />
                  <div className="min-w-0">
                    <p className="font-medium text-sm text-black dark:text-white truncate">{t.subject}</p>
                    <p className="text-xs text-gray-400">
                      #{t.id} · par {t.created_by_name || `User #${t.created_by}`} · {new Date(t.created_at).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Badge variant={t.priority === 'urgent' ? 'danger' : t.priority === 'high' ? 'warning' : 'default'}>
                    {PRIORITIES[t.priority] || t.priority}
                  </Badge>
                  {expanded === t.id ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                </div>
              </button>

              {/* Expanded: chat panel */}
              {expanded === t.id && detail && (
                <div className="border-t border-gray-200 dark:border-gray-800 flex flex-col">
                  {/* Status bar */}
                  <div className="flex items-center gap-2 px-5 py-3 bg-gray-50 dark:bg-gray-800/30 border-b border-gray-200 dark:border-gray-800">
                    <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Statut :</label>
                    <select
                      className="px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg text-sm outline-none bg-white dark:bg-gray-800 text-black dark:text-white"
                      value={statusUpdate} onChange={(e) => setStatusUpdate(e.target.value)}
                    >
                      {STATUSES.filter((s) => s.value).map((s) => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                    <button onClick={() => handleStatusChange(t.id)} className="px-3 py-1.5 bg-gray-200 dark:bg-gray-700 text-black dark:text-white rounded-lg text-sm hover:bg-gray-300 dark:hover:bg-gray-600 transition">
                      Mettre à jour
                    </button>
                  </div>

                  {/* Chat area */}
                  <div className="px-5 py-4 space-y-3 max-h-96 overflow-y-auto">
                    {/* Initial ticket description as first message (always from user) */}
                    <div className="flex justify-start">
                      <div className="flex gap-2 max-w-[80%]">
                        <div className="w-7 h-7 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <User size={14} className="text-gray-500 dark:text-gray-400" />
                        </div>
                        <div>
                          <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-tl-sm px-4 py-2.5">
                            <p className="text-sm text-black dark:text-white">{detail.description}</p>
                          </div>
                          <p className="text-[10px] text-gray-400 mt-1 ml-1">
                            {detail.created_by_name || 'Utilisateur'} · {fmt(detail.created_at)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Responses as chat bubbles */}
                    {detail.responses?.map((r) => {
                      const cs = isCS(r);
                      return (
                        <div key={r.id} className={`flex ${cs ? 'justify-end' : 'justify-start'}`}>
                          <div className={`flex gap-2 max-w-[80%] ${cs ? 'flex-row-reverse' : ''}`}>
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                              cs ? 'bg-brand-100 dark:bg-brand-900/40' : 'bg-gray-200 dark:bg-gray-700'
                            }`}>
                              {cs ? <Headphones size={14} className="text-brand-600 dark:text-brand-300" /> : <User size={14} className="text-gray-500 dark:text-gray-400" />}
                            </div>
                            <div>
                              <div className={`rounded-2xl px-4 py-2.5 ${
                                r.is_internal
                                  ? 'bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-tr-sm'
                                  : cs
                                    ? 'bg-brand-600 text-white rounded-tr-sm'
                                    : 'bg-gray-100 dark:bg-gray-800 rounded-tl-sm'
                              }`}>
                                {r.is_internal && (
                                  <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase mb-1">Note interne</p>
                                )}
                                <p className={`text-sm ${
                                  r.is_internal ? 'text-amber-800 dark:text-amber-200' : cs && !r.is_internal ? 'text-white' : 'text-black dark:text-white'
                                }`}>{r.content}</p>
                              </div>
                              <p className={`text-[10px] text-gray-400 mt-1 ${cs ? 'mr-1 text-right' : 'ml-1'}`}>
                                {r.author_name || 'Utilisateur'} · {fmt(r.created_at)}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    <div ref={chatEndRef} />
                  </div>

                  {/* Input bar */}
                  <div className="border-t border-gray-200 dark:border-gray-800 px-5 py-3 flex gap-2">
                    <input
                      className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-full text-sm outline-none focus:ring-2 focus:ring-brand-300 bg-white dark:bg-gray-800 text-black dark:text-white"
                      placeholder="Écrire une réponse…"
                      value={responseText}
                      onChange={(e) => setResponseText(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleRespond(t.id)}
                    />
                    <button
                      onClick={() => handleRespond(t.id)}
                      disabled={!responseText.trim()}
                      className="p-2.5 bg-brand-600 text-white rounded-full hover:bg-brand-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
                    >
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
