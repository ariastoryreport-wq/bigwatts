import { useState, useEffect, useRef } from 'react';
import { adsAPI, bookingsAPI, messagingAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Card, PageHeader, LoadingSpinner, EmptyState } from '../../components/ui';
import {
  FileText, Calendar, CreditCard, CheckCircle, ThumbsUp, ThumbsDown,
  Send, Euro, User, ChevronDown, ChevronUp, MessageSquare, Clock,
} from 'lucide-react';
import SchedulingModal from '../../components/SchedulingModal';
import toast from 'react-hot-toast';

const STATUS_CONFIG = {
  pending:       { label: 'En attente',   dot: 'bg-blue-500',   bg: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' },
  counter_offer: { label: 'Devis reçu',   dot: 'bg-yellow-500', bg: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300' },
  accepted:      { label: 'Accepté',      dot: 'bg-green-500',  bg: 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300' },
  declined:      { label: 'Refusé',       dot: 'bg-red-400',    bg: 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300' },
  completed:     { label: 'Terminé',      dot: 'bg-gray-400',   bg: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300' },
  cancelled:     { label: 'Annulé',       dot: 'bg-gray-300',   bg: 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400' },
};

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `il y a ${mins}min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `il y a ${days}j`;
  return new Date(dateStr).toLocaleDateString('fr-FR');
}

export default function MyQuotes() {
  const [quotes, setQuotes] = useState([]);
  const [bookings, setBookings] = useState({});
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [schedulingQuoteId, setSchedulingQuoteId] = useState(null);
  const [payingBookingId, setPayingBookingId] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [quotesRes, bookingsRes] = await Promise.all([
        adsAPI.getMyQuotes(),
        bookingsAPI.getBookings(),
      ]);
      const qList = quotesRes.data.results || quotesRes.data;
      const bList = bookingsRes.data.results || bookingsRes.data;
      setQuotes(qList);
      const bMap = {};
      bList.forEach(b => { bMap[b.quote] = b; });
      setBookings(bMap);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  // Auto-expand first actionable quote
  useEffect(() => {
    if (quotes.length > 0 && expandedId === null) {
      const first = quotes.find(q => q.status === 'counter_offer') || quotes[0];
      if (first) setExpandedId(first.id);
    }
  }, [quotes]);

  const handleBooked = () => { setSchedulingQuoteId(null); fetchData(); };

  const handleDecision = async (quoteId, decision) => {
    try {
      await adsAPI.decideQuote(quoteId, decision);
      toast.success(decision === 'accept' ? 'Devis accepté !' : 'Devis refusé');
      fetchData();
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
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur lors du paiement.');
    } finally { setPayingBookingId(null); }
  };

  const fmt = (v) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(v);

  return (
    <DashboardLayout>
      <PageHeader title="Mes demandes" description="Suivez vos demandes de devis et échangez avec les prestataires" />

      {loading ? <LoadingSpinner /> : quotes.length === 0 ? (
        <EmptyState icon={FileText} title="Aucune demande" description="Parcourez les services et demandez un devis." />
      ) : (
        <div className="space-y-3">
          {quotes.map((q) => {
            const booking = bookings[q.id];
            const sc = STATUS_CONFIG[q.status] || STATUS_CONFIG.pending;
            const isExpanded = expandedId === q.id;
            return (
              <Card key={q.id} className={`p-0 overflow-hidden transition-all ${q.status === 'counter_offer' ? 'border-l-4 border-l-yellow-500' : ''}`}>
                {/* ─── Header ─── */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : q.id)}
                  className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition"
                >
                  <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                    <User className="h-5 w-5 text-gray-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {q.provider_name || q.ad_title}
                      </span>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${sc.bg}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                        {sc.label}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate mt-0.5">
                      {q.ad_title}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-sm text-gray-500 hidden sm:block">{timeAgo(q.created_at)}</span>
                    {q.quoted_price && (
                      <span className="font-bold text-gray-900 dark:text-white">
                        {fmt(q.quoted_price)}
                      </span>
                    )}
                    {isExpanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                  </div>
                </button>

                {/* ─── Expanded: Chat-like conversation view ─── */}
                {isExpanded && (
                  <div className="border-t border-gray-100 dark:border-gray-800">
                    <QuoteConversation
                      quote={q}
                      booking={booking}
                      fmt={fmt}
                      onDecision={handleDecision}
                      onSchedule={() => setSchedulingQuoteId(q.id)}
                      onPay={() => handlePayDeposit(booking?.id)}
                      payingBookingId={payingBookingId}
                    />
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {schedulingQuoteId && (
        <SchedulingModal
          quoteId={schedulingQuoteId}
          onClose={() => setSchedulingQuoteId(null)}
          onBooked={handleBooked}
        />
      )}
    </DashboardLayout>
  );
}

/* ─── Chat-like conversation for a quote ─── */
function QuoteConversation({ quote, booking, fmt, onDecision, onSchedule, onPay, payingBookingId }) {
  const q = quote;
  const { user } = useAuth();

  // Chat state
  const [messages, setMessages] = useState([]);
  const [chatMsg, setChatMsg] = useState('');
  const [sendingChat, setSendingChat] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [loadingChat, setLoadingChat] = useState(true);
  const chatEndRef = useRef(null);

  // Load conversation with this provider
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

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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

  // Build a combined timeline: messages + quote events
  const timeline = buildTimeline(q, messages, user);

  return (
    <div className="flex flex-col">
      {/* ── Messages + Quote events timeline ── */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden mx-5 mt-5">
        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-gray-500" />
          <span className="font-semibold text-gray-900 dark:text-white">Conversation</span>
          <span className="text-sm text-gray-500 ml-auto">
            avec {q.provider_name || q.provider_username || 'le prestataire'}
          </span>
        </div>

        <div className="max-h-96 overflow-y-auto p-4 space-y-3 bg-white dark:bg-gray-900/50">
          {loadingChat ? (
            <p className="text-sm text-gray-500 text-center py-6">Chargement…</p>
          ) : timeline.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-6">
              Aucun message pour l'instant.
            </p>
          ) : (
            timeline.map((item, idx) => {
              // ── System event (quote request sent, counter-offer, accepted, etc.) ──
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
                      {/* Quote card bubble */}
                      <div className="bg-gradient-to-br from-brand-50 to-brand-100 dark:from-brand-900/30 dark:to-brand-800/20 border border-brand-200 dark:border-brand-700 rounded-2xl rounded-bl-md px-4 py-3.5">
                        <div className="flex items-center gap-2 mb-2">
                          <Euro className="h-4 w-4 text-brand-600 dark:text-brand-400" />
                          <span className="font-bold text-brand-700 dark:text-brand-300 text-lg">{fmt(q.quoted_price)}</span>
                        </div>
                        {q.provider_response && (
                          <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line mb-2">{q.provider_response}</p>
                        )}
                        <p className="text-xs text-gray-500">
                          {new Date(q.updated_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                          {' · Devis du prestataire'}
                        </p>

                        {/* Accept / Decline buttons — only if status is still counter_offer */}
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
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-full text-sm font-medium text-green-700 dark:text-green-300">
                      <CheckCircle className="h-4 w-4" />
                      Devis accepté — {fmt(q.quoted_price)}
                    </div>
                  </div>
                );
              }

              if (item.type === 'declined') {
                return (
                  <div key={`evt-dec-${idx}`} className="flex justify-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-full text-sm font-medium text-red-700 dark:text-red-300">
                      <ThumbsDown className="h-4 w-4" />
                      Devis refusé
                    </div>
                  </div>
                );
              }

              // ── Regular chat message ──
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

        {/* Chat input */}
        <form onSubmit={handleSendChat} className="border-t border-gray-200 dark:border-gray-700 p-3 flex gap-2 bg-white dark:bg-gray-900">
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

      {/* ── Actions below chat (booking / payment) ── */}
      <div className="px-5 py-4 space-y-3">
        {/* Slot info */}
        {booking?.slot_details && (
          <div className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg">
            <Calendar className="h-4 w-4 text-brand-500 flex-shrink-0" />
            <span>
              Créneau : {new Date(booking.slot_details.start).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'long' })} de {new Date(booking.slot_details.start).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} à {new Date(booking.slot_details.end).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        )}

        {/* Payment info */}
        {booking?.payments?.some(p => p.status === 'paid') && (
          <div className="flex items-center gap-3 text-sm bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-lg">
            <CheckCircle className="h-4 w-4 text-emerald-500 flex-shrink-0" />
            <span className="text-emerald-700 dark:text-emerald-400">
              Acompte payé : {fmt(booking.payments.find(p => p.status === 'paid').amount)} ✓
            </span>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          {q.status === 'accepted' && !booking && (
            <button
              onClick={onSchedule}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-black dark:bg-white text-white dark:text-black rounded-lg font-bold hover:bg-gray-800 dark:hover:bg-gray-200 transition"
            >
              <Calendar className="h-4 w-4" /> Choisir un créneau
            </button>
          )}
          {booking?.status === 'confirmed' && (
            <button
              onClick={onPay}
              disabled={payingBookingId === booking.id}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 text-white rounded-lg font-bold hover:bg-brand-700 transition disabled:opacity-50"
            >
              <CreditCard className="h-4 w-4" />
              {payingBookingId === booking.id ? 'Paiement...' : `Payer l'acompte (${booking.deposit_amount ? fmt(booking.deposit_amount) : '30%'})`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Build a chronological timeline mixing messages and quote events ─── */
function buildTimeline(quote, messages, user) {
  const items = [];

  // 1. The initial quote request (my message)
  items.push({
    type: 'quote_sent',
    timestamp: new Date(quote.created_at).getTime(),
  });

  // 2. If there's a counter-offer
  if (quote.quoted_price && ['counter_offer', 'accepted', 'declined', 'completed'].includes(quote.status)) {
    items.push({
      type: 'counter_offer',
      timestamp: new Date(quote.updated_at).getTime() - 1, // slightly before acceptance if same time
    });
  }

  // 3. If accepted
  if (quote.status === 'accepted' || quote.status === 'completed') {
    items.push({
      type: 'accepted',
      timestamp: new Date(quote.updated_at).getTime(),
    });
  }

  // 4. If declined
  if (quote.status === 'declined') {
    items.push({
      type: 'declined',
      timestamp: new Date(quote.updated_at).getTime(),
    });
  }

  // 5. All chat messages
  messages.forEach(msg => {
    items.push({
      type: 'message',
      data: msg,
      timestamp: new Date(msg.created_at).getTime(),
    });
  });

  // Sort chronologically
  items.sort((a, b) => a.timestamp - b.timestamp);
  return items;
}
