import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { authAPI } from '../../services/api';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Card, LoadingSpinner } from '../../components/ui';
import {
  Megaphone, FileText, MessageSquare, Star, Heart, Users,
  LifeBuoy, TrendingUp, ClipboardList, Briefcase,
  PlusCircle, ArrowRight, AlertCircle, CheckCircle2, Euro,
} from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authAPI.getDashboard()
      .then(({ data }) => setStats(data))
      .catch(() => {})
      .finally(() => setLoading(false));
    if (user?.role === 'prestataire') {
      authAPI.getAnalytics()
        .then(({ data }) => setAnalytics(data))
        .catch(() => {});
    }
  }, []);

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

  /* ─── Quick action card for provider ─── */
  const QuickAction = ({ icon: Icon, label, description, to }) => (
    <Link to={to}>
      <Card className="p-5 transition group border-l-4 border-l-green-500">
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

        {/* Performance KPI + Revenue graph side-by-side */}
        <div>
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Performance</h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* KPI cards - left 2/3 */}
            <div className="lg:col-span-2 grid grid-cols-2 gap-4">
              <StatCard icon={Megaphone} label="Annonces" value={stats?.total_ads} color="green" to="/dashboard/ads" />
              <StatCard icon={CheckCircle2} label="Actives" value={stats?.active_ads} color="green" />
              <StatCard icon={Star} label="Avis" value={stats?.total_reviews} color="purple" to="/dashboard/reviews" />
              <StatCard icon={Briefcase} label="Réservations" value={stats?.total_bookings} color="blue" to="/dashboard/bookings" />
            </div>
            {/* Revenue graph - right 1/3 */}
            {analytics?.monthly_revenue && (
              <Card className="p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 flex items-center justify-center">
                    <Euro className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-black dark:text-white">
                      {(analytics.total_revenue || 0).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Revenus totaux</p>
                  </div>
                </div>
                {(() => {
                  const data = analytics.monthly_revenue;
                  const maxVal = Math.max(...data.map(d => d.amount), 1);
                  return (
                    <div className="flex items-end gap-1.5 h-28">
                      {data.map((item, i) => (
                        <div key={i} className="flex-1 flex flex-col items-center gap-0.5 h-full justify-end">
                          <span className="text-[10px] font-medium text-gray-600 dark:text-gray-300">
                            {item.amount > 0 ? `${Math.round(item.amount)}€` : ''}
                          </span>
                          <div
                            className="w-full rounded-t-md bg-gradient-to-t from-green-500 to-green-400 dark:from-green-600 dark:to-green-500 min-h-[4px] transition-all"
                            style={{ height: `${Math.max((item.amount / maxVal) * 100, 3)}%` }}
                          />
                          <span className="text-[9px] text-gray-400 dark:text-gray-500 truncate w-full text-center">{item.month}</span>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </Card>
            )}
          </div>
        </div>

        {/* Inbox row — messages only */}
        <div>
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Boîte de réception</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
          Bonjour {user?.first_name || user?.username}
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
