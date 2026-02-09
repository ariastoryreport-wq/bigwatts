import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { authAPI } from '../../services/api';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Card, LoadingSpinner, PageHeader } from '../../components/ui';
import { BarChart3, Eye, MessageSquare, Star, TrendingUp, Target, Users, FileText } from 'lucide-react';

export default function Analytics() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authAPI.getAnalytics()
      .then(({ data }) => setData(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <DashboardLayout><LoadingSpinner /></DashboardLayout>;
  if (!data) return <DashboardLayout><p className="text-muted">Données indisponibles.</p></DashboardLayout>;

  const MetricCard = ({ icon: Icon, label, value, sub, color = 'brand' }) => {
    const colors = {
      brand: 'bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-300',
      blue: 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300',
      amber: 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-300',
      green: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-300',
      purple: 'bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300',
    };
    return (
      <Card className="p-5">
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-xl ${colors[color]} flex items-center justify-center`}>
            <Icon className="h-6 w-6" />
          </div>
          <div>
            <p className="text-2xl font-bold text-black dark:text-white">{value}</p>
            <p className="text-sm text-muted">{label}</p>
            {sub && <p className="text-xs text-muted mt-0.5">{sub}</p>}
          </div>
        </div>
      </Card>
    );
  };

  // Simple bar chart using CSS
  const SimpleBar = ({ label, value, max }) => {
    const pct = max > 0 ? (value / max) * 100 : 0;
    return (
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted w-16 text-right">{label}</span>
        <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-full h-3">
          <div className="bg-brand-300 h-3 rounded-full transition-all" style={{ width: `${pct}%` }} />
        </div>
        <span className="text-sm font-medium text-black dark:text-white w-8">{value}</span>
      </div>
    );
  };

  return (
    <DashboardLayout>
      <PageHeader title="Analytics & Rapports" description="Suivez vos performances et statistiques" />

      {user?.role === 'prestataire' && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <MetricCard icon={Eye} label="Vues totales" value={data.total_views} color="blue" />
            <MetricCard icon={MessageSquare} label="Demandes reçues" value={data.total_quotes} color="brand" />
            <MetricCard icon={Target} label="Taux de conversion" value={`${data.conversion_rate}%`} color="green"
              sub={`${data.accepted_quotes} acceptées sur ${data.total_quotes}`} />
            <MetricCard icon={Star} label="Note moyenne" value={Number(data.average_rating).toFixed(1)} color="amber"
              sub={`${data.total_reviews} avis`} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Monthly quotes chart */}
            <Card className="p-6">
              <h3 className="heading-section mb-4 flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-brand-300" />
                Demandes par mois
              </h3>
              <div className="space-y-3">
                {(data.monthly_quotes || []).map((m, i) => (
                  <SimpleBar
                    key={i}
                    label={m.month}
                    value={m.count}
                    max={Math.max(...(data.monthly_quotes || []).map(x => x.count), 1)}
                  />
                ))}
              </div>
            </Card>

            {/* Rating distribution */}
            <Card className="p-6">
              <h3 className="heading-section mb-4 flex items-center gap-2">
                <Star className="h-5 w-5 text-brand-300" />
                Distribution des notes
              </h3>
              <div className="space-y-3">
                {[5, 4, 3, 2, 1].map((rating) => {
                  const entry = (data.rating_distribution || []).find(r => r.rating === rating);
                  return (
                    <SimpleBar
                      key={rating}
                      label={`${rating}★`}
                      value={entry?.count || 0}
                      max={data.total_reviews || 1}
                    />
                  );
                })}
              </div>
            </Card>

            {/* Top performing ads */}
            <Card className="p-6 lg:col-span-2">
              <h3 className="heading-section mb-4 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-brand-300" />
                Top annonces
              </h3>
              {(data.top_ads || []).length === 0 ? (
                <p className="text-muted">Aucune annonce active.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b divider">
                        <th className="text-left py-3 text-muted font-medium">Annonce</th>
                        <th className="text-right py-3 text-muted font-medium">Vues</th>
                        <th className="text-right py-3 text-muted font-medium">Demandes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.top_ads.map((ad) => (
                        <tr key={ad.id} className="border-b divider last:border-0">
                          <td className="py-3 font-medium text-black dark:text-white">{ad.title}</td>
                          <td className="py-3 text-right text-muted">{ad.views_count}</td>
                          <td className="py-3 text-right text-muted">{ad.inquiries_count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>
        </>
      )}

      {user?.role === 'proprietaire' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <MetricCard icon={FileText} label="Demandes envoyées" value={data.total_requests} color="brand" />
          <MetricCard icon={TrendingUp} label="Acceptées" value={data.accepted} color="green" />
          <MetricCard icon={Target} label="En attente" value={data.pending} color="amber" />
          <MetricCard icon={Star} label="Terminées" value={data.completed} color="purple" />
          <MetricCard icon={Users} label="Refusées" value={data.declined} color="blue" />
        </div>
      )}

      {user?.role === 'customer_service' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <MetricCard icon={Users} label="Utilisateurs" value={data.total_users} color="brand" />
          <MetricCard icon={Users} label="Prestataires" value={data.total_providers} color="blue"
            sub={`${data.verified_providers} vérifiés`} />
          <MetricCard icon={Users} label="Propriétaires" value={data.total_owners} color="green" />
          <MetricCard icon={FileText} label="Annonces" value={data.total_ads} color="amber"
            sub={`${data.active_ads} actives`} />
          <MetricCard icon={Star} label="Note moyenne" value={Number(data.avg_rating).toFixed(1)} color="purple" />
          <MetricCard icon={MessageSquare} label="Tickets ouverts" value={data.open_tickets} color="brand" />
        </div>
      )}
    </DashboardLayout>
  );
}
