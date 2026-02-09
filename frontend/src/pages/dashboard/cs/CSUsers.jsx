import { useState, useEffect } from 'react';
import { authAPI } from '../../../services/api';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import { PageHeader, LoadingSpinner, EmptyState, Badge } from '../../../components/ui';
import { Users, Search, Shield, CheckCircle, XCircle } from 'lucide-react';

const ROLE_LABELS = { prestataire: 'Prestataire', proprietaire: 'Propriétaire', customer_service: 'Support' };

export default function CSUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = (params = {}) => {
    setLoading(true);
    authAPI.csGetUsers(params)
      .then(({ data }) => setUsers(data.results || data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  const filtered = users.filter((u) => {
    const matchSearch = !search || u.username.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.first_name + ' ' + u.last_name).toLowerCase().includes(search.toLowerCase());
    const matchRole = !roleFilter || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  return (
    <DashboardLayout>
      <PageHeader title="Gestion des utilisateurs" description="Consultez et gérez les comptes utilisateurs" />

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-gray-800 rounded-lg text-sm focus:ring-2 focus:ring-brand-300 outline-none"
            placeholder="Rechercher un utilisateur..."
            value={search} onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="px-4 py-2.5 border border-gray-200 dark:border-gray-800 rounded-lg text-sm focus:ring-2 focus:ring-brand-300 outline-none"
          value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}
        >
          <option value="">Tous les rôles</option>
          <option value="prestataire">Prestataire</option>
          <option value="proprietaire">Propriétaire</option>
          <option value="customer_service">Support</option>
        </select>
      </div>

      {loading ? <LoadingSpinner /> : filtered.length === 0 ? (
        <EmptyState icon={Users} title="Aucun utilisateur trouvé" />
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
              <thead className="bg-gray-100 dark:bg-gray-800">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Utilisateur</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Email</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Rôle</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Ville</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Vérifié</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Inscrit le</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {filtered.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-100 dark:hover:bg-gray-800">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-brand-50 dark:bg-brand-900/30 flex items-center justify-center text-brand-600 dark:text-brand-300 text-sm font-bold">
                          {(u.first_name?.[0] || u.username[0]).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-black dark:text-white">{u.first_name} {u.last_name}</p>
                          <p className="text-xs text-gray-400">@{u.username}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-600 dark:text-gray-400">{u.email}</td>
                    <td className="px-5 py-3">
                      <Badge variant={u.role === 'prestataire' ? 'primary' : u.role === 'customer_service' ? 'warning' : 'default'}>
                        {ROLE_LABELS[u.role] || u.role}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-600 dark:text-gray-400">{u.city || '–'}</td>
                    <td className="px-5 py-3">
                      {u.is_verified ? (
                        <CheckCircle size={18} className="text-emerald-400" />
                      ) : (
                        <XCircle size={18} className="text-gray-600 dark:text-gray-400" />
                      )}
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-400">{new Date(u.date_joined).toLocaleDateString('fr-FR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
