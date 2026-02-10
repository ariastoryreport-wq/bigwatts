import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { messagingAPI } from '../../services/api';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Card, PageHeader, LoadingSpinner, EmptyState } from '../../components/ui';
import { MessageSquare } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function Messages() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const isActiveRef = useRef(true);

  const fetchConversations = () => {
    messagingAPI.getConversations()
      .then(({ data }) => setConversations(data.results || data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchConversations();
    // Poll every 5 seconds to show new conversations / unread counts
    const interval = setInterval(() => {
      if (isActiveRef.current) fetchConversations();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Pause polling when tab hidden
  useEffect(() => {
    const handler = () => { isActiveRef.current = document.visibilityState === 'visible'; };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, []);

  return (
    <DashboardLayout>
      <PageHeader title="Messages" description="Vos conversations" />

      {loading ? <LoadingSpinner /> : conversations.length === 0 ? (
        <EmptyState icon={MessageSquare} title="Aucun message" description="Vos conversations apparaîtront ici." />
      ) : (
        <div className="space-y-2">
          {conversations.map((conv) => {
            const other = conv.participants?.find(p => p.id !== user.id);
            const lastMsg = conv.last_message;
            return (
              <Link key={conv.id} to={`/dashboard/messages/${conv.id}`}>
                <Card className={`p-4 hover:shadow-md transition ${conv.unread_count > 0 ? 'border-brand-200 dark:border-brand-800 bg-brand-50/50 dark:bg-brand-900/20' : ''}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-brand-50 dark:bg-brand-900/30 flex items-center justify-center shrink-0">
                        <span className="text-sm font-bold text-brand-600 dark:text-brand-300">
                          {(other?.first_name?.[0] || other?.username?.[0] || '?').toUpperCase()}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-black dark:text-white truncate">
                          {other?.first_name ? `${other.first_name} ${other.last_name}` : other?.username || 'Utilisateur'}
                        </p>
                        {conv.ad_title && <p className="text-xs text-brand-600 dark:text-brand-300 truncate">Re: {conv.ad_title}</p>}
                        {lastMsg && <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{lastMsg.content}</p>}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0 ml-3">
                      {lastMsg && <span className="text-xs text-gray-400">{new Date(lastMsg.created_at).toLocaleDateString('fr-FR')}</span>}
                      {conv.unread_count > 0 && (
                        <span className="bg-black dark:bg-white text-white dark:text-black text-xs rounded-full w-5 h-5 flex items-center justify-center">
                          {conv.unread_count}
                        </span>
                      )}
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
}
