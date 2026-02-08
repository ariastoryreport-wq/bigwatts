import { useState, useEffect } from 'react';
import { notificationsAPI } from '../../services/api';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { PageHeader, LoadingSpinner, EmptyState } from '../../components/ui';
import { Bell, Check, MessageSquare, Star, FileText, AlertCircle, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ICONS = {
  new_message: MessageSquare,
  new_review: Star,
  quote_request: FileText,
  quote_response: FileText,
  ticket_update: AlertCircle,
  system: Settings,
};

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    notificationsAPI.getNotifications()
      .then(({ data }) => setNotifications(data.results || data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const markRead = async (id) => {
    await notificationsAPI.markSingleRead(id);
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n));
  };

  const markAllRead = async () => {
    await notificationsAPI.markAllRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  const handleClick = (n) => {
    if (!n.is_read) markRead(n.id);
    if (n.link) navigate(n.link);
  };

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-6">
        <PageHeader title="Notifications" description="Restez informé de l'activité sur votre compte" />
        {notifications.some((n) => !n.is_read) && (
          <button onClick={markAllRead} className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 font-medium">
            <Check size={16} /> Tout marquer lu
          </button>
        )}
      </div>

      {loading ? <LoadingSpinner /> : notifications.length === 0 ? (
        <EmptyState icon={Bell} title="Aucune notification" description="Vos notifications apparaîtront ici." />
      ) : (
        <div className="divide-y rounded-xl bg-white shadow-sm border">
          {notifications.map((n) => {
            const Icon = ICONS[n.type] || Bell;
            return (
              <div
                key={n.id}
                onClick={() => handleClick(n)}
                className={`flex items-start gap-4 px-5 py-4 cursor-pointer hover:bg-gray-50 transition ${!n.is_read ? 'bg-primary-50/40' : ''}`}
              >
                <div className={`p-2 rounded-full flex-shrink-0 ${!n.is_read ? 'bg-primary-100 text-primary-600' : 'bg-gray-100 text-gray-400'}`}>
                  <Icon size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${!n.is_read ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>{n.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5 truncate">{n.message}</p>
                </div>
                <span className="text-xs text-gray-400 flex-shrink-0">{new Date(n.created_at).toLocaleDateString('fr-FR')}</span>
                {!n.is_read && <span className="w-2.5 h-2.5 rounded-full bg-primary-500 flex-shrink-0 mt-1.5" />}
              </div>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
}
