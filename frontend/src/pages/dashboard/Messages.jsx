import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { messagingAPI } from '../../services/api';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Card, LoadingSpinner, EmptyState } from '../../components/ui';
import {
  MessageSquare, Send, ArrowLeft, CheckCheck, Check, Plus,
  Search, MoreVertical, Flag, Ban, X, Info
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const POLL_INTERVAL = 2000;
const HEARTBEAT_INTERVAL = 30000;

/* ──────────── helpers ──────────── */
function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return "à l'instant";
  if (diff < 3600) return `${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

function userDisplayName(u) {
  if (!u) return 'Utilisateur';
  if (u.first_name) return `${u.first_name} ${u.last_name || ''}`.trim();
  return u.username || 'Utilisateur';
}

function userInitial(u) {
  return (u?.first_name?.[0] || u?.username?.[0] || '?').toUpperCase();
}

/* ──────────── New Conversation Modal ──────────── */
function NewConversationModal({ onClose, onStarted }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [message, setMessage] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [sending, setSending] = useState(false);
  const debounceRef = useRef(null);

  const search = useCallback((q) => {
    if (q.length < 2) { setResults([]); return; }
    setSearching(true);
    messagingAPI.searchUsers(q)
      .then(({ data }) => setResults(data))
      .catch(() => {})
      .finally(() => setSearching(false));
  }, []);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(query), 300);
    return () => clearTimeout(debounceRef.current);
  }, [query, search]);

  const handleSend = async () => {
    if (!selectedUser || !message.trim()) return;
    setSending(true);
    try {
      const { data } = await messagingAPI.sendMessage({
        recipient_id: selectedUser.id,
        content: message.trim(),
      });
      toast.success('Message envoyé !');
      onStarted(data.conversation_id);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl max-w-md w-full shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
          <h3 className="font-semibold text-black dark:text-white">Nouvelle conversation</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4">
          {!selectedUser ? (
            <>
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  autoFocus
                  type="text"
                  placeholder="Rechercher un utilisateur..."
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-sm outline-none focus:ring-2 focus:ring-brand-300 text-black dark:text-white"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              <div className="max-h-64 overflow-y-auto space-y-1">
                {searching && <p className="text-xs text-gray-400 text-center py-2">Recherche...</p>}
                {!searching && query.length >= 2 && results.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-4">Aucun utilisateur trouvé</p>
                )}
                {results.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => setSelectedUser(u)}
                    className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition text-left"
                  >
                    <div className="relative">
                      <div className="w-10 h-10 rounded-full bg-brand-50 dark:bg-brand-900/30 flex items-center justify-center">
                        <span className="text-sm font-bold text-brand-600 dark:text-brand-300">{userInitial(u)}</span>
                      </div>
                      {u.is_online && (
                        <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-white dark:border-gray-900 rounded-full" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-black dark:text-white truncate">{userDisplayName(u)}</p>
                      <p className="text-xs text-gray-500 truncate">{u.role === 'prestataire' ? 'Prestataire' : 'Propriétaire'}{u.city ? ` · ${u.city}` : ''}</p>
                    </div>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-brand-50 dark:bg-brand-900/30 flex items-center justify-center">
                    <span className="text-sm font-bold text-brand-600 dark:text-brand-300">{userInitial(selectedUser)}</span>
                  </div>
                  {selectedUser.is_online && (
                    <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-white dark:border-gray-800 rounded-full" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-black dark:text-white">{userDisplayName(selectedUser)}</p>
                  <p className="text-xs text-gray-500">{selectedUser.role === 'prestataire' ? 'Prestataire' : 'Propriétaire'}</p>
                </div>
                <button onClick={() => setSelectedUser(null)} className="text-gray-400 hover:text-gray-600">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <textarea
                autoFocus
                rows={3}
                placeholder="Votre message..."
                className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-sm outline-none focus:ring-2 focus:ring-brand-300 resize-none text-black dark:text-white"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
              <button
                onClick={handleSend}
                disabled={sending || !message.trim()}
                className="mt-3 w-full py-2.5 bg-black dark:bg-white text-white dark:text-black rounded-lg text-sm font-medium hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-50 transition flex items-center justify-center gap-2"
              >
                <Send className="h-4 w-4" />
                {sending ? 'Envoi...' : 'Envoyer'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ──────────── Report Modal ──────────── */
function ReportModal({ user: targetUser, conversationId, onClose }) {
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!reason) return;
    setSubmitting(true);
    try {
      await messagingAPI.reportUser({
        user_id: targetUser.id,
        reason,
        details,
        conversation_id: conversationId,
      });
      toast.success('Signalement envoyé. Merci.');
      onClose();
    } catch {
      toast.error('Erreur lors du signalement');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl max-w-sm w-full shadow-2xl p-5">
        <h3 className="font-semibold text-black dark:text-white mb-3">Signaler {userDisplayName(targetUser)}</h3>
        <select
          className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm mb-3 bg-white dark:bg-gray-800 text-black dark:text-white outline-none"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        >
          <option value="">Raison du signalement...</option>
          <option value="spam">Spam</option>
          <option value="harassment">Harcèlement</option>
          <option value="fraud">Fraude</option>
          <option value="inappropriate">Contenu inapproprié</option>
          <option value="other">Autre</option>
        </select>
        <textarea
          rows={3}
          placeholder="Détails (optionnel)..."
          className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm mb-3 bg-white dark:bg-gray-800 text-black dark:text-white outline-none resize-none"
          value={details}
          onChange={(e) => setDetails(e.target.value)}
        />
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm hover:bg-gray-100 dark:hover:bg-gray-800 text-black dark:text-white">Annuler</button>
          <button
            onClick={handleSubmit}
            disabled={!reason || submitting}
            className="flex-1 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
          >
            {submitting ? 'Envoi...' : 'Signaler'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ──────────── MAIN COMPONENT ──────────── */
export default function Messages() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeConvId, setActiveConvId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [convDetail, setConvDetail] = useState(null);
  const [loadingConv, setLoadingConv] = useState(false);
  const [newMsg, setNewMsg] = useState('');
  const [sending, setSending] = useState(false);
  const [showNewConv, setShowNewConv] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [otherOnline, setOtherOnline] = useState(false);
  const [firstMsgBanner, setFirstMsgBanner] = useState(false);
  const [mobileShowChat, setMobileShowChat] = useState(false);

  const bottomRef = useRef(null);
  const lastMsgIdRef = useRef(0);
  const isActiveRef = useRef(true);
  const inputRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const isAtBottomRef = useRef(true);
  const menuRef = useRef(null);

  /* ── heartbeat ── */
  useEffect(() => {
    messagingAPI.heartbeat().catch(() => {});
    const hb = setInterval(() => {
      if (isActiveRef.current) messagingAPI.heartbeat().catch(() => {});
    }, HEARTBEAT_INTERVAL);
    return () => clearInterval(hb);
  }, []);

  /* ── visibility tracking ── */
  useEffect(() => {
    const handler = () => { isActiveRef.current = document.visibilityState === 'visible'; };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, []);

  /* ── outside click for menu ── */
  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  /* ── fetch conversation list ── */
  const fetchConversations = useCallback(() => {
    messagingAPI.getConversations()
      .then(({ data }) => setConversations(data.results || data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchConversations();
    const interval = setInterval(() => {
      if (isActiveRef.current) fetchConversations();
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchConversations]);

  /* ── handle ?to=&ad= from AdDetail "Contacter" AND ?conv= from redirect ── */
  useEffect(() => {
    const toId = searchParams.get('to');
    const adId = searchParams.get('ad');
    const convParam = searchParams.get('conv');

    if (convParam) {
      openConversation(Number(convParam));
      navigate('/dashboard/messages', { replace: true });
      return;
    }

    if (toId) {
      messagingAPI.sendMessage({
        recipient_id: Number(toId),
        ad_id: adId ? Number(adId) : undefined,
        content: '👋 Bonjour, je suis intéressé par votre service.',
      }).then(({ data }) => {
        if (data.is_first_message) setFirstMsgBanner(true);
        openConversation(data.conversation_id);
        navigate('/dashboard/messages', { replace: true });
        fetchConversations();
      }).catch((err) => {
        toast.error(err.response?.data?.error || 'Erreur');
        navigate('/dashboard/messages', { replace: true });
      });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── open a conversation ── */
  const openConversation = useCallback((id) => {
    if (id === activeConvId) return;
    setActiveConvId(id);
    setMessages([]);
    setLoadingConv(true);
    setFirstMsgBanner(false);
    setMobileShowChat(true);
    messagingAPI.getConversation(id)
      .then(({ data }) => {
        setConvDetail(data);
        const msgs = data.messages || [];
        setMessages(msgs);
        lastMsgIdRef.current = msgs.length > 0 ? msgs[msgs.length - 1].id : 0;
        isAtBottomRef.current = true;
        // Check if only 1 message and I sent it → first message banner
        if (msgs.length === 1 && msgs[0].sender === user.id) {
          setFirstMsgBanner(true);
        }
      })
      .catch(() => toast.error('Erreur de chargement'))
      .finally(() => setLoadingConv(false));
  }, [activeConvId, user?.id]);

  /* ── scroll helpers ── */
  const checkAtBottom = useCallback(() => {
    const el = messagesContainerRef.current;
    if (!el) return;
    isAtBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
  }, []);

  const scrollToBottom = useCallback((behavior = 'smooth') => {
    bottomRef.current?.scrollIntoView({ behavior });
  }, []);

  // Only scroll on initial load of a conversation (loadingConv transition)
  const prevLoadingConv = useRef(false);
  useEffect(() => {
    if (prevLoadingConv.current && !loadingConv && messages.length > 0) {
      // Just finished loading conversation — scroll to bottom
      scrollToBottom('auto');
    }
    prevLoadingConv.current = loadingConv;
  }, [loadingConv, messages.length, scrollToBottom]);

  /* ── notification sound ── */
  const playSound = useCallback(() => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.setValueAtTime(1047, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.3);
    } catch { /* silent */ }
  }, []);

  /* ── polling for active conversation ── */
  useEffect(() => {
    if (!activeConvId) return;
    const poll = () => {
      if (!isActiveRef.current) return;
      messagingAPI.pollMessages(activeConvId, lastMsgIdRef.current)
        .then(({ data }) => {
          // Update online status
          if (data.other_online !== undefined) setOtherOnline(data.other_online);

          // Update read receipts
          if (data.read_ids?.length) {
            setMessages(prev => prev.map(m =>
              data.read_ids.includes(m.id) ? { ...m, is_read: true } : m
            ));
          }

          if (data.has_new && data.messages.length > 0) {
            setMessages(prev => {
              const existingIds = new Set(prev.filter(m => !m._optimistic).map(m => m.id));
              const newMsgs = data.messages.filter(m => !existingIds.has(m.id));
              if (newMsgs.length === 0) return prev;
              const filtered = prev.filter(m => {
                if (!m._optimistic) return true;
                return !data.messages.some(nm => nm.sender === user.id && nm.content === m.content);
              });
              return [...filtered, ...newMsgs];
            });
            const lastNew = data.messages[data.messages.length - 1];
            lastMsgIdRef.current = Math.max(lastMsgIdRef.current, lastNew.id);
            if (data.messages.some(m => m.sender !== user.id)) {
              playSound();
              if (isAtBottomRef.current) setTimeout(() => scrollToBottom('smooth'), 50);
            }
          }
        })
        .catch(() => {});
    };
    const interval = setInterval(poll, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [activeConvId, user?.id, playSound]);

  /* ── send message ── */
  const sendMessage = async (e) => {
    e.preventDefault();
    const content = newMsg.trim();
    if (!content || !activeConvId) return;

    const optimisticMsg = {
      id: `opt-${Date.now()}`,
      sender: user.id,
      sender_name: `${user.first_name} ${user.last_name}`,
      sender_username: user.username,
      content,
      is_read: false,
      created_at: new Date().toISOString(),
      _optimistic: true,
    };

    setMessages(prev => [...prev, optimisticMsg]);
    setNewMsg('');
    setSending(true);
    setTimeout(() => scrollToBottom('smooth'), 50);

    try {
      const { data } = await messagingAPI.sendInConversation(activeConvId, { content });
      setMessages(prev => prev.map(m => (m.id === optimisticMsg.id ? { ...data, _optimistic: false } : m)));
      lastMsgIdRef.current = Math.max(lastMsgIdRef.current, data.id);
      fetchConversations();
    } catch {
      setMessages(prev => prev.map(m => (m.id === optimisticMsg.id ? { ...m, _failed: true } : m)));
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const retryMessage = async (msg) => {
    setMessages(prev => prev.map(m => (m.id === msg.id ? { ...m, _failed: false, _optimistic: true } : m)));
    try {
      const { data } = await messagingAPI.sendInConversation(activeConvId, { content: msg.content });
      setMessages(prev => prev.map(m => (m.id === msg.id ? { ...data, _optimistic: false } : m)));
      lastMsgIdRef.current = Math.max(lastMsgIdRef.current, data.id);
    } catch {
      setMessages(prev => prev.map(m => (m.id === msg.id ? { ...m, _failed: true, _optimistic: false } : m)));
    }
  };

  /* ── block user ── */
  const handleBlock = async () => {
    if (!other) return;
    if (!window.confirm(`Bloquer ${userDisplayName(other)} ? Vous ne recevrez plus ses messages.`)) return;
    try {
      await messagingAPI.blockUser(other.id);
      toast.success('Utilisateur bloqué');
      setActiveConvId(null);
      setConvDetail(null);
      setMessages([]);
      setShowMenu(false);
      setMobileShowChat(false);
      fetchConversations();
    } catch {
      toast.error('Erreur');
    }
  };

  const other = convDetail?.participants?.find(p => p.id !== user?.id);

  /* ──────────── RENDER ──────────── */
  return (
    <DashboardLayout>
      <div className="flex h-[calc(100vh-180px)] min-h-[500px] bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">

        {/* ═══════ SIDEBAR ═══════ */}
        <div className={`w-full md:w-80 lg:w-96 border-r border-gray-200 dark:border-gray-800 flex flex-col shrink-0 ${mobileShowChat ? 'hidden md:flex' : 'flex'}`}>
          {/* Sidebar header */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-black dark:text-white">Messages</h2>
            <button
              onClick={() => setShowNewConv(true)}
              className="p-2 bg-black dark:bg-white text-white dark:text-black rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 transition"
              title="Nouvelle conversation"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          {/* Conversation list */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex justify-center py-8"><LoadingSpinner /></div>
            ) : conversations.length === 0 ? (
              <div className="text-center py-12 px-4">
                <MessageSquare className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-600 mb-3" />
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Aucune conversation</p>
                <button
                  onClick={() => setShowNewConv(true)}
                  className="text-sm text-brand-600 dark:text-brand-400 hover:underline font-medium"
                >
                  Démarrer une conversation
                </button>
              </div>
            ) : (
              conversations.map((conv) => {
                const otherP = conv.participants?.find(p => p.id !== user.id);
                const lastMsg = conv.last_message;
                const isActive = conv.id === activeConvId;
                return (
                  <button
                    key={conv.id}
                    onClick={() => openConversation(conv.id)}
                    className={`w-full flex items-center gap-3 p-4 text-left transition border-b border-gray-100 dark:border-gray-800/50 ${
                      isActive
                        ? 'bg-brand-50 dark:bg-brand-900/20 border-l-2 border-l-brand-500'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-800/50 border-l-2 border-l-transparent'
                    }`}
                  >
                    <div className="relative shrink-0">
                      <div className="w-11 h-11 rounded-full bg-brand-50 dark:bg-brand-900/30 flex items-center justify-center">
                        <span className="text-sm font-bold text-brand-600 dark:text-brand-300">{userInitial(otherP)}</span>
                      </div>
                      {otherP?.is_online && (
                        <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-white dark:border-gray-900 rounded-full" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className={`text-sm truncate ${conv.unread_count > 0 ? 'font-semibold text-black dark:text-white' : 'font-medium text-gray-700 dark:text-gray-300'}`}>
                          {userDisplayName(otherP)}
                        </p>
                        {lastMsg && <span className="text-xs text-gray-400 shrink-0 ml-2">{timeAgo(lastMsg.created_at)}</span>}
                      </div>
                      {conv.ad_title && <p className="text-xs text-brand-600 dark:text-brand-400 truncate">Re: {conv.ad_title}</p>}
                      {lastMsg && (
                        <p className={`text-xs truncate mt-0.5 ${conv.unread_count > 0 ? 'text-gray-700 dark:text-gray-300 font-medium' : 'text-gray-500 dark:text-gray-400'}`}>
                          {lastMsg.sender === user.id ? 'Vous: ' : ''}{lastMsg.content}
                        </p>
                      )}
                    </div>
                    {conv.unread_count > 0 && (
                      <span className="bg-brand-500 text-white text-xs rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5 shrink-0">
                        {conv.unread_count}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ═══════ CHAT AREA ═══════ */}
        <div className={`flex-1 flex flex-col min-w-0 ${!mobileShowChat ? 'hidden md:flex' : 'flex'}`}>
          {!activeConvId ? (
            /* Empty state */
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageSquare className="mx-auto h-14 w-14 text-gray-200 dark:text-gray-700 mb-4" />
                <p className="text-gray-500 dark:text-gray-400 mb-1 font-medium">Sélectionnez une conversation</p>
                <p className="text-sm text-gray-400 dark:text-gray-500">ou démarrez-en une nouvelle</p>
                <button
                  onClick={() => setShowNewConv(true)}
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg text-sm font-medium hover:bg-gray-800 dark:hover:bg-gray-200 transition"
                >
                  <Plus className="h-4 w-4" />
                  Nouvelle conversation
                </button>
              </div>
            </div>
          ) : loadingConv ? (
            <div className="flex-1 flex items-center justify-center"><LoadingSpinner /></div>
          ) : (
            <>
              {/* Chat header */}
              <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center gap-3">
                <button
                  onClick={() => { setMobileShowChat(false); }}
                  className="md:hidden text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-brand-50 dark:bg-brand-900/30 flex items-center justify-center">
                    <span className="text-sm font-bold text-brand-600 dark:text-brand-300">{userInitial(other)}</span>
                  </div>
                  {otherOnline && (
                    <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-white dark:border-gray-900 rounded-full" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-black dark:text-white truncate">{userDisplayName(other)}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {otherOnline ? (
                      <span className="text-emerald-600 dark:text-emerald-400">En ligne</span>
                    ) : (
                      'Hors ligne'
                    )}
                    {convDetail?.ad_title && <span className="ml-2">· Re: {convDetail.ad_title}</span>}
                  </p>
                </div>

                {/* More menu */}
                <div className="relative" ref={menuRef}>
                  <button
                    onClick={() => setShowMenu(!showMenu)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition"
                  >
                    <MoreVertical className="h-5 w-5 text-gray-500" />
                  </button>
                  {showMenu && (
                    <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-10">
                      <button
                        onClick={() => { setShowReport(true); setShowMenu(false); }}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        <Flag className="h-4 w-4" /> Signaler
                      </button>
                      <button
                        onClick={handleBlock}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        <Ban className="h-4 w-4" /> Bloquer
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* First message banner */}
              {firstMsgBanner && (
                <div className="mx-4 mt-3 p-3 bg-brand-50 dark:bg-brand-900/20 rounded-lg border border-brand-200 dark:border-brand-800 flex items-start gap-3">
                  <Info className="h-5 w-5 text-brand-600 dark:text-brand-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-brand-800 dark:text-brand-200">Message envoyé !</p>
                    <p className="text-xs text-brand-600 dark:text-brand-400 mt-0.5">
                      {userDisplayName(other)} recevra une notification et vous répondra sous peu.
                    </p>
                  </div>
                  <button onClick={() => setFirstMsgBanner(false)} className="text-brand-400 hover:text-brand-600 shrink-0">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              {/* Messages */}
              <div
                ref={messagesContainerRef}
                onScroll={checkAtBottom}
                className="flex-1 overflow-y-auto px-4 py-3 space-y-2"
              >
                {messages.length === 0 && (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-gray-400 dark:text-gray-500 text-sm">Envoyez un message pour commencer</p>
                  </div>
                )}

                {/* Date separator for first message */}
                {messages.length > 0 && (
                  <div className="text-center py-2">
                    <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full">
                      {new Date(messages[0].created_at).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </span>
                  </div>
                )}

                {messages.map((msg, idx) => {
                  const isMine = msg.sender === user.id;
                  // Show date separator between days
                  const prevMsg = idx > 0 ? messages[idx - 1] : null;
                  const showDateSep = prevMsg && new Date(msg.created_at).toDateString() !== new Date(prevMsg.created_at).toDateString();

                  return (
                    <div key={msg.id}>
                      {showDateSep && (
                        <div className="text-center py-2">
                          <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full">
                            {new Date(msg.created_at).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                          </span>
                        </div>
                      )}
                      <div className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl ${
                          isMine
                            ? 'bg-black dark:bg-white text-white dark:text-black rounded-br-md'
                            : 'bg-gray-100 dark:bg-gray-800 text-black dark:text-white rounded-bl-md'
                        } ${msg._optimistic ? 'opacity-70' : ''} ${msg._failed ? 'opacity-50' : ''}`}>
                          <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                          <div className={`flex items-center gap-1 mt-1 ${isMine ? 'justify-end' : ''}`}>
                            <span className={`text-[10px] ${isMine ? 'text-gray-300 dark:text-gray-500' : 'text-gray-400'}`}>
                              {new Date(msg.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {isMine && !msg._optimistic && !msg._failed && (
                              msg.is_read
                                ? <CheckCheck className="h-3 w-3 text-blue-400" />
                                : <Check className="h-3 w-3 text-gray-400" />
                            )}
                            {msg._optimistic && !msg._failed && (
                              <span className="text-[10px] text-gray-400">Envoi...</span>
                            )}
                            {msg._failed && (
                              <button onClick={() => retryMessage(msg)} className="text-[10px] text-red-400 hover:text-red-300 underline ml-1">
                                Renvoyer
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <form onSubmit={sendMessage} className="p-4 border-t border-gray-200 dark:border-gray-800 flex gap-3">
                <input
                  ref={inputRef}
                  type="text"
                  className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-full focus:ring-2 focus:ring-brand-300 outline-none bg-gray-50 dark:bg-gray-800 text-black dark:text-white text-sm"
                  placeholder="Votre message..."
                  value={newMsg}
                  onChange={(e) => setNewMsg(e.target.value)}
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={sending || !newMsg.trim()}
                  className="bg-black dark:bg-white text-white dark:text-black p-3 rounded-full hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-50 transition"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </>
          )}
        </div>
      </div>

      {/* Modals */}
      {showNewConv && (
        <NewConversationModal
          onClose={() => setShowNewConv(false)}
          onStarted={(convId) => {
            setShowNewConv(false);
            openConversation(convId);
            fetchConversations();
          }}
        />
      )}
      {showReport && other && (
        <ReportModal
          user={other}
          conversationId={activeConvId}
          onClose={() => setShowReport(false)}
        />
      )}
    </DashboardLayout>
  );
}
