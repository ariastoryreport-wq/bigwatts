import { useState, useEffect } from 'react';
import { authAPI, countriesAPI } from '../../../services/api';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import { PageHeader, LoadingSpinner, EmptyState, Badge } from '../../../components/ui';
import { Users, Search, CheckCircle, XCircle, ChevronDown, ChevronUp, Trash2, Globe, Save } from 'lucide-react';
import toast from 'react-hot-toast';

const ROLE_LABELS = { prestataire: 'Prestataire', proprietaire: 'Propriétaire', customer_service: 'Support' };

export default function CSUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [expanded, setExpanded] = useState(null);
  const [countries, setCountries] = useState([]);
  const [countryEdits, setCountryEdits] = useState({});
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [showDeleted, setShowDeleted] = useState(false);

  useEffect(() => {
    fetchUsers();
    countriesAPI.getCountries()
      .then(({ data }) => setCountries(data.results || data))
      .catch(() => {});
  }, [showDeleted]);

  const fetchUsers = (params = {}) => {
    setLoading(true);
    authAPI.csGetUsers({ ...params, ...(showDeleted ? { include_deleted: 'true' } : {}) })
      .then(({ data }) => setUsers(data.results || data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  const handleCountryChange = async (userId) => {
    const code = countryEdits[userId];
    if (!code) return;
    try {
      await authAPI.csUpdateUser(userId, { country_code: code });
      toast.success('Pays mis à jour');
      setCountryEdits((prev) => { const n = { ...prev }; delete n[userId]; return n; });
      fetchUsers();
    } catch {
      toast.error('Erreur lors de la mise à jour du pays');
    }
  };

  const handleDelete = async (userId) => {
    try {
      await authAPI.csDeleteUser(userId);
      toast.success('Utilisateur supprimé');
      setConfirmDelete(null);
      setExpanded(null);
      fetchUsers();
    } catch {
      toast.error('Erreur lors de la suppression');
    }
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
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-gray-800 rounded-lg text-sm focus:ring-2 focus:ring-brand-300 outline-none bg-white dark:bg-gray-900 text-black dark:text-white"
            placeholder="Rechercher un utilisateur..."
            value={search} onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="px-4 py-2.5 border border-gray-200 dark:border-gray-800 rounded-lg text-sm focus:ring-2 focus:ring-brand-300 outline-none bg-white dark:bg-gray-900 text-black dark:text-white"
          value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}
        >
          <option value="">Tous les rôles</option>
          <option value="prestataire">Prestataire</option>
          <option value="proprietaire">Propriétaire</option>
          <option value="customer_service">Support</option>
        </select>
        <label className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 dark:border-gray-800 rounded-lg text-sm bg-white dark:bg-gray-900 cursor-pointer select-none whitespace-nowrap">
          <input
            type="checkbox"
            checked={showDeleted}
            onChange={(e) => setShowDeleted(e.target.checked)}
            className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
          />
          <span className="text-gray-600 dark:text-gray-400">Inclure supprimés</span>
        </label>
      </div>

      {loading ? <LoadingSpinner /> : filtered.length === 0 ? (
        <EmptyState icon={Users} title="Aucun utilisateur trouvé" />
      ) : (
        <div className="space-y-2">
          {filtered.map((u) => {
            const isExpanded = expanded === u.id;
            return (
              <div key={u.id} className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
                {/* Row header */}
                <button
                  onClick={() => { setExpanded(isExpanded ? null : u.id); setConfirmDelete(null); }}
                  className="w-full flex items-center justify-between px-5 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition text-left"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-brand-50 dark:bg-brand-900/30 flex items-center justify-center text-brand-600 dark:text-brand-300 text-sm font-bold flex-shrink-0">
                      {(u.first_name?.[0] || u.username[0]).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-black dark:text-white truncate">
                        {u.first_name} {u.last_name}{' '}
                        <span className="text-gray-400 font-normal">@{u.username}</span>
                      </p>
                      <p className="text-xs text-gray-400 truncate">{u.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <Badge variant={u.role === 'prestataire' ? 'primary' : u.role === 'customer_service' ? 'warning' : 'default'}>
                      {ROLE_LABELS[u.role] || u.role}
                    </Badge>
                    {!u.is_active && (
                      <Badge variant="danger">Supprimé</Badge>
                    )}
                    {u.is_verified ? (
                      <CheckCircle size={16} className="text-emerald-400" />
                    ) : (
                      <XCircle size={16} className="text-gray-400" />
                    )}
                    <span className="text-xs text-gray-400 hidden sm:block">{new Date(u.date_joined).toLocaleDateString('fr-FR')}</span>
                    {isExpanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                  </div>
                </button>

                {/* Expanded detail panel */}
                {isExpanded && (
                  <div className="border-t border-gray-200 dark:border-gray-800 px-5 py-4 space-y-4 bg-gray-50/50 dark:bg-gray-800/20">
                    {/* Info grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500 dark:text-gray-400 text-xs mb-0.5">Ville</p>
                        <p className="text-black dark:text-white font-medium">{u.city || '–'}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 dark:text-gray-400 text-xs mb-0.5">Région</p>
                        <p className="text-black dark:text-white font-medium">{u.region || '–'}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 dark:text-gray-400 text-xs mb-0.5">Téléphone</p>
                        <p className="text-black dark:text-white font-medium">{u.phone || '–'}</p>
                      </div>
                    </div>

                    {/* Country change */}
                    <div className="flex flex-wrap items-center gap-3 bg-white dark:bg-gray-900 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                      <Globe className="h-4 w-4 text-gray-500 flex-shrink-0" />
                      <span className="text-sm text-gray-600 dark:text-gray-300">Pays actuel :</span>
                      <span className="text-sm font-medium text-black dark:text-white">{u.country_code || '–'}</span>
                      <select
                        className="px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg text-sm outline-none bg-white dark:bg-gray-800 text-black dark:text-white"
                        value={countryEdits[u.id] || ''}
                        onChange={(e) => setCountryEdits({ ...countryEdits, [u.id]: e.target.value })}
                      >
                        <option value="">Changer le pays…</option>
                        {countries.map((c) => (
                          <option key={c.code} value={c.code}>{c.flag_emoji} {c.name}</option>
                        ))}
                      </select>
                      {countryEdits[u.id] && (
                        <button
                          onClick={() => handleCountryChange(u.id)}
                          className="px-3 py-1.5 bg-brand-600 text-white rounded-lg text-xs font-bold hover:bg-brand-700 transition flex items-center gap-1"
                        >
                          <Save className="h-3 w-3" /> Appliquer
                        </button>
                      )}
                    </div>

                    {/* Delete zone */}
                    <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
                      {confirmDelete === u.id ? (
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-red-600 dark:text-red-400 font-medium">Confirmer la suppression ?</span>
                          <button
                            onClick={() => handleDelete(u.id)}
                            className="px-4 py-1.5 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 transition"
                          >
                            Oui, supprimer
                          </button>
                          <button
                            onClick={() => setConfirmDelete(null)}
                            className="px-4 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-medium hover:bg-gray-100 dark:hover:bg-gray-800 text-black dark:text-white transition"
                          >
                            Annuler
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDelete(u.id)}
                          className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-600 dark:hover:text-red-400 transition"
                        >
                          <Trash2 className="h-4 w-4" /> Supprimer cet utilisateur
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
}
