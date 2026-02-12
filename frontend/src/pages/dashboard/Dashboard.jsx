import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { authAPI, adsAPI, messagingAPI, bookingsAPI } from '../../services/api';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Card, LoadingSpinner } from '../../components/ui';
import { ONBOARDING_STEPS, fetchOnboardingData } from './Onboarding';
import SchedulingModal from '../../components/SchedulingModal';
import toast from 'react-hot-toast';
import {
  Megaphone, FileText, MessageSquare, Users,
  LifeBuoy, ClipboardList,
  PlusCircle, ArrowRight, Euro,
  CheckCircle, ChevronRight, Search, Sparkles, Clock,
  MapPin, User, Bell, ChevronDown, ChevronUp, Eye, Send,
  Calendar, CreditCard, ThumbsUp, ThumbsDown, CalendarCheck, Info,
  Play, XCircle, AlertTriangle, Ban,
} from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [onboarding, setOnboarding] = useState(null);
  // Proprietaire-specific
  const [latestQuotes, setLatestQuotes] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [expandedQuoteId, setExpandedQuoteId] = useState(null);
  const [bookings, setBookings] = useState({});
  const [schedulingQuoteId, setSchedulingQuoteId] = useState(null);
  const [payingBookingId, setPayingBookingId] = useState(null);
  // Provider-specific
  const [receivedQuotes, setReceivedQuotes] = useState([]);
  const [providerConversations, setProviderConversations] = useState([]);
  const [expandedProviderQuoteId, setExpandedProviderQuoteId] = useState(null);
  const [providerBookings, setProviderBookings] = useState({});
  // Abandon modal
  const [abandonQuoteId, setAbandonQuoteId] = useState(null);
  const [abandoning, setAbandoning] = useState(false);

  useEffect(() => {
    authAPI.getDashboard()
      .then(({ data }) => setStats(data))
      .catch(() => {})
      .finally(() => setLoading(false));

    if (user?.role === 'prestataire') {
      fetchOnboardingData()
        .then(setOnboarding)
        .catch(() => {});
      refreshReceivedQuotes();
      messagingAPI.getConversations()
        .then(({ data }) => setProviderConversations((data.results || data).slice(0, 5)))
        .catch(() => {});
    }

    if (user?.role === 'proprietaire') {
      fetchProprietaireData();
    }
  }, []);

  const refreshReceivedQuotes = () => {
    adsAPI.getReceivedQuotes()
      .then(({ data }) => {
        const quotes = data.results || data;
        setReceivedQuotes(quotes);
        // Auto-expand first quote if none expanded yet
        if (quotes.length > 0 && expandedProviderQuoteId === null) {
          setExpandedProviderQuoteId(quotes[0].id);
        }
      })
      .catch(() => {});
    // Also refresh bookings for provider
    bookingsAPI.getBookings()
      .then(({ data }) => {
        const bList = data.results || data;
        const bMap = {};
        bList.forEach(b => { bMap[b.quote] = b; });
        setProviderBookings(bMap);
      })
      .catch(() => {});
  };

  const fetchProprietaireData = async () => {
    try {
      const [quotesRes, bookingsRes] = await Promise.all([
        adsAPI.getMyQuotes(),
        bookingsAPI.getBookings(),
      ]);
      const qList = quotesRes.data.results || quotesRes.data;
      const bList = bookingsRes.data.results || bookingsRes.data;
      setLatestQuotes(qList);
      // Auto-expand first quote if none expanded yet
      if (qList.length > 0 && expandedQuoteId === null) {
        setExpandedQuoteId(qList[0].id);
      }
      const bMap = {};
      bList.forEach(b => { bMap[b.quote] = b; });
      setBookings(bMap);
    } catch { /* silent */ }
  };

  const handleDecision = async (quoteId, decision) => {
    try {
      await adsAPI.decideQuote(quoteId, decision);
      toast.success(decision === 'accept' ? 'Devis accepté !' : 'Devis refusé');
      fetchProprietaireData();
    } catch {
      toast.error('Erreur lors de la décision');
    }
  };

  const handlePayDeposit = async (bookingId) => {
    setPayingBookingId(bookingId);
    try {
      const { data } = await bookingsAPI.payDeposit(bookingId);
      if (data.mock) {
        toast.success(`Acompte de ${data.amount}€ payé (mode test) !`);
      } else {
        toast.success('Paiement initié. Redirection Stripe...');
      }
      fetchProprietaireData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur lors du paiement.');
    } finally { setPayingBookingId(null); }
  };

  const handleBooked = () => { setSchedulingQuoteId(null); fetchProprietaireData(); };

  const handleBookingStatusChange = async (bookingId, newStatus) => {
    try {
      await bookingsAPI.updateBooking(bookingId, { status: newStatus });
      const labels = { confirmed: 'Réservation confirmée', cancelled: 'Réservation annulée', in_progress: 'Travaux démarrés', completed: 'Travaux terminés' };
      toast.success(labels[newStatus] || 'Mis à jour');
      if (user?.role === 'proprietaire') fetchProprietaireData();
      else refreshReceivedQuotes();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur');
    }
  };

  const handleAbandon = async () => {
    if (!abandonQuoteId) return;
    setAbandoning(true);
    try {
      await adsAPI.abandonQuote(abandonQuoteId);
      toast.success('Demande abandonnée');
      setAbandonQuoteId(null);
      if (user?.role === 'proprietaire') fetchProprietaireData();
      else refreshReceivedQuotes();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur');
    } finally { setAbandoning(false); }
  };

  const fmt = (v) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(v);

  /* ─── Stat card ─── */
  const StatCard = ({ icon: Icon, label, value, color = 'primary', to }) => {
    const colors = {
      primary: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400',
      blue: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400',
      yellow: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400',
      red: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400',
      green: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400',
      purple: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400',
    };
    const content = (
      <Card className="p-5 transition group">
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-xl ${colors[color]} flex items-center justify-center`}>
            <Icon className="h-6 w-6" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-2xl font-bold text-black dark:text-white">{value ?? '—'}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
          </div>
          {to && <ArrowRight className="h-4 w-4 text-gray-300 dark:text-gray-600 group-hover:text-green-500 transition" />}
        </div>
      </Card>
    );
    return to ? <Link to={to}>{content}</Link> : content;
  };

  /* ─── Proprietaire dashboard — project-focused ─── */
  const ProprietaireDashboard = () => {
    const hasQuotes = latestQuotes.length > 0;
    const unread = stats?.unread_messages ?? 0;

    const statusLabels = {
      pending: 'Envoyée',
      counter_offer: 'Réponse reçue',
      accepted: 'Acceptée',
      declined: 'Refusée',
      completed: 'Terminée',
      cancelled: 'Annulée',
    };

    const statusColors = {
      pending: 'text-yellow-600 dark:text-yellow-400',
      counter_offer: 'text-blue-600 dark:text-blue-400',
      accepted: 'text-green-600 dark:text-green-400',
      declined: 'text-red-600 dark:text-red-400',
      completed: 'text-gray-500 dark:text-gray-400',
      cancelled: 'text-gray-400 dark:text-gray-500',
    };

    /* ─── Empty state — no project yet ─── */
    if (!hasQuotes) {
      return (
        <div className="flex items-center justify-center min-h-[50vh]">
          <Card className="p-8 max-w-md w-full text-center">
            <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center">
              <Sparkles className="h-8 w-8 text-brand-600 dark:text-brand-400" />
            </div>
            <h2 className="text-xl font-bold text-black dark:text-white mb-2">
              Démarrer votre projet
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              Trouvez un prestataire pour votre projet d'énergie verte et vérifiez vos aides disponibles.
            </p>
            <div className="space-y-3">
              <Link
                to="/services"
                className="flex items-center justify-center gap-2 w-full bg-black dark:bg-white text-white dark:text-black py-3 rounded-xl font-bold text-sm hover:bg-gray-800 dark:hover:bg-gray-200 transition"
              >
                <Search className="h-4 w-4" />
                Rechercher un service
              </Link>
              <Link
                to="/incentives"
                className="flex items-center justify-center gap-2 w-full border border-gray-200 dark:border-gray-700 text-black dark:text-white py-3 rounded-xl font-medium text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition"
              >
                <CheckCircle className="h-4 w-4 text-green-500" />
                Vérifier mon éligibilité aux aides
              </Link>
            </div>
          </Card>
        </div>
      );
    }

    /* ─── Active project view ─── */
    return (
      <div className="space-y-6">
        {/* Mes demandes — always visible table */}
        {latestQuotes.length > 0 && (
          <div>
            <Card className="p-0 overflow-hidden">
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {latestQuotes.map((q) => {
                  const isExpanded = expandedQuoteId === q.id;
                  return (
                    <div key={q.id}>
                      <div className="flex items-center justify-between px-5 py-3 gap-4">
                        {/* Title + date stacked */}
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium text-black dark:text-white truncate block">{q.ad_title}</span>
                          <span className="text-sm text-gray-500 dark:text-gray-400">{new Date(q.created_at).toLocaleDateString('fr-FR')}</span>
                        </div>

                        {/* Price + Status + Action */}
                        <div className="flex items-center gap-3 flex-shrink-0">
                          {q.quoted_price && (
                            <span className="text-xs font-semibold text-black dark:text-white">{Number(q.quoted_price).toLocaleString('fr-FR')} €</span>
                          )}
                          <span className={`text-[11px] font-semibold ${statusColors[q.status]}`}>
                            {statusLabels[q.status]}
                          </span>
                          <button
                            onClick={() => setExpandedQuoteId(isExpanded ? null : q.id)}
                            className="text-brand-600 dark:text-brand-400 p-1"
                          >
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>

                      {/* Expanded inline conversation */}
                      {isExpanded && (
                        <div className="border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/20">
                          <QuoteConversation
                            quote={q}
                            booking={bookings[q.id]}
                            fmt={fmt}
                            onDecision={handleDecision}
                            onSchedule={() => setSchedulingQuoteId(q.id)}
                            onPay={() => handlePayDeposit(bookings[q.id]?.id)}
                            onBookingStatus={handleBookingStatusChange}
                            onAbandon={() => setAbandonQuoteId(q.id)}
                            payingBookingId={payingBookingId}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        )}

        {schedulingQuoteId && (
          <SchedulingModal
            quoteId={schedulingQuoteId}
            onClose={() => setSchedulingQuoteId(null)}
            onBooked={handleBooked}
          />
        )}
      </div>
    );
  };

  /* ─── Condensed Onboarding Widget ─── */
  const OnboardingWidget = () => {
    if (!onboarding) return null;
    const completedCount = Object.values(onboarding).filter(Boolean).length;
    const totalSteps = ONBOARDING_STEPS.length;
    const allDone = completedCount === totalSteps;
    const progressPct = Math.round((completedCount / totalSteps) * 100);

    if (allDone) {
      return (
        <Card className="p-4 border-l-4 border-l-green-500 bg-green-50/50 dark:bg-green-900/10">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
            <span className="text-sm font-medium text-green-700 dark:text-green-400">
              Configuration terminée — votre espace prestataire est prêt !
            </span>
          </div>
        </Card>
      );
    }

    return (
      <Card className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-black dark:text-white">
            Configuration : {completedCount}/{totalSteps}
          </span>
          <Link to="/dashboard/onboarding" className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-500 transition">
            Voir tout →
          </Link>
        </div>
        <div className="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden mb-3">
          <div
            className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-300 transition-all duration-700"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <div className="space-y-2">
          {ONBOARDING_STEPS.map((step) => {
            const done = onboarding[step.id];
            return (
              <div key={step.id} className="flex items-center gap-3">
                {done ? (
                  <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                ) : (
                  <div className="h-4 w-4 rounded-full border-2 border-gray-300 dark:border-gray-600 flex-shrink-0" />
                )}
                <span className={`text-sm flex-1 ${done ? 'text-gray-400 line-through' : 'text-black dark:text-white font-medium'}`}>
                  {step.title}
                </span>
                {!done && (
                  <Link to={step.link} className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-500 flex items-center gap-0.5">
                    {step.linkLabel} <ChevronRight className="h-3 w-3" />
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      </Card>
    );
  };

  /* ─── Provider dashboard — simple job workflow ─── */
  const ProviderDashboard = () => {
    const pendingQuotes = receivedQuotes.filter(q => q.status === 'pending');
    const counterOfferQuotes = receivedQuotes.filter(q => q.status === 'counter_offer');
    const unreadConvos = providerConversations.filter(c => c.unread_count > 0);

    // Build "needs attention" items
    const attentionItems = [
      ...unreadConvos.map(c => {
        const other = c.participants?.find(p => p.id !== user?.id);
        return {
          type: 'message',
          id: c.id,
          client: other?.first_name ? `${other.first_name} ${other.last_name}` : other?.username || 'Client',
          service: c.last_message?.content || 'Nouveau message',
          time: null,
          actionLabel: 'Lire',
          to: '/dashboard',
        };
      }),
      ...pendingQuotes.map(q => ({
        type: 'quote_pending',
        id: q.id,
        client: q.owner_name || 'Client',
        service: q.ad_title,
        time: new Date(q.created_at).toLocaleDateString('fr-FR'),
        actionLabel: 'Répondre',
        to: '/dashboard',
      })),
      ...counterOfferQuotes.map(q => ({
        type: 'quote_sent',
        id: q.id,
        client: q.owner_name || 'Client',
        service: q.ad_title,
        time: q.quoted_price ? `${Number(q.quoted_price).toLocaleString('fr-FR')} €` : null,
        actionLabel: 'Voir',
        to: '/dashboard',
      })),
    ];

    // Status mapping for requests table
    const statusLabel = (status) => {
      const map = {
        pending: 'Nouveau',
        counter_offer: 'Devis envoyé',
        accepted: 'Accepté',
        declined: 'Refusé',
        completed: 'Terminé',
        cancelled: 'Annulé',
      };
      return map[status] || status;
    };
    const statusDot = (status) => {
      const map = {
        pending: 'bg-blue-500',
        counter_offer: 'bg-yellow-500',
        accepted: 'bg-green-500',
        declined: 'bg-red-400',
        completed: 'bg-gray-400',
        cancelled: 'bg-gray-300',
      };
      return map[status] || 'bg-gray-300';
    };
    // Revenue numbers (simple)
    const sentQuotes = receivedQuotes.filter(q => ['counter_offer', 'accepted', 'completed'].includes(q.status));
    const acceptedQuotes = receivedQuotes.filter(q => ['accepted', 'completed'].includes(q.status));
    const completedQuotes = receivedQuotes.filter(q => q.status === 'completed');
    const sumPrices = (list) => list.reduce((s, q) => s + (Number(q.quoted_price) || 0), 0);
    const pendingRevenue = sumPrices(receivedQuotes.filter(q => q.status === 'counter_offer'));
    const confirmedRevenue = sumPrices(acceptedQuotes);

    return (
      <div className="space-y-6">
        {/* Onboarding checklist */}
        <OnboardingWidget />

        {/* ─── Block 1: Actions rapides ─── */}
        <div>
          <h2 className="text-sm font-bold text-black dark:text-white mb-3">Actions rapides</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Link to="/dashboard/ads/new">
              <Card className="p-4 hover:border-brand-300 dark:hover:border-brand-700 transition group">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 flex items-center justify-center flex-shrink-0">
                    <PlusCircle className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-black dark:text-white">Créer une annonce</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Publier un nouveau service</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-gray-300 dark:text-gray-600 ml-auto group-hover:text-green-500 transition" />
                </div>
              </Card>
            </Link>
            <Link to="/dashboard/availability">
              <Card className="p-4 hover:border-brand-300 dark:hover:border-brand-700 transition group">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-black dark:text-white">Mes disponibilités</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Gérer mon calendrier</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-gray-300 dark:text-gray-600 ml-auto group-hover:text-blue-500 transition" />
                </div>
              </Card>
            </Link>
          </div>
        </div>

        {/* ─── Block 2: Demandes clients (table) ─── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-black dark:text-white">Demandes clients</h2>
          </div>

          {receivedQuotes.length > 0 ? (
            <Card className="p-0 overflow-hidden">
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {receivedQuotes.slice(0, 8).map((q) => {
                  const isExpProv = expandedProviderQuoteId === q.id;
                  return (
                  <div key={q.id}>
                    <button
                      onClick={() => setExpandedProviderQuoteId(isExpProv ? null : q.id)}
                      className="w-full flex items-center justify-between px-5 py-3 gap-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition text-left"
                    >
                      {/* Client + service stacked */}
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-black dark:text-white truncate block">{q.owner_name || 'Client'}</span>
                        <span className="text-sm text-gray-500 dark:text-gray-400 truncate block">{q.ad_title}</span>
                      </div>

                      {/* Status + Amount + Action */}
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${statusDot(q.status)}`} />
                          <span className="text-sm text-gray-500 dark:text-gray-400">{statusLabel(q.status)}</span>
                        </div>
                        {q.quoted_price && (
                          <span className="text-xs font-semibold text-black dark:text-white">{Number(q.quoted_price).toLocaleString('fr-FR')} €</span>
                        )}
                        <span className="text-brand-600 dark:text-brand-400">
                          {isExpProv ? <ChevronUp className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </span>
                      </div>
                    </button>

                    {/* Expanded inline detail */}
                    {isExpProv && (
                      <div className="border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/20">
                        <ProviderRequestDetail
                          quote={q}
                          booking={providerBookings[q.id]}
                          onRefresh={refreshReceivedQuotes}
                          onBookingStatus={handleBookingStatusChange}
                          onAbandon={() => setAbandonQuoteId(q.id)}
                        />
                      </div>
                    )}
                  </div>
                  );
                })}
              </div>
              </Card>
          ) : (
            <Card className="p-6 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Les demandes de vos clients apparaîtront ici
              </p>
            </Card>
          )}
        </div>

        {/* ─── Block 3: Devis & revenus (simple numbers) ─── */}
        <div>
          <h2 className="text-sm font-bold text-black dark:text-white mb-3">Devis & revenus</h2>
          <Card className="p-0 overflow-hidden">
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {[
                { label: 'Devis envoyés', count: sentQuotes.length, amount: sumPrices(sentQuotes) },
                { label: 'Travaux acceptés', count: acceptedQuotes.length, amount: sumPrices(acceptedQuotes) },
                { label: 'Travaux terminés', count: completedQuotes.length, amount: sumPrices(completedQuotes) },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between px-5 py-3">
                  <span className="text-sm text-gray-600 dark:text-gray-300">{row.label}</span>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-400 dark:text-gray-500">{row.count}</span>
                    <span className="text-sm font-semibold text-black dark:text-white min-w-[80px] text-right">
                      {row.amount > 0 ? `${row.amount.toLocaleString('fr-FR')} €` : '—'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t-2 border-gray-200 dark:border-gray-700 px-5 py-3 bg-gray-50 dark:bg-gray-800/50">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">En attente</span>
                <span className="font-semibold text-amber-600 dark:text-amber-400">
                  {pendingRevenue > 0 ? `${pendingRevenue.toLocaleString('fr-FR')} €` : '—'}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm mt-1">
                <span className="text-gray-500 dark:text-gray-400">Confirmé</span>
                <span className="font-bold text-green-600 dark:text-green-400">
                  {confirmedRevenue > 0 ? `${confirmedRevenue.toLocaleString('fr-FR')} €` : '—'}
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-black dark:text-white">
          {user?.role === 'proprietaire' ? 'Mes demandes' : `Bonjour ${user?.first_name || user?.username}`}
        </h1>
        {user?.role !== 'proprietaire' && (
          <p className="text-gray-500 dark:text-gray-400">Voici un aperçu de votre activité</p>
        )}
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : (
        <>
          {user?.role === 'prestataire' && <ProviderDashboard />}

          {user?.role === 'proprietaire' && <ProprietaireDashboard />}

          {/* Abandon confirmation modal — shared across both roles */}
          {abandonQuoteId && (
            <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4" onClick={() => setAbandonQuoteId(null)}>
              <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-sm border border-gray-200 dark:border-gray-800 shadow-xl" onClick={e => e.stopPropagation()}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
                    <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">Abandonner la demande ?</h3>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                  Cette action est irréversible. La demande sera annulée et l'autre partie sera notifiée.
                  {(bookings[abandonQuoteId] || providerBookings[abandonQuoteId])?.status === 'deposit_paid' && (
                    <span className="block mt-2 text-amber-600 dark:text-amber-400 font-medium">
                      ⚠ Un acompte a déjà été payé pour cette demande.
                    </span>
                  )}
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setAbandonQuoteId(null)}
                    className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleAbandon}
                    disabled={abandoning}
                    className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 transition disabled:opacity-50"
                  >
                    {abandoning ? 'Abandon...' : 'Oui, abandonner'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {user?.role === 'customer_service' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              <StatCard icon={Users} label="Utilisateurs" value={stats?.total_users} color="primary" to="/dashboard/cs/users" />
              <StatCard icon={Megaphone} label="Prestataires" value={stats?.total_prestataires} color="green" />
              <StatCard icon={Users} label="Propriétaires" value={stats?.total_proprietaires} color="blue" />
              <StatCard icon={LifeBuoy} label="Tickets ouverts" value={stats?.open_tickets} color="red" to="/dashboard/cs/tickets" />
              <StatCard icon={ClipboardList} label="Tickets en cours" value={stats?.in_progress_tickets} color="yellow" />
              <StatCard icon={FileText} label="Mes tickets" value={stats?.my_tickets} color="purple" to="/dashboard/cs/tickets" />
            </div>
          )}
        </>
      )}
    </DashboardLayout>
  );
}

/* ─── Chat-like conversation for a quote (inline in dashboard) ─── */
function QuoteConversation({ quote, booking, fmt, onDecision, onSchedule, onPay, onBookingStatus, onAbandon, payingBookingId }) {
  const q = quote;
  const { user } = useAuth();

  const [messages, setMessages] = useState([]);
  const [chatMsg, setChatMsg] = useState('');
  const [sendingChat, setSendingChat] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [loadingChat, setLoadingChat] = useState(true);
  const chatEndRef = useRef(null);
  const chatContainerRef = useRef(null);

  useEffect(() => {
    const loadChat = async () => {
      setLoadingChat(true);
      try {
        const { data } = await messagingAPI.getConversations();
        const convos = data.results || data;
        const conv = convos.find(c => {
          const other = c.participants?.find(p => p.id !== user?.id);
          return other && (other.id === q.provider_id || other.username === q.provider_username);
        });
        if (conv) {
          setConversationId(conv.id);
          const msgRes = await messagingAPI.getMessages(conv.id);
          setMessages(msgRes.data.results || msgRes.data || []);
        }
      } catch { /* no conversation yet */ }
      finally { setLoadingChat(false); }
    };
    loadChat();
  }, [q.provider_id, q.provider_username]);

  // Auto-refresh messages every 10 seconds
  useEffect(() => {
    if (!conversationId) return;
    const interval = setInterval(async () => {
      try {
        const msgRes = await messagingAPI.getMessages(conversationId);
        const newMsgs = msgRes.data.results || msgRes.data || [];
        setMessages(prev => newMsgs.length !== prev.length ? newMsgs : prev);
      } catch { /* silent */ }
    }, 10000);
    return () => clearInterval(interval);
  }, [conversationId]);

  useEffect(() => {
    const el = chatContainerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const handleSendChat = async (e) => {
    e.preventDefault();
    if (!chatMsg.trim()) return;
    setSendingChat(true);
    try {
      if (conversationId) {
        await messagingAPI.sendInConversation(conversationId, { content: chatMsg });
        const msgRes = await messagingAPI.getMessages(conversationId);
        setMessages(msgRes.data.results || msgRes.data || []);
      } else {
        const res = await messagingAPI.sendMessage({
          recipient_id: q.provider_id,
          content: chatMsg,
        });
        if (res.data.conversation_id) {
          setConversationId(res.data.conversation_id);
          const msgRes = await messagingAPI.getMessages(res.data.conversation_id);
          setMessages(msgRes.data.results || msgRes.data || []);
        }
      }
      setChatMsg('');
    } catch {
      toast.error("Erreur lors de l'envoi");
    } finally { setSendingChat(false); }
  };

  const timeline = buildTimeline(q, messages, user, booking);

  return (
    <div className="flex flex-col">
      {/* Messages + Quote events timeline */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden mx-5 mt-5">
        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-gray-500" />
          <span className="font-semibold text-gray-900 dark:text-white">Conversation</span>
          <span className="text-sm text-gray-500 ml-auto">
            avec {q.provider_name || q.provider_username || 'le prestataire'}
            {q.ad && (
              <> · <Link to={`/services/${q.ad}`} className="text-brand-600 dark:text-brand-400 hover:underline">Voir l'annonce</Link></>
            )}
          </span>
        </div>

        <div ref={chatContainerRef} className="max-h-96 overflow-y-auto p-4 space-y-3 bg-white dark:bg-gray-900/50">
          {loadingChat ? (
            <p className="text-sm text-gray-500 text-center py-6">Chargement…</p>
          ) : timeline.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-6">
              Aucun message pour l'instant.
            </p>
          ) : (
            timeline.map((item, idx) => {
              if (item.type === 'quote_sent') {
                return (
                  <div key={`evt-sent-${idx}`} className="flex justify-end">
                    <div className="max-w-[85%] bg-black dark:bg-white text-white dark:text-black rounded-2xl rounded-br-md px-4 py-3">
                      <p className="text-sm whitespace-pre-line">{q.message}</p>
                      <p className="text-xs mt-1.5 text-gray-300 dark:text-gray-500">
                        {new Date(q.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                        {' · '}
                        {new Date(q.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                );
              }

              if (item.type === 'counter_offer') {
                return (
                  <div key={`evt-co-${idx}`} className="flex justify-start">
                    <div className="max-w-[85%] space-y-2">
                      <div className="bg-gradient-to-br from-brand-50 to-brand-100 dark:from-brand-900/30 dark:to-brand-800/20 border border-brand-200 dark:border-brand-700 rounded-2xl rounded-bl-md px-4 py-3.5">
                        <div className="flex items-center gap-2 mb-2">
                          <Euro className="h-4 w-4 text-brand-600 dark:text-brand-400" />
                          <span className="font-bold text-brand-700 dark:text-brand-300 text-lg">{fmt(q.quoted_price)}</span>
                        </div>
                        {q.provider_response && (
                          <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line mb-2">{q.provider_response}</p>
                        )}
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {new Date(q.updated_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                          {' · Devis du prestataire'}
                        </p>

                        {q.status === 'counter_offer' && (
                          <div className="flex gap-2 mt-3 pt-3 border-t border-brand-200 dark:border-brand-700">
                            <button
                              onClick={() => onDecision(q.id, 'accept')}
                              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition"
                            >
                              <ThumbsUp className="h-4 w-4" /> <span className="hidden sm:inline">Accepter</span>
                            </button>
                            <button
                              onClick={() => onDecision(q.id, 'decline')}
                              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white dark:bg-gray-800 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-xl text-sm font-bold hover:bg-red-50 dark:hover:bg-red-900/20 transition"
                            >
                              <ThumbsDown className="h-4 w-4" /> <span className="hidden sm:inline">Refuser</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              }

              if (item.type === 'accepted') {
                return (
                  <div key={`evt-acc-${idx}`} className="flex justify-center">
                    <div className="max-w-sm w-full space-y-1.5 text-center">
                      <div className="flex items-center justify-center gap-2 px-4 py-2.5 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-2xl text-sm font-medium text-green-700 dark:text-green-300">
                        <CheckCircle className="h-4 w-4" />
                        Devis accepté — {fmt(q.quoted_price)}
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Vous avez accepté le devis. Choisissez maintenant un créneau pour planifier l'intervention.</p>
                    </div>
                  </div>
                );
              }

              if (item.type === 'declined') {
                return (
                  <div key={`evt-dec-${idx}`} className="flex justify-center">
                    <div className="max-w-sm w-full space-y-1.5 text-center">
                      <div className="flex items-center justify-center gap-2 px-4 py-2.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl text-sm font-medium text-red-700 dark:text-red-300">
                        <ThumbsDown className="h-4 w-4" />
                        Devis refusé
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Vous avez refusé ce devis. Vous pouvez envoyer une nouvelle demande si vous le souhaitez.</p>
                    </div>
                  </div>
                );
              }

              if (item.type === 'booking_prompt') {
                return (
                  <div key={`evt-bp-${idx}`} className="flex justify-center">
                    <div className="max-w-sm w-full bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl px-5 py-4 text-center space-y-3">
                      <div className="flex items-center justify-center gap-2 text-blue-700 dark:text-blue-300">
                        <Calendar className="h-4 w-4" />
                        <span className="text-sm font-semibold">Prochaine étape</span>
                      </div>
                      <p className="text-sm text-blue-600 dark:text-blue-400">
                        Votre devis a été accepté ! Choisissez un créneau pour planifier l'intervention.
                      </p>
                      <button
                        onClick={onSchedule}
                        className="inline-flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition"
                      >
                        <Calendar className="h-4 w-4" /> Choisir un créneau
                      </button>
                    </div>
                  </div>
                );
              }

              if (item.type === 'booking_scheduled') {
                const b = item.data;
                return (
                  <div key={`evt-bs-${idx}`} className="flex justify-center">
                    <div className="max-w-sm w-full bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-2xl px-5 py-4 text-center space-y-2">
                      <div className="flex items-center justify-center gap-2 text-indigo-700 dark:text-indigo-300">
                        <CalendarCheck className="h-4 w-4" />
                        <span className="text-sm font-semibold">Créneau réservé</span>
                      </div>
                      <p className="text-sm text-indigo-600 dark:text-indigo-400">
                        {new Date(b.slot_details.start).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}{' '}
                        de {new Date(b.slot_details.start).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}{' '}
                        à {new Date(b.slot_details.end).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      <p className="text-sm text-indigo-500 dark:text-indigo-400">Votre créneau a été envoyé au prestataire. Il doit le confirmer avant de procéder.</p>
                    </div>
                  </div>
                );
              }

              if (item.type === 'booking_pending_confirmation') {
                return (
                  <div key={`evt-bpc-${idx}`} className="flex justify-center">
                    <div className="max-w-sm w-full bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl px-5 py-4 text-center space-y-1.5">
                      <div className="flex items-center justify-center gap-2 text-amber-700 dark:text-amber-300">
                        <Clock className="h-4 w-4" />
                        <span className="text-sm font-semibold">En attente de confirmation du prestataire</span>
                      </div>
                      <p className="text-sm text-amber-600 dark:text-amber-400">Le prestataire examine votre créneau. Vous recevrez une notification dès qu'il aura confirmé.</p>
                    </div>
                  </div>
                );
              }

              if (item.type === 'booking_confirmed') {
                const b = item.data;
                return (
                  <div key={`evt-bc-${idx}`} className="flex justify-center">
                    <div className="max-w-sm w-full space-y-2 text-center">
                      <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-full text-sm font-medium text-green-700 dark:text-green-300">
                        <CheckCircle className="h-4 w-4" />
                        Créneau confirmé par le prestataire
                      </div>
                      {b.status === 'confirmed' && !b.payments?.some(p => p.status === 'paid') && (
                        <div className="bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800 rounded-2xl px-5 py-4 space-y-2">
                          <p className="text-sm text-brand-700 dark:text-brand-300 font-medium">
                            Devis accepté : {fmt(q.quoted_price)}. Payez l'acompte de 30 % pour confirmer la réservation.
                          </p>
                          <button
                            onClick={onPay}
                            disabled={payingBookingId === b.id}
                            className="inline-flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-brand-600 text-white rounded-xl text-sm font-bold hover:bg-brand-700 transition disabled:opacity-50"
                          >
                            <CreditCard className="h-4 w-4" />
                            {payingBookingId === b.id ? 'Paiement...' : `Payer l'acompte — ${b.deposit_amount ? fmt(b.deposit_amount) : fmt(q.quoted_price * 0.3)}`}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              }

              if (item.type === 'booking_paid') {
                const b = item.data;
                const paid = b.payments?.find(p => p.status === 'paid');
                return (
                  <div key={`evt-bpaid-${idx}`} className="flex justify-center">
                    <div className="max-w-sm w-full space-y-2 text-center">
                      <div className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-sm font-medium text-emerald-700 dark:text-emerald-300">
                        <CreditCard className="h-4 w-4" />
                        Acompte payé{paid ? ` — ${fmt(paid.amount)}` : ''} ✓
                      </div>
                      {paid && (
                        <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-2xl px-5 py-3">
                          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Reçu de paiement</p>
                          <div className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                            <div className="flex justify-between"><span>Devis accepté</span><span className="font-medium">{fmt(q.quoted_price)}</span></div>
                            <div className="flex justify-between"><span>Acompte (30 %)</span><span className="font-medium">{fmt(paid.amount)}</span></div>
                            <div className="flex justify-between border-t border-gray-200 dark:border-gray-700 pt-1 mt-1"><span>Reste à payer</span><span className="font-bold">{fmt(q.quoted_price - paid.amount)}</span></div>
                          </div>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Payé le {new Date(paid.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                        </div>
                      )}
                      <p className="text-sm text-gray-500 dark:text-gray-400">Votre acompte a été versé avec succès. Le prestataire va maintenant réaliser les travaux prévus.</p>
                    </div>
                  </div>
                );
              }

              if (item.type === 'booking_completed') {
                return (
                  <div key={`evt-bcomp-${idx}`} className="flex justify-center">
                    <div className="max-w-sm w-full space-y-1.5 text-center">
                      <div className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-sm font-medium text-emerald-700 dark:text-emerald-300">
                        <CheckCircle className="h-4 w-4" />
                        Travaux terminés ✓
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Le prestataire a marqué les travaux comme terminés. Le reste à payer sera à régler directement avec le prestataire.</p>
                    </div>
                  </div>
                );
              }

              if (item.type === 'booking_cancelled') {
                return (
                  <div key={`evt-bcan-${idx}`} className="flex justify-center">
                    <div className="max-w-sm w-full space-y-1.5 text-center">
                      <div className="flex items-center justify-center gap-2 px-4 py-2.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl text-sm font-medium text-red-700 dark:text-red-300">
                        <XCircle className="h-4 w-4" />
                        Réservation annulée
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Cette réservation a été annulée. Vous pouvez envoyer une nouvelle demande si nécessaire.</p>
                    </div>
                  </div>
                );
              }

              if (item.type === 'quote_cancelled') {
                return (
                  <div key={`evt-qcan-${idx}`} className="flex justify-center">
                    <div className="max-w-sm w-full space-y-1.5 text-center">
                      <div className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium text-gray-600 dark:text-gray-400">
                        <Ban className="h-4 w-4" />
                        Demande abandonnée
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Cette demande a été abandonnée. Aucune suite ne sera donnée.</p>
                    </div>
                  </div>
                );
              }

              if (item.type === 'message') {
                const msg = item.data;
                const isMe = msg.sender === user?.id;
                return (
                  <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                      isMe
                        ? 'bg-black dark:bg-white text-white dark:text-black rounded-br-md'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-bl-md'
                    }`}>
                      <p className="text-sm whitespace-pre-line">{msg.content}</p>
                      <p className={`text-xs mt-1 ${isMe ? 'text-gray-300 dark:text-gray-500' : 'text-gray-400'}`}>
                        {new Date(msg.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                );
              }

              return null;
            })
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Chat input + abandon */}
        <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          {!['cancelled', 'completed', 'declined'].includes(q.status) && (
            <div className="px-3 pt-2 flex justify-end">
              <button
                onClick={onAbandon}
                className="inline-flex items-center gap-1 text-xs text-red-400 hover:text-red-600 dark:hover:text-red-300 transition"
              >
                <XCircle className="h-3.5 w-3.5" /> Abandonner la demande
              </button>
            </div>
          )}
          <form onSubmit={handleSendChat} className="p-3 flex gap-2">
            <input
              type="text"
              className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-full text-sm bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:ring-2 focus:ring-brand-300"
              value={chatMsg}
              onChange={(e) => setChatMsg(e.target.value)}
              placeholder="Écrire un message…"
            />
            <button
              type="submit"
              disabled={!chatMsg.trim() || sendingChat}
              className="px-4 py-2.5 bg-black dark:bg-white text-white dark:text-black rounded-full hover:bg-gray-800 dark:hover:bg-gray-200 transition disabled:opacity-50 flex-shrink-0"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

/* ─── Build a chronological timeline mixing messages and quote events ─── */
function buildTimeline(quote, messages, user, booking) {
  const items = [];

  items.push({
    type: 'quote_sent',
    timestamp: new Date(quote.created_at).getTime(),
  });

  if (quote.quoted_price && ['counter_offer', 'accepted', 'declined', 'completed', 'cancelled'].includes(quote.status)) {
    items.push({
      type: 'counter_offer',
      timestamp: new Date(quote.updated_at).getTime() - 1,
    });
  }

  if (['accepted', 'completed'].includes(quote.status) || (quote.status === 'cancelled' && booking)) {
    items.push({
      type: 'accepted',
      timestamp: new Date(quote.updated_at).getTime(),
    });

    // Booking lifecycle events
    if (booking) {
      const bt = new Date(booking.created_at).getTime();

      if (booking.slot_details) {
        items.push({ type: 'booking_scheduled', data: booking, timestamp: bt });
      }

      // Pending → waiting for provider confirmation
      if (booking.status === 'pending') {
        items.push({ type: 'booking_pending_confirmation', data: booking, timestamp: bt + 1 });
      }

      // Confirmed (provider accepted the slot)
      if (['confirmed', 'deposit_paid', 'in_progress', 'completed'].includes(booking.status)) {
        items.push({ type: 'booking_confirmed', data: booking, timestamp: bt + 2 });
      }

      // Deposit paid
      if (['deposit_paid', 'in_progress', 'completed'].includes(booking.status)) {
        items.push({ type: 'booking_paid', data: booking, timestamp: bt + 3 });
      }

      // Completed
      if (booking.status === 'completed') {
        items.push({ type: 'booking_completed', data: booking, timestamp: bt + 4 });
      }

      // Cancelled
      if (booking.status === 'cancelled') {
        items.push({ type: 'booking_cancelled', data: booking, timestamp: bt + 5 });
      }
    } else {
      // No booking yet → prompt to schedule
      items.push({
        type: 'booking_prompt',
        timestamp: new Date(quote.updated_at).getTime() + 1,
      });
    }
  }

  if (quote.status === 'declined') {
    items.push({
      type: 'declined',
      timestamp: new Date(quote.updated_at).getTime(),
    });
  }

  if (quote.status === 'cancelled' && !booking) {
    items.push({
      type: 'quote_cancelled',
      timestamp: new Date(quote.updated_at).getTime() + 1,
    });
  }

  messages.forEach(msg => {
    items.push({
      type: 'message',
      data: msg,
      timestamp: new Date(msg.created_at).getTime(),
    });
  });

  items.sort((a, b) => a.timestamp - b.timestamp);
  return items;
}

/* ─── Provider-side inline request detail (mirrors ReceivedQuotes RequestDetail) ─── */
const TIMEFRAME_LABELS = {
  asap: 'Le plus tôt possible',
  '3months': "D'ici 3 mois",
  '6months': "D'ici 6 mois",
  '1year': "D'ici 1 an",
  unknown: 'Non précisé',
};

function ProviderRequestDetail({ quote, booking, onRefresh, onBookingStatus, onAbandon }) {
  const q = quote;
  const { user } = useAuth();
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [quoteData, setQuoteData] = useState({
    quoted_price: q.quoted_price || '',
    provider_response: q.provider_response || '',
    timeframe_estimate: '',
  });
  const [sending, setSending] = useState(false);

  const [messages, setMessages] = useState([]);
  const [chatMsg, setChatMsg] = useState('');
  const [sendingChat, setSendingChat] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [loadingChat, setLoadingChat] = useState(true);
  const chatEndRef = useRef(null);
  const chatContainerRef2 = useRef(null);

  useEffect(() => {
    const loadChat = async () => {
      setLoadingChat(true);
      try {
        const { data } = await messagingAPI.getConversations();
        const convos = data.results || data;
        const conv = convos.find(c => {
          const other = c.participants?.find(p => p.id !== user?.id);
          return other && (other.id === q.owner_id || other.username === q.owner_username);
        });
        if (conv) {
          setConversationId(conv.id);
          const msgRes = await messagingAPI.getMessages(conv.id);
          setMessages(msgRes.data.results || msgRes.data || []);
        }
      } catch { /* no conversation yet */ }
      finally { setLoadingChat(false); }
    };
    loadChat();
  }, [q.owner_id, q.owner_username]);

  // Auto-refresh messages every 10 seconds
  useEffect(() => {
    if (!conversationId) return;
    const interval = setInterval(async () => {
      try {
        const msgRes = await messagingAPI.getMessages(conversationId);
        const newMsgs = msgRes.data.results || msgRes.data || [];
        setMessages(prev => newMsgs.length !== prev.length ? newMsgs : prev);
      } catch { /* silent */ }
    }, 10000);
    return () => clearInterval(interval);
  }, [conversationId]);

  useEffect(() => {
    const el = chatContainerRef2.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const handleSendQuote = async () => {
    if (!quoteData.quoted_price) { toast.error('Veuillez indiquer un prix'); return; }
    setSending(true);
    try {
      let responseText = quoteData.provider_response;
      if (quoteData.timeframe_estimate) {
        responseText = `Délai estimé : ${quoteData.timeframe_estimate}\n${responseText}`.trim();
      }
      await adsAPI.respondQuote(q.id, {
        status: 'counter_offer',
        quoted_price: quoteData.quoted_price,
        provider_response: responseText,
      });
      toast.success('Devis envoyé au client !');
      setShowQuoteForm(false);
      onRefresh();
    } catch { toast.error("Erreur lors de l'envoi"); }
    finally { setSending(false); }
  };

  const handleSendChat = async (e) => {
    e.preventDefault();
    if (!chatMsg.trim()) return;
    setSendingChat(true);
    try {
      if (conversationId) {
        await messagingAPI.sendInConversation(conversationId, { content: chatMsg });
        const msgRes = await messagingAPI.getMessages(conversationId);
        setMessages(msgRes.data.results || msgRes.data || []);
      } else {
        const res = await messagingAPI.sendMessage({ recipient_id: q.owner_id, content: chatMsg });
        if (res.data.conversation_id) {
          setConversationId(res.data.conversation_id);
          const msgRes = await messagingAPI.getMessages(res.data.conversation_id);
          setMessages(msgRes.data.results || msgRes.data || []);
        }
      }
      setChatMsg('');
    } catch { toast.error("Erreur lors de l'envoi"); }
    finally { setSendingChat(false); }
  };

  const inputClass = 'w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-brand-300 focus:border-transparent outline-none';

  const fmt = (v) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(v);
  const providerTimeline = buildTimeline(q, messages, user, booking || null);

  return (
    <div className="px-5 py-5 space-y-5">
      {/* Client request summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-3">
          <div className="flex items-start gap-2">
            <User className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Client</p>
              <p className="font-medium text-gray-900 dark:text-white">{q.owner_name || q.owner_username}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <FileText className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Service demandé</p>
              <p className="font-medium text-gray-900 dark:text-white">{q.ad_title}</p>
            </div>
          </div>
          {q.owner_region && (
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Localisation</p>
                <p className="text-gray-900 dark:text-white">{q.owner_region}</p>
              </div>
            </div>
          )}
        </div>
        <div className="space-y-3">
          <div className="flex items-start gap-2">
            <Clock className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Demande envoyée</p>
              <p className="text-gray-900 dark:text-white">{new Date(q.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <CalendarCheck className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Délai souhaité</p>
              <p className="text-gray-900 dark:text-white">
                {q.desired_timeframe
                  ? (TIMEFRAME_LABELS[q.desired_timeframe] || q.desired_timeframe_display || 'Non précisé')
                  : (q.preferred_date
                    ? new Date(q.preferred_date).toLocaleDateString('fr-FR')
                    : 'Non précisé'
                  )
                }
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Action Panel */}
      {q.status === 'pending' && (
        <div className="flex flex-wrap gap-3">
          <button onClick={() => setShowQuoteForm(!showQuoteForm)} className="inline-flex items-center gap-2 px-5 py-2.5 bg-black dark:bg-white text-white dark:text-black rounded-lg font-bold hover:bg-gray-800 dark:hover:bg-gray-200 transition">
            <Euro className="h-4 w-4" /> Envoyer un devis
          </button>
          <button onClick={() => document.getElementById(`dash-chat-input-${q.id}`)?.focus()} className="inline-flex items-center gap-2 px-5 py-2.5 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition">
            <MessageSquare className="h-4 w-4" /> Répondre un message
          </button>
          <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 sm:ml-auto">
            <Info className="h-4 w-4" />
            <span>Essayez de répondre sous 24h</span>
          </div>
        </div>
      )}

      {/* Quote Form */}
      {showQuoteForm && q.status === 'pending' && (
        <div className="bg-brand-50/50 dark:bg-brand-900/10 border border-brand-200 dark:border-brand-800 rounded-lg p-5 space-y-4">
          <h4 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Euro className="h-4 w-4 text-brand-600" /> Envoyer votre devis
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">Prix *</label>
              <div className="relative">
                <input type="text" inputMode="decimal" className={inputClass} value={quoteData.quoted_price} onChange={(e) => setQuoteData({ ...quoteData, quoted_price: e.target.value })} placeholder="ex: 5000" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">€</span>
              </div>
            </div>
            <div>
              <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">Délai estimé</label>
              <input type="text" className={inputClass} value={quoteData.timeframe_estimate} onChange={(e) => setQuoteData({ ...quoteData, timeframe_estimate: e.target.value })} placeholder="ex: 2 à 3 semaines" />
            </div>
          </div>
          <div>
            <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">Commentaire / détails (optionnel)</label>
            <textarea rows={3} className={inputClass} value={quoteData.provider_response} onChange={(e) => setQuoteData({ ...quoteData, provider_response: e.target.value })} placeholder="Détails du devis, conditions, ce qui est inclus..." />
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowQuoteForm(false)} className="px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg font-medium hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-900 dark:text-white transition">Annuler</button>
            <button onClick={handleSendQuote} disabled={!quoteData.quoted_price || sending} className="px-5 py-2.5 bg-brand-600 text-white rounded-lg font-bold hover:bg-brand-700 transition disabled:opacity-50 flex items-center gap-2">
              {sending ? 'Envoi...' : <><Send className="h-4 w-4" /> Envoyer le devis</>}
            </button>
          </div>
        </div>
      )}

      {/* Messages + Quote events timeline */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-gray-600 dark:text-gray-300" />
          <span className="font-semibold text-gray-900 dark:text-white">Conversation</span>
          <span className="text-sm text-gray-500 dark:text-gray-400 ml-auto">
            avec {q.owner_name || q.owner_username || 'le client'}
            {q.ad && (
              <> · <Link to={`/services/${q.ad}`} className="text-brand-600 dark:text-brand-400 hover:underline">Voir l'annonce</Link></>
            )}
          </span>
        </div>
        <div ref={chatContainerRef2} className="h-96 overflow-y-auto p-5 space-y-3 bg-white dark:bg-gray-900/50">
          {loadingChat ? (
            <p className="text-gray-500 text-center py-8">Chargement…</p>
          ) : providerTimeline.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Aucun message pour l'instant. Envoyez un message au client ci-dessous.</p>
          ) : (
            providerTimeline.map((item, idx) => {
              if (item.type === 'quote_sent') {
                return (
                  <div key={`evt-sent-${idx}`} className="flex justify-start">
                    <div className="max-w-[85%] bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-2xl rounded-bl-md px-4 py-3">
                      <p className="text-sm whitespace-pre-line">{q.message}</p>
                      <p className="text-xs mt-1.5 text-gray-400">
                        {new Date(q.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                        {' · '}
                        {new Date(q.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        {' · Demande du client'}
                      </p>
                    </div>
                  </div>
                );
              }

              if (item.type === 'counter_offer') {
                return (
                  <div key={`evt-co-${idx}`} className="flex justify-end">
                    <div className="max-w-[85%]">
                      <div className="bg-gradient-to-br from-brand-50 to-brand-100 dark:from-brand-900/30 dark:to-brand-800/20 border border-brand-200 dark:border-brand-700 rounded-2xl rounded-br-md px-4 py-3.5">
                        <div className="flex items-center gap-2 mb-2">
                          <Euro className="h-4 w-4 text-brand-600 dark:text-brand-400" />
                          <span className="font-bold text-brand-700 dark:text-brand-300 text-lg">{fmt(q.quoted_price)}</span>
                        </div>
                        {q.provider_response && (
                          <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line mb-2">{q.provider_response}</p>
                        )}
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {new Date(q.updated_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                          {' · Votre devis'}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              }

              if (item.type === 'accepted') {
                return (
                  <div key={`evt-acc-${idx}`} className="flex justify-center">
                    <div className="max-w-sm w-full space-y-1.5 text-center">
                      <div className="flex items-center justify-center gap-2 px-4 py-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-2xl text-sm font-medium text-green-700 dark:text-green-300">
                        <CheckCircle className="h-4 w-4" />
                        Devis accepté — {fmt(q.quoted_price)}
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Le client a accepté votre devis. Il va maintenant choisir un créneau d'intervention.</p>
                    </div>
                  </div>
                );
              }

              if (item.type === 'declined') {
                return (
                  <div key={`evt-dec-${idx}`} className="flex justify-center">
                    <div className="max-w-sm w-full space-y-1.5 text-center">
                      <div className="flex items-center justify-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl text-sm font-medium text-red-700 dark:text-red-300">
                        <ThumbsDown className="h-4 w-4" />
                        Devis refusé
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Le client a refusé votre devis. Vous pouvez lui envoyer un message pour en discuter.</p>
                    </div>
                  </div>
                );
              }

              if (item.type === 'booking_prompt') {
                return (
                  <div key={`evt-bp-${idx}`} className="flex justify-center">
                    <div className="max-w-sm w-full bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl px-5 py-4 text-center space-y-2">
                      <div className="flex items-center justify-center gap-2 text-blue-700 dark:text-blue-300">
                        <Calendar className="h-4 w-4" />
                        <span className="text-sm font-semibold">En attente du client</span>
                      </div>
                      <p className="text-sm text-blue-600 dark:text-blue-400">
                        Le client choisit un créneau pour planifier l'intervention. Vous serez notifié dès qu'il aura réservé.
                      </p>
                      <Link
                        to="/dashboard/availability"
                        className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-700 dark:text-blue-300 hover:underline"
                      >
                        <Calendar className="h-3.5 w-3.5" /> Gérer mes créneaux
                      </Link>
                    </div>
                  </div>
                );
              }

              if (item.type === 'booking_scheduled') {
                const b = item.data;
                return (
                  <div key={`evt-bs-${idx}`} className="flex justify-center">
                    <div className="max-w-sm w-full bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-2xl px-5 py-4 text-center space-y-2">
                      <div className="flex items-center justify-center gap-2 text-indigo-700 dark:text-indigo-300">
                        <CalendarCheck className="h-4 w-4" />
                        <span className="text-sm font-semibold">Créneau réservé par le client</span>
                      </div>
                      <p className="text-sm text-indigo-600 dark:text-indigo-400">
                        {new Date(b.slot_details.start).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}{' '}
                        de {new Date(b.slot_details.start).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}{' '}
                        à {new Date(b.slot_details.end).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      <p className="text-sm text-indigo-500 dark:text-indigo-400">Le client a choisi ce créneau. Confirmez ou refusez la réservation ci-dessous.</p>
                    </div>
                  </div>
                );
              }

              if (item.type === 'booking_pending_confirmation') {
                const b = item.data;
                return (
                  <div key={`evt-bpc-${idx}`} className="flex justify-center">
                    <div className="max-w-sm w-full bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl px-5 py-4 text-center space-y-3">
                      <div className="flex items-center justify-center gap-2 text-amber-700 dark:text-amber-300">
                        <Clock className="h-4 w-4" />
                        <span className="text-sm font-semibold">Confirmer le créneau</span>
                      </div>
                      <p className="text-sm text-amber-600 dark:text-amber-400">
                        Le client a réservé un créneau. Acceptez ou refusez la réservation.
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => onBookingStatus(b.id, 'confirmed')}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition"
                        >
                          <CheckCircle className="h-4 w-4" /> Accepter
                        </button>
                        <button
                          onClick={() => onBookingStatus(b.id, 'cancelled')}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-white dark:bg-gray-800 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-xl text-sm font-bold hover:bg-red-50 dark:hover:bg-red-900/20 transition"
                        >
                          <XCircle className="h-4 w-4" /> Refuser
                        </button>
                      </div>
                    </div>
                  </div>
                );
              }

              if (item.type === 'booking_confirmed') {
                return (
                  <div key={`evt-bc-${idx}`} className="flex justify-center">
                    <div className="max-w-sm w-full space-y-1.5 text-center">
                      <div className="flex items-center justify-center gap-2 px-4 py-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-2xl text-sm font-medium text-green-700 dark:text-green-300">
                        <CheckCircle className="h-4 w-4" />
                        Créneau confirmé — en attente de l'acompte
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Vous avez confirmé le créneau. Le client doit maintenant payer l'acompte de 30 % pour finaliser la réservation.</p>
                    </div>
                  </div>
                );
              }

              if (item.type === 'booking_paid') {
                const b = item.data;
                const paid = b.payments?.find(p => p.status === 'paid');
                return (
                  <div key={`evt-bpaid-${idx}`} className="flex justify-center">
                    <div className="max-w-sm w-full space-y-2 text-center">
                      <div className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-sm font-medium text-emerald-700 dark:text-emerald-300">
                        <CreditCard className="h-4 w-4" />
                        Acompte reçu{paid ? ` — ${fmt(paid.amount)}` : ''} ✓
                      </div>
                      {b.status === 'deposit_paid' && (
                        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl px-5 py-4 space-y-2">
                          <p className="text-sm text-emerald-700 dark:text-emerald-300 font-medium">
                            L'acompte a été reçu. Marquez les travaux comme terminés une fois finis.
                          </p>
                          <button
                            onClick={() => onBookingStatus(b.id, 'completed')}
                            className="inline-flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition"
                          >
                            <CheckCircle className="h-4 w-4" /> Marquer terminé
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              }

              if (item.type === 'booking_completed') {
                return (
                  <div key={`evt-bcomp-${idx}`} className="flex justify-center">
                    <div className="max-w-sm w-full space-y-1.5 text-center">
                      <div className="flex items-center justify-center gap-2 px-4 py-2 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-sm font-medium text-emerald-700 dark:text-emerald-300">
                        <CheckCircle className="h-4 w-4" />
                        Travaux terminés ✓
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Vous avez marqué les travaux comme terminés. Le solde restant sera à régler directement avec le client.</p>
                    </div>
                  </div>
                );
              }

              if (item.type === 'booking_cancelled') {
                return (
                  <div key={`evt-bcan-${idx}`} className="flex justify-center">
                    <div className="max-w-sm w-full space-y-1.5 text-center">
                      <div className="flex items-center justify-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl text-sm font-medium text-red-700 dark:text-red-300">
                        <XCircle className="h-4 w-4" />
                        Réservation annulée
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Cette réservation a été annulée. Aucune suite ne sera donnée.</p>
                    </div>
                  </div>
                );
              }

              if (item.type === 'quote_cancelled') {
                return (
                  <div key={`evt-qcan-${idx}`} className="flex justify-center">
                    <div className="max-w-sm w-full space-y-1.5 text-center">
                      <div className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium text-gray-600 dark:text-gray-400">
                        <Ban className="h-4 w-4" />
                        Demande abandonnée
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Cette demande a été abandonnée par l'une des parties.</p>
                    </div>
                  </div>
                );
              }

              if (item.type === 'message') {
                const msg = item.data;
                const isMe = msg.sender === user?.id;
                return (
                  <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${isMe ? 'bg-brand-600 text-white rounded-br-md' : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-bl-md'}`}>
                      <p className="whitespace-pre-line">{msg.content}</p>
                      <p className={`text-xs mt-1.5 ${isMe ? 'text-brand-200' : 'text-gray-500 dark:text-gray-400'}`}>
                        {new Date(msg.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                );
              }

              return null;
            })
          )}
          <div ref={chatEndRef} />
        </div>
        {/* Chat input + abandon */}
        <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          {!['cancelled', 'completed', 'declined'].includes(q.status) && (
            <div className="px-4 pt-2 flex justify-end">
              <button
                onClick={onAbandon}
                className="inline-flex items-center gap-1 text-xs text-red-400 hover:text-red-600 dark:hover:text-red-300 transition"
              >
                <XCircle className="h-3.5 w-3.5" /> Abandonner la demande
              </button>
            </div>
          )}
          <form onSubmit={handleSendChat} className="p-4 flex gap-3">
            <input
              id={`dash-chat-input-${q.id}`}
              type="text"
              className="flex-1 px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-full bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:ring-2 focus:ring-brand-300"
              value={chatMsg}
              onChange={(e) => setChatMsg(e.target.value)}
              placeholder="Écrire un message…"
            />
            <button type="submit" disabled={!chatMsg.trim() || sendingChat} className="px-5 py-3 bg-black dark:bg-white text-white dark:text-black rounded-full hover:bg-gray-800 dark:hover:bg-gray-200 transition disabled:opacity-50 flex-shrink-0">
              <Send className="h-5 w-5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}