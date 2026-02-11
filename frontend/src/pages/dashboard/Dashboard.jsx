import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { authAPI } from '../../services/api';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Card, LoadingSpinner } from '../../components/ui';
import {
  Megaphone, FileText, MessageSquare, Star, Heart, Users,
  LifeBuoy, TrendingUp, ClipboardList, Briefcase,
  PlusCircle, ArrowRight, AlertCircle, CheckCircle2,
} from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authAPI.getDashboard()
      .then(({ data }) => setStats(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  /* ─── Stat card ─── */
  const StatCard = ({ icon: Icon, label, value, color = 'primary', to }) => {
    const colors = {
      primary: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400',
      blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
      yellow: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400',
      red: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400',
      green: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400',
      purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
    };
    const content = (
      <Card className="p-5 hover:shadow-md transition group">
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

  /* ─── Quick action card for provider ─── */
  const QuickAction = ({ icon: Icon, label, description, to }) => (
    <Link to={to}>
      <Card className="p-5 hover:shadow-md transition group border-l-4 border-l-green-500">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 flex items-center justify-center">
            <Icon className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-black dark:text-white">{label}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
          </div>
          <ArrowRight className="h-4 w-4 text-gray-300 dark:text-gray-600 group-hover:text-green-500 transition" />
        </div>
      </Card>
    </Link>
  );

  /* ─── Provider dashboard ─── */
  const ProviderDashboard = () => {
    const pendingQuotes = stats?.pending_requests ?? 0;
    const unread = stats?.unread_messages ?? 0;
    const hasUrgent = pendingQuotes > 0 || unread > 0;

    return (
      <div className="space-y-8">
        {/* Urgent banner */}
        {hasUrgent && (
          <Card className="p-4 border-l-4 border-l-yellow-500 bg-yellow-50 dark:bg-yellow-900/10">
            <div className="flex items-center gap-3 flex-wrap">
              <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
              <span className="text-sm text-yellow-800 dark:text-yellow-200 font-medium">
                {pendingQuotes > 0 && <>{pendingQuotes} demande{pendingQuotes > 1 ? 's' : ''} de devis en attente</>}
                {pendingQuotes > 0 && unread > 0 && ' · '}
                {unread > 0 && <>{unread} message{unread > 1 ? 's' : ''} non lu{unread > 1 ? 's' : ''}</>}
              </span>
              <div className="flex gap-2 ml-auto">
                {pendingQuotes > 0 && (
                  <Link to="/dashboard/quotes/received" className="text-xs font-semibold text-yellow-700 dark:text-yellow-300 hover:underline">
                    Voir les demandes →
                  </Link>
                )}
              </div>
            </div>
          </Card>
        )}

        {/* KPI row */}
        <div>
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Performance</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={Megaphone} label="Annonces" value={stats?.total_ads} color="green" to="/dashboard/ads" />
            <StatCard icon={CheckCircle2} label="Actives" value={stats?.active_ads} color="green" />
            <StatCard icon={Star} label="Avis" value={stats?.total_reviews} color="purple" to="/dashboard/reviews" />
            <StatCard icon={Briefcase} label="Réservations" value={stats?.total_bookings} color="blue" to="/dashboard/bookings" />
          </div>
        </div>

        {/* Inbox row */}
        <div>
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Boîte de réception</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard icon={ClipboardList} label="Demandes reçues" value={stats?.total_quote_requests} color="blue" to="/dashboard/quotes/received" />
            <StatCard icon={FileText} label="En attente" value={stats?.pending_requests} color="yellow" to="/dashboard/quotes/received" />
            <StatCard icon={MessageSquare} label="Messages non lus" value={stats?.unread_messages} color="red" to="/dashboard/messages" />
          </div>
        </div>

        {/* Quick actions */}
        <div>
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Actions rapides</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <QuickAction icon={PlusCircle} label="Créer une annonce" description="Publiez un nouveau service" to="/dashboard/ads/new" />
            <QuickAction icon={FileText} label="Mon profil public" description="Modifier mes informations" to="/dashboard/profile" />
          </div>
        </div>
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-black dark:text-white">
          Bonjour {user?.first_name || user?.username} 👋
        </h1>
        <p className="text-gray-500 dark:text-gray-400">Voici un aperçu de votre activité</p>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : (
        <>
          {user?.role === 'prestataire' && <ProviderDashboard />}

          {user?.role === 'proprietaire' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              <StatCard icon={FileText} label="Mes demandes" value={stats?.total_requests} color="primary" to="/dashboard/quotes" />
              <StatCard icon={ClipboardList} label="En attente" value={stats?.pending_requests} color="yellow" />
              <StatCard icon={TrendingUp} label="Acceptées" value={stats?.accepted_requests} color="green" />
              <StatCard icon={Briefcase} label="Réservations" value={stats?.total_bookings} color="blue" to="/dashboard/bookings" />
              <StatCard icon={Heart} label="Favoris" value={stats?.total_favorites} color="red" to="/dashboard/favorites" />
              <StatCard icon={MessageSquare} label="Messages non lus" value={stats?.unread_messages} color="blue" to="/dashboard/messages" />
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
