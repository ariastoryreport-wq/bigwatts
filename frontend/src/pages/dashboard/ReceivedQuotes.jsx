import { useState, useEffect, useRef } from 'react';
import { adsAPI, messagingAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Card, PageHeader, LoadingSpinner, EmptyState } from '../../components/ui';
import {
  ClipboardList, MapPin, Clock, User, Send, Euro,
  ChevronDown, ChevronUp, MessageSquare, CalendarCheck,
  Info, FileText, CheckCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';

const TIMEFRAME_LABELS = {
  asap: 'Le plus tôt possible',
  '3months': "D'ici 3 mois",
  '6months': "D'ici 6 mois",
  '1year': "D'ici 1 an",
  unknown: 'Non précisé',
};

const STATUS_CONFIG = {
  pending:       { label: 'Nouveau',       dot: 'bg-blue-500',   bg: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' },
  counter_offer: { label: 'Devis envoyé',  dot: 'bg-yellow-500', bg: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300' },
  accepted:      { label: 'Accepté',       dot: 'bg-green-500',  bg: 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300' },
  declined:      { label: 'Refusé',        dot: 'bg-red-400',    bg: 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300' },
  completed:     { label: 'Terminé',       dot: 'bg-gray-400',   bg: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300' },
  cancelled:     { label: 'Annulé',        dot: 'bg-gray-300',   bg: 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400' },
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

export default function ReceivedQuotes() {
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  const fetchQuotes = async () => {
    try {
      const { data } = await adsAPI.getReceivedQuotes();
      setQuotes(data.results || data);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchQuotes(); }, []);

  // Auto-expand first pending quote
  useEffect(() => {
    if (quotes.length > 0 && expandedId === null) {
      const first = quotes.find(q => q.status === 'pending');
      if (first) setExpandedId(first.id);
    }
  }, [quotes]);

  return (
    <DashboardLayout>
      <PageHeader
        title="Demandes clients"
        description="Consultez les demandes, envoyez vos devis et échangez avec vos clients"
      />

      {loading ? <LoadingSpinner /> : quotes.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Aucune demande reçue"
          description="Les demandes de devis de vos clients apparaîtront ici dès qu'un propriétaire vous contactera."
        />
      ) : (
        <div className="space-y-3">
          {quotes.map((q) => (
            <RequestCard
              key={q.id}
              quote={q}
              isExpanded={expandedId === q.id}
              onToggle={() => setExpandedId(expandedId === q.id ? null : q.id)}
              onRefresh={fetchQuotes}
            />
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}

/* ─── Individual Request Card ─── */
function RequestCard({ quote, isExpanded, onToggle, onRefresh }) {
  const q = quote;
  const sc = STATUS_CONFIG[q.status] || STATUS_CONFIG.pending;

  return (
    <Card className={`p-0 overflow-hidden transition-all ${q.status === 'pending' ? 'border-l-4 border-l-blue-500' : ''}`}>
      {/* ─── Header — always visible ─── */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition"
      >
        <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
          <User className="h-5 w-5 text-gray-500" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-gray-900 dark:text-white">
              {q.owner_name || q.owner_username || 'Client'}
            </span>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${sc.bg}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
              {sc.label}
            </span>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 truncate mt-0.5">
            {q.ad_title}
            {q.owner_region ? ` · ${q.owner_region}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="text-sm text-gray-500 hidden sm:block">{timeAgo(q.created_at)}</span>
          {q.quoted_price && (
            <span className="font-bold text-gray-900 dark:text-white">
              {Number(q.quoted_price).toLocaleString('fr-FR')} €
            </span>
          )}
          {isExpanded ? <ChevronUp className="h-4 w-4 text-gray-500" /> : <ChevronDown className="h-4 w-4 text-gray-500" />}
        </div>
      </button>

      {/* ─── Expanded detail ─── */}
      {isExpanded && (
        <div className="border-t border-gray-100 dark:border-gray-800">
          <RequestDetail quote={q} onRefresh={onRefresh} />
        </div>
      )}
    </Card>
  );
}

/* ─── Expanded Detail View ─── */
function RequestDetail({ quote, onRefresh }) {
  const q = quote;
  const { user } = useAuth();
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [quoteData, setQuoteData] = useState({
    quoted_price: q.quoted_price || '',
    provider_response: q.provider_response || '',
    timeframe_estimate: '',
  });
  const [sending, setSending] = useState(false);

  // Chat state
  const [messages, setMessages] = useState([]);
  const [chatMsg, setChatMsg] = useState('');
  const [sendingChat, setSendingChat] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [loadingChat, setLoadingChat] = useState(true);
  const chatEndRef = useRef(null);

  // Load conversation with this client
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

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendQuote = async () => {
    if (!quoteData.quoted_price) {
      toast.error('Veuillez indiquer un prix');
      return;
    }
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
    } catch {
      toast.error("Erreur lors de l'envoi");
    } finally { setSending(false); }
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
        const res = await messagingAPI.sendMessage({
          recipient_id: q.owner_id,
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

  const inputClass = 'w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-brand-300 focus:border-transparent outline-none';

  return (
    <div className="px-5 py-5 space-y-5">
      {/* ─── 1. Client request summary ─── */}
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

      {/* ─── 2. Action Panel ─── */}
      {q.status === 'pending' && (
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setShowQuoteForm(!showQuoteForm)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-black dark:bg-white text-white dark:text-black rounded-lg font-bold hover:bg-gray-800 dark:hover:bg-gray-200 transition"
          >
            <Euro className="h-4 w-4" /> Envoyer un devis
          </button>
          <button
            onClick={() => document.getElementById(`chat-input-${q.id}`)?.focus()}
            className="inline-flex items-center gap-2 px-5 py-2.5 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition"
          >
            <MessageSquare className="h-4 w-4" /> Répondre un message
          </button>
          <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 sm:ml-auto">
            <Info className="h-4 w-4" />
            <span>Essayez de répondre sous 24h</span>
          </div>
        </div>
      )}

      {/* Existing quote info for non-pending */}
      {q.status === 'counter_offer' && q.quoted_price && (
        <div className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <Euro className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
            <span className="font-semibold text-yellow-700 dark:text-yellow-300">
              Devis envoyé : {Number(q.quoted_price).toLocaleString('fr-FR')} €
            </span>
          </div>
          {q.provider_response && (
            <p className="text-yellow-600 dark:text-yellow-400 mt-1 whitespace-pre-line">{q.provider_response}</p>
          )}
          <p className="text-sm text-yellow-500 mt-2">En attente de la réponse du client</p>
        </div>
      )}

      {q.status === 'accepted' && (
        <div className="bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
            <span className="font-semibold text-green-700 dark:text-green-300">
              Devis accepté{q.quoted_price ? ` — ${Number(q.quoted_price).toLocaleString('fr-FR')} €` : ''}
            </span>
          </div>
        </div>
      )}

      {/* ─── 3. Quote Form (collapsible) ─── */}
      {showQuoteForm && q.status === 'pending' && (
        <div className="bg-brand-50/50 dark:bg-brand-900/10 border border-brand-200 dark:border-brand-800 rounded-lg p-5 space-y-4">
          <h4 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Euro className="h-4 w-4 text-brand-600" /> Envoyer votre devis
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">
                Prix ou fourchette de prix *
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  className={inputClass}
                  value={quoteData.quoted_price}
                  onChange={(e) => setQuoteData({ ...quoteData, quoted_price: e.target.value })}
                  placeholder="ex: 5000"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">€</span>
              </div>
            </div>
            <div>
              <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">
                Délai estimé
              </label>
              <input
                type="text"
                className={inputClass}
                value={quoteData.timeframe_estimate}
                onChange={(e) => setQuoteData({ ...quoteData, timeframe_estimate: e.target.value })}
                placeholder="ex: 2 à 3 semaines"
              />
            </div>
          </div>
          <div>
            <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">
              Commentaire / détails (optionnel)
            </label>
            <textarea
              rows={3}
              className={inputClass}
              value={quoteData.provider_response}
              onChange={(e) => setQuoteData({ ...quoteData, provider_response: e.target.value })}
              placeholder="Détails du devis, conditions, ce qui est inclus..."
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowQuoteForm(false)}
              className="px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg font-medium hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-900 dark:text-white transition"
            >
              Annuler
            </button>
            <button
              onClick={handleSendQuote}
              disabled={!quoteData.quoted_price || sending}
              className="px-5 py-2.5 bg-brand-600 text-white rounded-lg font-bold hover:bg-brand-700 transition disabled:opacity-50 flex items-center gap-2"
            >
              {sending ? 'Envoi...' : <><Send className="h-4 w-4" /> Envoyer le devis</>}
            </button>
          </div>
        </div>
      )}

      {/* ─── 4. Messages — full chat block ─── */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-gray-600 dark:text-gray-300" />
          <span className="font-semibold text-gray-900 dark:text-white">Messages</span>
          <span className="text-sm text-gray-500 dark:text-gray-400 ml-auto">
            avec {q.owner_name || q.owner_username || 'le client'}
          </span>
        </div>

        {/* Message list — tall container */}
        <div className="h-96 overflow-y-auto p-5 space-y-3 bg-white dark:bg-gray-900/50">
          {loadingChat ? (
            <p className="text-gray-500 text-center py-8">Chargement…</p>
          ) : messages.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              Aucun message pour l'instant. Envoyez un message au client ci-dessous.
            </p>
          ) : (
            messages.map((msg) => {
              const isMe = msg.sender !== q.owner_id && msg.sender_username !== q.owner_username;
              return (
                <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    isMe
                      ? 'bg-brand-600 text-white rounded-br-md'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-bl-md'
                  }`}>
                    <p className="whitespace-pre-line">{msg.content}</p>
                    <p className={`text-xs mt-1.5 ${isMe ? 'text-brand-200' : 'text-gray-500 dark:text-gray-400'}`}>
                      {new Date(msg.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Chat input */}
        <form onSubmit={handleSendChat} className="border-t border-gray-200 dark:border-gray-700 p-4 flex gap-3 bg-white dark:bg-gray-900">
          <input
            id={`chat-input-${q.id}`}
            type="text"
            className="flex-1 px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-full bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:ring-2 focus:ring-brand-300"
            value={chatMsg}
            onChange={(e) => setChatMsg(e.target.value)}
            placeholder="Écrire un message…"
          />
          <button
            type="submit"
            disabled={!chatMsg.trim() || sendingChat}
            className="px-5 py-3 bg-black dark:bg-white text-white dark:text-black rounded-full hover:bg-gray-800 dark:hover:bg-gray-200 transition disabled:opacity-50 flex-shrink-0"
          >
            <Send className="h-5 w-5" />
          </button>
        </form>
      </div>

      {/* ─── 5. Next Steps Hints ─── */}
      <div className="bg-gray-50 dark:bg-gray-800/30 rounded-lg p-4 space-y-2">
        <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Prochaines étapes</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm text-gray-600 dark:text-gray-400">
          <div className="flex items-start gap-2">
            <Send className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
            <span>Le client sera notifié dès l'envoi de votre devis.</span>
          </div>
          <div className="flex items-start gap-2">
            <CalendarCheck className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
            <span>Planifiez un rendez-vous une fois le devis accepté.</span>
          </div>
          <div className="flex items-start gap-2">
            <FileText className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
            <span>Partagez vos documents via les messages.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
