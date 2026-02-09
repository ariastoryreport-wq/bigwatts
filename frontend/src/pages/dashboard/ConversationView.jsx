import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { messagingAPI } from '../../services/api';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Card, LoadingSpinner } from '../../components/ui';
import { Send, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function ConversationView() {
  const { id } = useParams();
  const { user } = useAuth();
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  const fetchConversation = () => {
    messagingAPI.getConversation(id)
      .then(({ data }) => {
        setConversation(data);
        setMessages(data.messages || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchConversation(); }, [id]);
  // Poll for new messages every 5 seconds for real-time chat feel
  useEffect(() => {
    if (!id) return;
    const interval = setInterval(() => {
      messagingAPI.getConversation(id)
        .then(({ data }) => {
          const newMsgs = data.messages || [];
          if (newMsgs.length !== messages.length) {
            setConversation(data);
            setMessages(newMsgs);
          }
        })
        .catch(() => {});
    }, 5000);
    return () => clearInterval(interval);
  }, [id, messages.length]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMsg.trim()) return;
    setSending(true);
    try {
      await messagingAPI.sendInConversation(id, { content: newMsg });
      setNewMsg('');
      fetchConversation();
    } catch {} finally {
      setSending(false);
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
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((msg) => {
            const isMine = msg.sender === user.id;
            return (
              <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl ${
                  isMine
                    ? 'bg-black dark:bg-white text-white dark:text-black rounded-br-md'
                    : 'bg-gray-100 dark:bg-gray-800 text-black dark:text-white rounded-bl-md'
                }`}>
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  <p className={`text-xs mt-1 ${isMine ? 'text-gray-300 dark:text-gray-600' : 'text-gray-400'}`}>
                    {new Date(msg.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <form onSubmit={sendMessage} className="p-4 border-t flex gap-3">
          <input
            type="text"
            className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-gray-800 rounded-full focus:ring-2 focus:ring-brand-300 outline-none bg-gray-100 dark:bg-gray-800 text-black dark:text-white"
            placeholder="Votre message..."
            value={newMsg}
            onChange={(e) => setNewMsg(e.target.value)}
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
