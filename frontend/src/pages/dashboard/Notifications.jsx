import { useState, useEffect } from 'react';
import { notificationsAPI } from '../../services/api';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { PageHeader, LoadingSpinner, EmptyState } from '../../components/ui';
import { Bell, Check, MessageSquare, Star, FileText, AlertCircle, Settings, Heart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const ICONS = {
  new_message: MessageSquare,
  new_review: Star,
  quote_request: FileText,
  quote_response: FileText,
  ticket_update: AlertCircle,
  system: Settings,
  favorite: Heart,
};

// Map notification links to the closest valid route for the current user role
function resolveLink(notification, userRole) {
  const link = notification.link || '';
  const type = notification.notification_type;

  // If the link is a valid dashboard route, use it
  // Messages links are always valid
  if (link.startsWith('/dashboard/messages/')) return link;

  // Quote links: proprietaire → /dashboard/quotes, prestataire → /dashboard/quotes/received
  if (link.startsWith('/dashboard/quotes/') || type === 'quote_request' || type === 'quote_response') {
    if (userRole === 'proprietaire') return '/dashboard/quotes';
    if (userRole === 'prestataire') return '/dashboard/quotes/received';
    return link;
  }

  // Review links → prestataire reviews
  if (type === 'new_review') return '/dashboard/reviews';

  // Favorite links
  if (type === 'favorite') return '/dashboard';

  // Ticket links
  if (type === 'ticket_update') {
    if (userRole === 'customer_service') return '/dashboard/cs/tickets';
    return '/dashboard/tickets';
  }

  // System notifications
  if (link) return link;
  return '/dashboard';
}

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { user } = useAuth();

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
    await notificationsAPI.markRead([]);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  const handleClick = (n) => {
    if (!n.is_read) markRead(n.id);
    const dest = resolveLink(n, user?.role);
    if (dest) navigate(dest);
  };

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-6">
        <PageHeader title="Notifications" description="Restez informé de l'activité sur votre compte" />
        {notifications.some((n) => !n.is_read) && (
          <button onClick={markAllRead} className="flex items-center gap-1 text-sm text-brand-600 dark:text-brand-300 hover:text-brand-500 dark:hover:text-brand-200 font-medium">
            <Check size={16} /> Tout marquer lu
          </button>
        )}
      </div>

      {loading ? <LoadingSpinner /> : notifications.length === 0 ? (
        <EmptyState icon={Bell} title="Aucune notification" description="Vos notifications apparaîtront ici." />
      ) : (
        <div className="divide-y divide-gray-200 dark:divide-gray-800 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
          {notifications.map((n) => {
            const Icon = ICONS[n.notification_type] || Bell;
            return (
              <div
                key={n.id}
                onClick={() => handleClick(n)}
                className={`flex items-start gap-4 px-5 py-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition ${!n.is_read ? 'bg-brand-50/50 dark:bg-brand-900/20' : ''}`}
              >
                <div className={`p-2 rounded-full flex-shrink-0 ${!n.is_read ? 'bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-300' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'}`}>
                  <Icon size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${!n.is_read ? 'font-semibold text-black dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>{n.title}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{n.message}</p>
                </div>
                <span className="text-xs text-gray-400 flex-shrink-0">{new Date(n.created_at).toLocaleDateString('fr-FR')}</span>
                {!n.is_read && <span className="w-2.5 h-2.5 rounded-full bg-brand-300 flex-shrink-0 mt-1.5" />}
              </div>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
}
