import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { authAPI } from '../../services/api';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Card, LoadingSpinner } from '../../components/ui';
import { Megaphone, FileText, MessageSquare, Star, Heart, Users, TicketCheck, TrendingUp, ClipboardList } from 'lucide-react';

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

  const StatCard = ({ icon: Icon, label, value, color = 'primary', to }) => {
    const colors = {
      primary: 'bg-primary-100 text-primary-600',
      blue: 'bg-blue-100 text-blue-600',
      yellow: 'bg-yellow-100 text-yellow-600',
      red: 'bg-red-100 text-red-600',
      green: 'bg-green-100 text-green-600',
      purple: 'bg-purple-100 text-purple-600',
    };
    const content = (
      <Card className="p-5 hover:shadow-md transition">
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-xl ${colors[color]} flex items-center justify-center`}>
            <Icon className="h-6 w-6" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{value ?? '—'}</p>
            <p className="text-sm text-gray-500">{label}</p>
          </div>
        </div>
      </Card>
    );
    return to ? <Link to={to}>{content}</Link> : content;
  };

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Bonjour {user?.first_name || user?.username} 👋
        </h1>
        <p className="text-gray-500">Voici un aperçu de votre activité</p>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {user?.role === 'prestataire' && (
            <>
              <StatCard icon={Megaphone} label="Mes annonces" value={stats?.total_ads} color="primary" to="/dashboard/ads" />
              <StatCard icon={TrendingUp} label="Annonces actives" value={stats?.active_ads} color="green" />
              <StatCard icon={ClipboardList} label="Demandes reçues" value={stats?.total_quote_requests} color="blue" to="/dashboard/quotes/received" />
              <StatCard icon={FileText} label="En attente" value={stats?.pending_requests} color="yellow" to="/dashboard/quotes/received" />
              <StatCard icon={Star} label="Avis reçus" value={stats?.total_reviews} color="purple" to="/dashboard/reviews" />
              <StatCard icon={MessageSquare} label="Messages non lus" value={stats?.unread_messages} color="red" to="/dashboard/messages" />
            </>
          )}
          {user?.role === 'proprietaire' && (
            <>
              <StatCard icon={FileText} label="Mes demandes" value={stats?.total_requests} color="primary" to="/dashboard/quotes" />
              <StatCard icon={ClipboardList} label="En attente" value={stats?.pending_requests} color="yellow" />
              <StatCard icon={TrendingUp} label="Acceptées" value={stats?.accepted_requests} color="green" />
              <StatCard icon={Heart} label="Favoris" value={stats?.total_favorites} color="red" to="/dashboard/favorites" />
              <StatCard icon={MessageSquare} label="Messages non lus" value={stats?.unread_messages} color="blue" to="/dashboard/messages" />
            </>
          )}
          {user?.role === 'customer_service' && (
            <>
              <StatCard icon={Users} label="Utilisateurs" value={stats?.total_users} color="primary" to="/dashboard/cs/users" />
              <StatCard icon={Megaphone} label="Prestataires" value={stats?.total_prestataires} color="green" />
              <StatCard icon={Users} label="Propriétaires" value={stats?.total_proprietaires} color="blue" />
              <StatCard icon={TicketCheck} label="Tickets ouverts" value={stats?.open_tickets} color="red" to="/dashboard/cs/tickets" />
              <StatCard icon={ClipboardList} label="Tickets en cours" value={stats?.in_progress_tickets} color="yellow" />
              <StatCard icon={FileText} label="Mes tickets" value={stats?.my_tickets} color="purple" to="/dashboard/cs/tickets" />
            </>
          )}
        </div>
      )}
    </DashboardLayout>
  );
}
