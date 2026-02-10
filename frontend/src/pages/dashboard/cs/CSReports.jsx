import { useState, useEffect } from 'react';
import { messagingAPI } from '../../../services/api';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import { PageHeader, LoadingSpinner, EmptyState, Badge } from '../../../components/ui';
import {
  Flag, Search, ChevronDown, ChevronUp, AlertTriangle, Eye, EyeOff,
  ShieldAlert, ShieldBan, ShieldCheck, Trash2, MessageSquare, User, Megaphone,
  Clock, CheckCircle2, XCircle, Filter
} from 'lucide-react';
import toast from 'react-hot-toast';

const STATUS_FILTERS = [
  { value: '', label: 'Tous les statuts' },
  { value: 'pending', label: 'En attente' },
  { value: 'reviewing', label: 'En examen' },
  { value: 'resolved', label: 'Résolu' },
  { value: 'dismissed', label: 'Ignoré' },
];

const REASON_FILTERS = [
  { value: '', label: 'Tous les motifs' },
  { value: 'spam', label: 'Spam' },
  { value: 'harassment', label: 'Harcèlement' },
  { value: 'fraud', label: 'Fraude' },
  { value: 'inappropriate', label: 'Contenu inapproprié' },
  { value: 'hate_speech', label: 'Discours haineux' },
  { value: 'scam', label: 'Arnaque' },
  { value: 'other', label: 'Autre' },
];

const TYPE_FILTERS = [
  { value: '', label: 'Tous les types' },
  { value: 'message', label: 'Message' },
  { value: 'profile', label: 'Profil' },
  { value: 'ad', label: 'Annonce' },
];

const ACTIONS = [
  { value: 'dismiss', label: 'Ignorer', icon: XCircle, color: 'text-gray-500', bg: 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700' },
  { value: 'hide_content', label: 'Masquer', icon: EyeOff, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/30 hover:bg-amber-100 dark:hover:bg-amber-900/50 border border-amber-200 dark:border-amber-800' },
  { value: 'delete_content', label: 'Supprimer', icon: Trash2, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 border border-red-200 dark:border-red-800' },
  { value: 'warn_user', label: 'Avertir', icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/30 hover:bg-amber-100 dark:hover:bg-amber-900/50 border border-amber-200 dark:border-amber-800' },
  { value: 'suspend_user', label: 'Suspendre', icon: ShieldAlert, color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-900/30 hover:bg-orange-100 dark:hover:bg-orange-900/50 border border-orange-200 dark:border-orange-800' },
  { value: 'ban_user', label: 'Bannir', icon: ShieldBan, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 border border-red-200 dark:border-red-800' },
];

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${color}`}>
          <Icon size={18} />
        </div>
        <div>
          <p className="text-2xl font-bold text-black dark:text-white">{value}</p>
          <p className="text-xs text-gray-500">{label}</p>
        </div>
      </div>
    </div>
  );
}

function ContentTypeIcon({ type }) {
  switch (type) {
    case 'message': return <MessageSquare size={14} className="text-blue-500" />;
    case 'profile': return <User size={14} className="text-purple-500" />;
    case 'ad': return <Megaphone size={14} className="text-green-500" />;
    default: return <Flag size={14} className="text-gray-400" />;
  }
}

function PriorityBadge({ score }) {
  if (score >= 5) return <Badge variant="danger">Critique ({score})</Badge>;
  if (score >= 3) return <Badge variant="warning">Élevée ({score})</Badge>;
  if (score >= 2) return <Badge variant="info">Moyenne ({score})</Badge>;
  return <Badge variant="default">Faible ({score})</Badge>;
}

function ReportStatusBadge({ status }) {
  const map = {
    pending: { label: 'En attente', variant: 'warning' },
    reviewing: { label: 'En examen', variant: 'info' },
    resolved: { label: 'Résolu', variant: 'success' },
    dismissed: { label: 'Ignoré', variant: 'default' },
  };
  const item = map[status] || { label: status, variant: 'default' };
  return <Badge variant={item.variant}>{item.label}</Badge>;
}

export default function CSReports() {
  const [reports, setReports] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [reasonFilter, setReasonFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState(null);
  const [actionNotes, setActionNotes] = useState('');
  const [processingAction, setProcessingAction] = useState(null);
  const [showModLog, setShowModLog] = useState(false);
  const [modLog, setModLog] = useState([]);

  useEffect(() => {
    fetchReports();
    fetchStats();
  }, [statusFilter, reasonFilter, typeFilter]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (reasonFilter) params.reason = reasonFilter;
      if (typeFilter) params.content_type = typeFilter;
      const { data } = await messagingAPI.csGetReports(params);
      setReports(data);
    } catch {
      toast.error('Erreur lors du chargement des signalements');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const { data } = await messagingAPI.csGetReportStats();
      setStats(data);
    } catch {
      // silent
    }
  };

  const fetchModLog = async () => {
    try {
      const { data } = await messagingAPI.csGetModLog();
      setModLog(data);
      setShowModLog(true);
    } catch {
      toast.error('Erreur lors du chargement du journal');
    }
  };

  const handleAction = async (reportId, action) => {
    if (action === 'ban_user' || action === 'suspend_user') {
      if (!confirm(`Êtes-vous sûr de vouloir ${action === 'ban_user' ? 'bannir' : 'suspendre'} cet utilisateur ?`)) return;
    }
    setProcessingAction(`${reportId}-${action}`);
    try {
      await messagingAPI.csReportAction(reportId, { action, notes: actionNotes });
      toast.success('Action effectuée');
      setActionNotes('');
      setExpanded(null);
      fetchReports();
      fetchStats();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur lors de l\'action');
    } finally {
      setProcessingAction(null);
    }
  };

  const filtered = reports.filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      r.reporter?.name?.toLowerCase().includes(q) ||
      r.reporter?.username?.toLowerCase().includes(q) ||
      r.reported_user?.name?.toLowerCase().includes(q) ||
      r.reported_user?.username?.toLowerCase().includes(q) ||
      r.details?.toLowerCase().includes(q) ||
      String(r.id).includes(q)
    );
  });

  return (
    <DashboardLayout>
      <PageHeader
        title="Modération & Signalements"
        description="Gérez les signalements et les actions de modération"
        action={
          <button
            onClick={fetchModLog}
            className="px-4 py-2 text-sm border border-gray-200 dark:border-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
          >
            Journal d'audit
          </button>
        }
      />

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <StatCard icon={Clock} label="En attente" value={stats.pending} color="bg-amber-50 dark:bg-amber-900/30 text-amber-600" />
          <StatCard icon={AlertTriangle} label="Priorité élevée" value={stats.high_priority} color="bg-red-50 dark:bg-red-900/30 text-red-600" />
          <StatCard icon={EyeOff} label="Contenu masqué" value={stats.hidden_content} color="bg-purple-50 dark:bg-purple-900/30 text-purple-600" />
          <StatCard icon={CheckCircle2} label="Résolus" value={stats.resolved} color="bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600" />
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-gray-800 rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand-300"
            placeholder="Rechercher par utilisateur ou n° signalement..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="px-4 py-2.5 border border-gray-200 dark:border-gray-800 rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand-300"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          {STATUS_FILTERS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <select
          className="px-4 py-2.5 border border-gray-200 dark:border-gray-800 rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand-300"
          value={reasonFilter}
          onChange={(e) => setReasonFilter(e.target.value)}
        >
          {REASON_FILTERS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <select
          className="px-4 py-2.5 border border-gray-200 dark:border-gray-800 rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand-300"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          {TYPE_FILTERS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>

      {/* Report List */}
      {loading ? <LoadingSpinner /> : filtered.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title="Aucun signalement"
          description={statusFilter === 'pending' ? 'Tous les signalements ont été traités.' : 'Aucun signalement ne correspond à vos filtres.'}
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => (
            <div key={r.id} className={`bg-white dark:bg-gray-900 rounded-lg border overflow-hidden ${
              r.priority_score >= 3
                ? 'border-red-300 dark:border-red-800'
                : 'border-gray-200 dark:border-gray-800'
            }`}>
              {/* Header row */}
              <div
                className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50"
                onClick={() => setExpanded(expanded === r.id ? null : r.id)}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <ContentTypeIcon type={r.content_type} />
                    <ReportStatusBadge status={r.status} />
                    <PriorityBadge score={r.priority_score} />
                    {r.is_content_hidden && (
                      <Badge variant="danger"><EyeOff size={10} className="mr-1" /> Masqué</Badge>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm text-black dark:text-white truncate">
                      {r.reported_user?.name || r.reported_user?.username} — {r.reason_display}
                    </p>
                    <p className="text-xs text-gray-400 truncate">
                      #{r.id} · Signalé par {r.reporter?.name || r.reporter?.username} · {new Date(r.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      {r.reported_user?.reports_count > 1 && (
                        <span className="ml-2 text-red-500 font-medium">
                          ({r.reported_user.reports_count} signalements au total)
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                {expanded === r.id ? <ChevronUp size={16} className="text-gray-400 shrink-0" /> : <ChevronDown size={16} className="text-gray-400 shrink-0" />}
              </div>

              {/* Expanded detail */}
              {expanded === r.id && (
                <div className="border-t border-gray-200 dark:border-gray-800 px-5 py-4 space-y-4">
                  {/* Report details */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-gray-500 uppercase">Utilisateur signalé</p>
                      <div className="flex items-center gap-2">
                        <User size={14} className="text-gray-400" />
                        <span className="text-sm text-black dark:text-white font-medium">{r.reported_user?.name}</span>
                        <Badge>{r.reported_user?.role}</Badge>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-gray-500 uppercase">Signalé par</p>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600 dark:text-gray-400">{r.reporter?.name}</span>
                        <Badge>{r.reporter?.role}</Badge>
                      </div>
                    </div>
                  </div>

                  {/* Reason + details */}
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-gray-500 uppercase">Motif</p>
                    <p className="text-sm text-black dark:text-white">{r.reason_display}</p>
                    {r.details && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                        {r.details}
                      </p>
                    )}
                  </div>

                  {/* Context: messages or ad */}
                  {r.context && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-gray-500 uppercase">
                        Contexte {r.content_type === 'message' ? '(derniers messages)' : r.content_type === 'ad' ? '(annonce)' : ''}
                      </p>
                      {Array.isArray(r.context) ? (
                        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 space-y-2 max-h-60 overflow-y-auto">
                          {r.context.map((msg) => (
                            <div key={msg.id} className={`text-sm ${
                              msg.sender === r.reported_user?.username
                                ? 'text-red-600 dark:text-red-400'
                                : 'text-gray-600 dark:text-gray-400'
                            }`}>
                              <span className="font-medium">{msg.sender_name}:</span>{' '}
                              <span>{msg.content}</span>
                              <span className="text-xs text-gray-400 ml-2">
                                {new Date(msg.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                          <p className="text-sm font-medium text-black dark:text-white">{r.context.title}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{r.context.description}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Previous admin notes */}
                  {r.admin_notes && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-gray-500 uppercase">Notes précédentes</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400 bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg border border-amber-200 dark:border-amber-800">
                        {r.admin_notes}
                        {r.resolved_by && (
                          <span className="block text-xs text-gray-400 mt-1">
                            Par {r.resolved_by} le {new Date(r.resolved_at).toLocaleDateString('fr-FR')}
                          </span>
                        )}
                      </p>
                    </div>
                  )}

                  {/* Actions */}
                  {(r.status === 'pending' || r.status === 'reviewing') && (
                    <div className="space-y-3 pt-2 border-t border-gray-200 dark:border-gray-800">
                      <div>
                        <label className="text-xs font-medium text-gray-500 uppercase block mb-1.5">Note de modération (optionnel)</label>
                        <input
                          type="text"
                          className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-800 rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand-300"
                          placeholder="Ajouter une note..."
                          value={actionNotes}
                          onChange={(e) => setActionNotes(e.target.value)}
                        />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {ACTIONS.map((a) => {
                          const Icon = a.icon;
                          const isProcessing = processingAction === `${r.id}-${a.value}`;
                          return (
                            <button
                              key={a.value}
                              onClick={() => handleAction(r.id, a.value)}
                              disabled={!!processingAction}
                              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition ${a.bg} ${a.color} disabled:opacity-50`}
                            >
                              {isProcessing ? (
                                <div className="animate-spin h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full" />
                              ) : (
                                <Icon size={14} />
                              )}
                              {a.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Moderation Log Modal */}
      {showModLog && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowModLog(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-lg w-full max-w-3xl max-h-[80vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
              <h2 className="text-lg font-bold text-black dark:text-white">Journal d'audit de modération</h2>
              <button onClick={() => setShowModLog(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl">✕</button>
            </div>
            <div className="overflow-y-auto max-h-[calc(80vh-80px)] p-6">
              {modLog.length === 0 ? (
                <EmptyState icon={ShieldCheck} title="Aucune action" description="Aucune action de modération n'a été enregistrée." />
              ) : (
                <div className="space-y-3">
                  {modLog.map((log) => (
                    <div key={log.id} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <ShieldAlert size={16} className="text-gray-400 mt-0.5 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-black dark:text-white">
                          <span className="font-medium">{log.admin}</span> a effectué{' '}
                          <span className="font-medium text-brand-600 dark:text-brand-300">{log.action_display}</span>{' '}
                          sur <span className="font-medium">{log.target_user_name || log.target_user}</span>
                        </p>
                        {log.notes && (
                          <p className="text-xs text-gray-500 mt-1">{log.notes}</p>
                        )}
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(log.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          {log.report_id && <span> · Signalement #{log.report_id}</span>}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
