import { useState, useEffect } from 'react';
import { authAPI, ticketsAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useCountry } from '../../context/CountryContext';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { PageHeader, LoadingSpinner, Card, Badge } from '../../components/ui';
import { LifeBuoy, AlertTriangle, Sparkles, Trash2, ExternalLink, Euro } from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

const INSTALLATION_LABELS = {
  solar: 'Panneaux solaires',
  heat_pump: 'Pompe à chaleur',
  ev_charger: 'Borne de recharge VE',
  insulation: 'Isolation thermique',
  battery: 'Batterie de stockage',
  wind: 'Éolienne',
};

function SavedAidesSection({ data, formatPrice, onClear }) {
  const results = data.results || [];
  const params = data.search_params || {};
  const savedDate = data.saved_at ? new Date(data.saved_at).toLocaleDateString('fr-FR') : null;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-green-500" />
          Mes aides sauvegardées
        </h3>
        <div className="flex items-center gap-2">
          <Link
            to="/incentives"
            className="px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white transition"
          >
            Refaire le test
          </Link>
          <button
            onClick={onClear}
            className="p-1.5 text-gray-400 hover:text-red-500 transition rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
            title="Supprimer les résultats"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/30 rounded-xl p-4 mb-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <p className="text-sm font-medium text-green-800 dark:text-green-300">
              {results.length} aide{results.length > 1 ? 's' : ''} éligible{results.length > 1 ? 's' : ''}
              {params.installation_type && ` — ${INSTALLATION_LABELS[params.installation_type] || params.installation_type}`}
            </p>
            {params.region && (
              <p className="text-xs text-green-600 dark:text-green-400 mt-0.5">{params.region}</p>
            )}
          </div>
          {data.total_savings > 0 && (
            <p className="text-xl font-black text-green-600 dark:text-green-400">
              {formatPrice(data.total_savings)}
            </p>
          )}
        </div>
        {savedDate && (
          <p className="text-xs text-green-600 dark:text-green-400 mt-2">Sauvegardé le {savedDate}</p>
        )}
      </div>

      {/* Individual results */}
      <div className="space-y-3">
        {results.slice(0, 5).map((r, idx) => (
          <div key={r.id || idx} className="flex items-start justify-between gap-3 py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-black dark:text-white truncate">{r.name}</p>
              <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                {r.discount_percent > 0 && (
                  <span className="flex items-center gap-1">
                    <Euro className="h-3 w-3" /> Jusqu'à {r.discount_percent}%
                  </span>
                )}
                {r.max_amount > 0 && <span>Plafond : {formatPrice(r.max_amount)}</span>}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {r.estimated_savings > 0 && (
                <span className="text-sm font-bold text-green-600 dark:text-green-400">
                  {formatPrice(r.estimated_savings)}
                </span>
              )}
              {r.official_url && (
                <a href={r.official_url} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-black dark:hover:text-white transition">
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
          </div>
        ))}
        {results.length > 5 && (
          <p className="text-xs text-gray-400 text-center pt-1">
            + {results.length - 5} autre{results.length - 5 > 1 ? 's' : ''} aide{results.length - 5 > 1 ? 's' : ''}
          </p>
        )}
      </div>
    </div>
  );
}

export default function Profile() {
  const { user, updateUser, isPrestataire, isProprietaire, logout } = useAuth();
  const { countries } = useCountry();
  const [form, setForm] = useState({});
  const [profileForm, setProfileForm] = useState({});
  const [loading, setLoading] = useState(false);
  const [passwords, setPasswords] = useState({ old_password: '', new_password: '', new_password2: '' });
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Get regions for the user's country
  const userCountry = countries.find((c) => c.code === user?.country_code);
  const regionList = userCountry?.regions || [];

  useEffect(() => {
    if (user) {
      setForm({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
        phone: user.phone || '',
        region: user.region || '',
        address: user.address || '',
        bio: user.bio || '',
        show_email_on_ad: user.show_email_on_ad || false,
        show_phone_on_ad: user.show_phone_on_ad || false,
      });
      if (isPrestataire && user.prestataire_profile) {
        setProfileForm({
          provider_type: user.prestataire_profile.provider_type || 'independant',
          company_name: user.prestataire_profile.company_name || '',
          website: user.prestataire_profile.website || '',
        });
      }
    }
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authAPI.updateMe(form);
      if (isPrestataire) await authAPI.updatePrestataireProfile(profileForm);
      // Re-fetch full user (including prestataire_profile) to sync local state
      const { data: fresh } = await authAPI.getMe();
      updateUser(fresh);
      toast.success('Profil mis à jour');
    } catch { toast.error('Erreur lors de la mise à jour'); }
    setLoading(false);
  };

  const inputClass = 'w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-black dark:text-white bg-white dark:bg-gray-800 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-brand-300 focus:border-transparent outline-none';

  if (!user) return <DashboardLayout><LoadingSpinner /></DashboardLayout>;

  return (
    <DashboardLayout>
      <PageHeader title="Mon profil" description="Gérez vos informations personnelles" />

      {/* Profile modification warning — prestataire only */}
      {isPrestataire && (
        <div className="flex items-start gap-3 p-4 mb-6 rounded-lg border border-yellow-300 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-900/10">
          <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            <span className="font-semibold">Attention :</span> toute modification de votre profil sera visible sur vos annonces, avis et messages à travers tout le site.
          </p>
        </div>
      )}

      {/* General Info */}
      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4">Informations générales</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Prénom</label>
            <input className={inputClass} value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} autoComplete="given-name" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nom</label>
            <input className={inputClass} value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} autoComplete="family-name" />
          </div>
          {/* Type de prestataire + Nom entreprise — right after name */}
          {isPrestataire && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type de prestataire</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 'independant', label: 'Indépendant' },
                    { value: 'entreprise', label: 'Entreprise' },
                  ].map((pt) => (
                    <button
                      key={pt.value} type="button"
                      onClick={() => setProfileForm({ ...profileForm, provider_type: pt.value })}
                      className={`px-3 py-2 rounded-lg border-2 text-sm font-medium transition ${
                        profileForm.provider_type === pt.value
                          ? 'border-brand-300 bg-brand-50 dark:bg-brand-900/30 text-black dark:text-white'
                          : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-400'
                      }`}
                    >
                      {pt.label}
                    </button>
                  ))}
                </div>
              </div>
              {profileForm.provider_type === 'entreprise' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nom entreprise <span className="text-gray-500 dark:text-gray-400 font-normal">(optionnel)</span></label>
                  <input className={inputClass} value={profileForm.company_name || ''} onChange={(e) => setProfileForm({ ...profileForm, company_name: e.target.value })} autoComplete="organization" />
                </div>
              )}
            </>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Adresse e-mail <span className="text-gray-500 dark:text-gray-400 font-normal">(optionnel)</span></label>
            <input type="email" className={inputClass} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} autoComplete="email" />
          </div>
          {isPrestataire && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Téléphone <span className="text-gray-500 dark:text-gray-400 font-normal">(optionnel)</span></label>
              <input className={inputClass} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} autoComplete="tel" />
            </div>
          )}
          {/* Visibility checkboxes — prestataire only */}
          {isPrestataire && (
            <div className="md:col-span-2 pt-2 border-t border-gray-100 dark:border-gray-800">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Informations visibles sur vos annonces</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                Choisissez les informations de contact à afficher sur vos annonces. Elles seront visibles par les propriétaires connectés.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.show_email_on_ad}
                    onChange={(e) => setForm({ ...form, show_email_on_ad: e.target.checked })}
                    className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                  />
                  <span className="text-sm text-gray-600 dark:text-gray-400">Afficher l'adresse e-mail</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.show_phone_on_ad}
                    onChange={(e) => setForm({ ...form, show_phone_on_ad: e.target.checked })}
                    className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                  />
                  <span className="text-sm text-gray-600 dark:text-gray-400">Afficher le numéro de téléphone</span>
                </label>
              </div>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Région / Province <span className="text-gray-500 dark:text-gray-400 font-normal">(optionnel)</span></label>
            {regionList.length > 0 ? (
              <select
                className={inputClass}
                value={form.region}
                onChange={(e) => setForm({ ...form, region: e.target.value })}
              >
                <option value="">— Sélectionner —</option>
                {regionList.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            ) : (
              <input className={inputClass} value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} placeholder="Votre région" />
            )}
          </div>
          {/* Site web — next to Région */}
          {isPrestataire && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Site web <span className="text-gray-500 dark:text-gray-400 font-normal">(optionnel)</span></label>
              <input className={inputClass} value={profileForm.website || ''} onChange={(e) => setProfileForm({ ...profileForm, website: e.target.value })} autoComplete="url" />
            </div>
          )}
          {/* Bio — prestataire only */}
          {isPrestataire && (
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Bio <span className="text-gray-500 dark:text-gray-400 font-normal">(optionnel)</span></label>
              <textarea rows={3} className={inputClass} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder="Décrivez votre activité, votre expérience…" />
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5">
                Une bio bien rédigée attire davantage de clients et renforce la confiance. Parlez de votre expérience, vos réalisations et votre approche.
              </p>
            </div>
          )}
        </div>
        <button type="submit" disabled={loading} className="mt-4 px-6 py-2.5 bg-black dark:bg-white text-white dark:text-black rounded-lg text-sm font-medium hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-50">
          Enregistrer
        </button>
      </form>

      {/* Saved Aides — proprietaire only */}
      {isProprietaire && user.proprietaire_profile?.saved_incentive_results && (
        <SavedAidesSection
          data={user.proprietaire_profile.saved_incentive_results}
          formatPrice={formatPrice}
          onClear={async () => {
            try {
              await authAPI.clearAidesResults();
              const { data: fresh } = await authAPI.getMe();
              updateUser(fresh);
              toast.success('Résultats supprimés');
            } catch {
              toast.error('Erreur lors de la suppression');
            }
          }}
        />
      )}

      {/* Account settings — Country, Password, Delete */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
        {/* Country */}
        <div>
          <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-2">
            <span className="text-base">{(() => { const c = countries.find(ct => ct.code === user.country_code); return c ? c.flag_emoji : '🌍'; })()}</span>
            Pays du compte
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
            Votre pays détermine les services, prestataires et aides auxquels vous avez accès.
          </p>
          <button
            type="button"
            onClick={async () => {
              try {
                await ticketsAPI.createTicket({
                  subject: `Demande de changement de pays`,
                  category: 'account',
                  description: `Je souhaite changer le pays de mon compte (actuellement : ${user.country_code || 'non défini'}). Merci de mettre à jour mon compte.`,
                  priority: 'medium',
                });
                toast.success('Ticket envoyé au support ! Nous traiterons votre demande rapidement.');
              } catch {
                toast.error('Erreur lors de la création du ticket');
              }
            }}
            className="px-5 py-2.5 bg-gray-100 dark:bg-gray-800 text-black dark:text-white rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition"
          >
            Demander un changement
          </button>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-100 dark:border-gray-800 my-5" />

        {/* Password */}
        {user.has_password !== false && (
          <>
            <div>
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                Mot de passe
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                Modifiez votre mot de passe pour sécuriser votre compte.
              </p>
              <button
                type="button"
                onClick={() => setShowPasswordModal(true)}
                className="px-5 py-2.5 bg-gray-100 dark:bg-gray-800 text-black dark:text-white rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition"
              >
                Changer le mot de passe
              </button>
            </div>
            <div className="border-t border-gray-100 dark:border-gray-800 my-5" />
          </>
        )}

        {/* Delete Account */}
        <div>
          <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
            Supprimer mon compte
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
            Cette action est irréversible. Toutes vos données seront anonymisées.
          </p>
          <button
            type="button"
            onClick={() => setShowDeleteModal(true)}
            className="px-5 py-2.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm font-medium hover:bg-red-100 dark:hover:bg-red-900/30 transition"
          >
            Supprimer mon compte
          </button>
        </div>
      </div>

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setShowPasswordModal(false)}>
          <div
            className="bg-white dark:bg-gray-900 rounded-2xl max-w-md w-full border border-gray-200 dark:border-gray-800 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-black dark:text-white mb-4">Changer le mot de passe</h3>
            <form onSubmit={async (e) => {
              e.preventDefault();
              if (passwords.new_password !== passwords.new_password2) {
                toast.error('Les mots de passe ne correspondent pas');
                return;
              }
              try {
                await authAPI.changePassword(passwords);
                toast.success('Mot de passe modifié');
                setPasswords({ old_password: '', new_password: '', new_password2: '' });
                setShowPasswordModal(false);
              } catch { toast.error('Erreur'); }
            }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ancien mot de passe</label>
                <input type="password" className={inputClass} value={passwords.old_password} onChange={(e) => setPasswords({ ...passwords, old_password: e.target.value })} autoComplete="current-password" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nouveau mot de passe</label>
                <input type="password" className={inputClass} value={passwords.new_password} onChange={(e) => setPasswords({ ...passwords, new_password: e.target.value })} autoComplete="new-password" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Confirmer</label>
                <input type="password" className={inputClass} value={passwords.new_password2} onChange={(e) => setPasswords({ ...passwords, new_password2: e.target.value })} autoComplete="new-password" required />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowPasswordModal(false); setPasswords({ old_password: '', new_password: '', new_password2: '' }); }}
                  className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-800 transition text-black dark:text-white"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-black dark:bg-white text-white dark:text-black rounded-lg text-sm font-bold hover:bg-gray-800 dark:hover:bg-gray-200 transition"
                >
                  Modifier le mot de passe
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setShowDeleteModal(false)}>
          <div
            className="bg-white dark:bg-gray-900 rounded-2xl max-w-md w-full border border-gray-200 dark:border-gray-800 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-red-600 dark:text-red-400 mb-2">Confirmer la suppression</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Êtes-vous sûr de vouloir supprimer votre compte ? Cette action est <strong>définitive et irréversible</strong>.
              Vos données seront anonymisées et vos annonces marquées comme supprimées.
            </p>
            <div className="space-y-3">
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={deleteConfirm}
                  onChange={(e) => setDeleteConfirm(e.target.checked)}
                  className="mt-0.5 rounded border-gray-300 text-red-600 focus:ring-red-500"
                />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Je comprends que cette action est irréversible et je souhaite supprimer mon compte.
                </span>
              </label>
            </div>
            <div className="flex gap-3 mt-5">
              <button
                type="button"
                onClick={() => { setShowDeleteModal(false); setDeleteConfirm(false); }}
                className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-800 transition text-black dark:text-white"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={!deleteConfirm || deleting}
                onClick={async () => {
                  setDeleting(true);
                  try {
                    await authAPI.deleteAccount({ confirm: true });
                    toast.success('Compte supprimé. Au revoir.');
                    logout();
                  } catch (err) {
                    toast.error(err.response?.data?.error || 'Erreur lors de la suppression');
                  } finally {
                    setDeleting(false);
                  }
                }}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg text-sm font-bold hover:bg-red-700 transition disabled:opacity-50"
              >
                {deleting ? 'Suppression...' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}

    </DashboardLayout>
  );
}
