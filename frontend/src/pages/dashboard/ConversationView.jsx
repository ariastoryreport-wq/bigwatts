import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { messagingAPI } from '../../services/api';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Card, LoadingSpinner } from '../../components/ui';
import { Send, ArrowLeft, CheckCheck, Check } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const POLL_INTERVAL = 2000; // 2 seconds

export default function ConversationView() {
  const { id } = useParams();
  const { user } = useAuth();
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);
  const lastMsgIdRef = useRef(0);
  const isActiveRef = useRef(true);
  const inputRef = useRef(null);

  // Track whether the user has scrolled to bottom (auto-scroll only if at bottom)
  const messagesContainerRef = useRef(null);
  const isAtBottomRef = useRef(true);

  const checkAtBottom = useCallback(() => {
    const el = messagesContainerRef.current;
    if (!el) return;
    isAtBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
  }, []);

  const scrollToBottom = useCallback((behavior = 'smooth') => {
    if (isAtBottomRef.current) {
      bottomRef.current?.scrollIntoView({ behavior });
    }
  }, []);

  // Play a subtle notification sound for incoming messages
  const playNotificationSound = useCallback(() => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.setValueAtTime(1047, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
    } catch {
      // Audio not available, silently ignore
    }
  }, []);

  // Initial fetch — get full conversation
  useEffect(() => {
    setLoading(true);
    messagingAPI.getConversation(id)
      .then(({ data }) => {
        setConversation(data);
        const msgs = data.messages || [];
        setMessages(msgs);
        lastMsgIdRef.current = msgs.length > 0 ? msgs[msgs.length - 1].id : 0;
        isAtBottomRef.current = true; // scroll to bottom on initial load
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  // Scroll to bottom on initial load and when messages change
  useEffect(() => {
    scrollToBottom(messages.length <= 20 ? 'auto' : 'smooth');
  }, [messages, scrollToBottom]);

  // Smart polling — only fetch new messages since last known ID
  useEffect(() => {
    if (!id) return;

    const poll = () => {
      if (!isActiveRef.current) return;

      messagingAPI.pollMessages(id, lastMsgIdRef.current)
        .then(({ data }) => {
          if (data.has_new && data.messages.length > 0) {
            setMessages(prev => {
              // Merge new messages, avoiding duplicates and replacing optimistic ones
              const existingIds = new Set(prev.filter(m => !m._optimistic).map(m => m.id));
              const newMsgs = data.messages.filter(m => !existingIds.has(m.id));

              if (newMsgs.length === 0) return prev;

              // Remove optimistic messages that now have real counterparts
              const filtered = prev.filter(m => {
                if (!m._optimistic) return true;
                // Check if the real message arrived for this optimistic one
                return !data.messages.some(
                  nm => nm.sender === user.id && nm.content === m.content
                );
              });

              return [...filtered, ...newMsgs];
            });

            // Update last known message ID
            const lastNew = data.messages[data.messages.length - 1];
            lastMsgIdRef.current = Math.max(lastMsgIdRef.current, lastNew.id);

            // Play sound for incoming messages (not from self)
            const hasIncoming = data.messages.some(m => m.sender !== user.id);
            if (hasIncoming) {
              playNotificationSound();
            }
          }
        })
        .catch(() => {});
    };

    const interval = setInterval(poll, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [id, user.id, playNotificationSound]);

  // Pause polling when tab not visible
  useEffect(() => {
    const handleVisibility = () => {
      isActiveRef.current = document.visibilityState === 'visible';
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  // Send message with optimistic UI
  const sendMessage = async (e) => {
    e.preventDefault();
    const content = newMsg.trim();
    if (!content) return;

    // Optimistic: add message immediately
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
    isAtBottomRef.current = true;
    setSending(true);

    try {
      const { data } = await messagingAPI.sendInConversation(id, { content });
      // Replace optimistic message with real one
      setMessages(prev =>
        prev.map(m => (m.id === optimisticMsg.id ? { ...data, _optimistic: false } : m))
      );
      lastMsgIdRef.current = Math.max(lastMsgIdRef.current, data.id);
    } catch {
      // Mark optimistic message as failed
      setMessages(prev =>
        prev.map(m => (m.id === optimisticMsg.id ? { ...m, _failed: true } : m))
      );
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  // Retry a failed message
  const retryMessage = async (msg) => {
    setMessages(prev => prev.map(m => (m.id === msg.id ? { ...m, _failed: false, _optimistic: true } : m)));
    try {
      const { data } = await messagingAPI.sendInConversation(id, { content: msg.content });
      setMessages(prev =>
        prev.map(m => (m.id === msg.id ? { ...data, _optimistic: false } : m))
      );
      lastMsgIdRef.current = Math.max(lastMsgIdRef.current, data.id);
    } catch {
      setMessages(prev => prev.map(m => (m.id === msg.id ? { ...m, _failed: true, _optimistic: false } : m)));
    }
  };

  if (loading) return <DashboardLayout><LoadingSpinner /></DashboardLayout>;

  const other = conversation?.participants?.find(p => p.id !== user.id);

  return (
    <DashboardLayout>
      <Card className="flex flex-col h-[calc(100vh-220px)] min-h-[500px]">
        {/* Header */}
        <div className="p-4 border-b flex items-center gap-3">
          <Link to="/dashboard/messages" className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="w-8 h-8 rounded-full bg-brand-50 dark:bg-brand-900/30 flex items-center justify-center">
            <span className="text-sm font-bold text-brand-600 dark:text-brand-300">
              {(other?.first_name?.[0] || '?').toUpperCase()}
            </span>
          </div>
          <div>
            <p className="font-medium text-black dark:text-white">
              {other?.first_name ? `${other.first_name} ${other.last_name}` : other?.username}
            </p>
            {conversation?.ad_title && <p className="text-xs text-gray-500 dark:text-gray-400">Re: {conversation.ad_title}</p>}
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs text-gray-400">En direct</span>
          </div>
        </div>

        {/* Messages */}
        <div
          ref={messagesContainerRef}
          onScroll={checkAtBottom}
          className="flex-1 overflow-y-auto p-4 space-y-3"
        >
          {messages.length === 0 && (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-400 dark:text-gray-500 text-sm">
                Envoyez un message pour commencer la conversation
              </p>
            </div>
          )}
          {messages.map((msg) => {
            const isMine = msg.sender === user.id;
            return (
              <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl ${
                  isMine
                    ? 'bg-black dark:bg-white text-white dark:text-black rounded-br-md'
                    : 'bg-gray-100 dark:bg-gray-800 text-black dark:text-white rounded-bl-md'
                } ${msg._optimistic ? 'opacity-70' : ''} ${msg._failed ? 'opacity-50' : ''}`}>
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  <div className={`flex items-center gap-1 mt-1 ${isMine ? 'justify-end' : ''}`}>
                    <span className={`text-xs ${isMine ? 'text-gray-300 dark:text-gray-600' : 'text-gray-400'}`}>
                      {new Date(msg.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {isMine && !msg._optimistic && !msg._failed && (
                      msg.is_read
                        ? <CheckCheck className="h-3 w-3 text-blue-400" />
                        : <Check className="h-3 w-3 text-gray-400" />
                    )}
                    {msg._optimistic && !msg._failed && (
                      <span className="text-xs text-gray-400">Envoi...</span>
                    )}
                    {msg._failed && (
                      <button
                        onClick={() => retryMessage(msg)}
                        className="text-xs text-red-400 hover:text-red-300 underline ml-1"
                      >
                        Renvoyer
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <form onSubmit={sendMessage} className="p-4 border-t flex gap-3">
          <input
            ref={inputRef}
            type="text"
            className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-gray-800 rounded-full focus:ring-2 focus:ring-brand-300 outline-none bg-gray-100 dark:bg-gray-800 text-black dark:text-white"
            placeholder="Votre message..."
            value={newMsg}
            onChange={(e) => setNewMsg(e.target.value)}
            autoFocus
          />
          <button
            type="submit" disabled={sending || !newMsg.trim()}
            className="bg-black dark:bg-white text-white dark:text-black p-3 rounded-full hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-50 transition"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </Card>
    </DashboardLayout>
  );
}
