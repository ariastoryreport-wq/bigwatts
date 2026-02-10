import { useState, useEffect } from 'react';
import { authAPI, reviewsAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useCountry } from '../../context/CountryContext';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { PageHeader, LoadingSpinner, StarRating, Card } from '../../components/ui';
import { Star } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Profile() {
  const { user, updateUser, isPrestataire, isProprietaire } = useAuth();
  const { countries } = useCountry();
  const [form, setForm] = useState({});
  const [profileForm, setProfileForm] = useState({});
  const [loading, setLoading] = useState(false);
  const [passwords, setPasswords] = useState({ old_password: '', new_password: '', new_password2: '' });
  const [reviews, setReviews] = useState([]);

  useEffect(() => {
    if (user) {
      setForm({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        phone: user.phone || '',
        city: user.city || '',
        postal_code: user.postal_code || '',
        address: user.address || '',
        bio: user.bio || '',
        country_code: user.country_code || 'FR',
      });
      if (isPrestataire && user.prestataire_profile) {
        setProfileForm({
          company_name: user.prestataire_profile.company_name || '',
          siret: user.prestataire_profile.siret || '',
          website: user.prestataire_profile.website || '',
          years_experience: user.prestataire_profile.years_experience || 0,
          service_radius_km: user.prestataire_profile.service_radius_km || 50,
          certifications: user.prestataire_profile.certifications || '',
          specialties: user.prestataire_profile.specialties || '',
        });
      }
      if (isProprietaire && user.proprietaire_profile) {
        setProfileForm({
          property_type: user.proprietaire_profile.property_type || 'house',
          property_surface: user.proprietaire_profile.property_surface || '',
          energy_interests: user.proprietaire_profile.energy_interests || '',
          budget_range: user.proprietaire_profile.budget_range || '',
        });
      }
      // Fetch reviews for the profile
      if (isPrestataire) {
        reviewsAPI.getReceivedReviews()
          .then(({ data }) => setReviews(data.results || data))
          .catch(() => {});
      } else if (isProprietaire) {
        reviewsAPI.getWrittenReviews()
          .then(({ data }) => setReviews(data.results || data))
          .catch(() => {});
      }
    }
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await authAPI.updateMe(form);
      updateUser(data);
      toast.success('Profil mis à jour');
    } catch { toast.error('Erreur lors de la mise à jour'); }
    setLoading(false);
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isPrestataire) await authAPI.updatePrestataireProfile(profileForm);
      else if (isProprietaire) await authAPI.updateProprietaireProfile(profileForm);
      toast.success('Profil spécifique mis à jour');
    } catch { toast.error('Erreur'); }
    setLoading(false);
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwords.new_password !== passwords.new_password2) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }
    try {
      await authAPI.changePassword(passwords);
      toast.success('Mot de passe modifié');
      setPasswords({ old_password: '', new_password: '', new_password2: '' });
    } catch { toast.error('Erreur'); }
  };

  const inputClass = 'w-full px-4 py-2.5 border border-gray-200 dark:border-gray-800 rounded-lg text-sm focus:ring-2 focus:ring-brand-300 focus:border-transparent outline-none';

  if (!user) return <DashboardLayout><LoadingSpinner /></DashboardLayout>;

  return (
    <DashboardLayout>
      <PageHeader title="Mon profil" description="Gérez vos informations personnelles" />

      {/* General Info */}
      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4">Informations générales</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Prénom</label>
            <input className={inputClass} value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nom</label>
            <input className={inputClass} value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Téléphone</label>
            <input className={inputClass} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ville</label>
            <input className={inputClass} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Code postal</label>
            <input className={inputClass} value={form.postal_code} onChange={(e) => setForm({ ...form, postal_code: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Adresse</label>
            <input className={inputClass} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </div>
          {countries.length > 1 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Pays</label>
              <select className={inputClass} value={form.country_code} onChange={(e) => setForm({ ...form, country_code: e.target.value })}>
                {countries.map((c) => (
                  <option key={c.code} value={c.code}>{c.flag_emoji} {c.name}</option>
                ))}
              </select>
            </div>
          )}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Bio</label>
            <textarea rows={3} className={inputClass} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
          </div>
        </div>
        <button type="submit" disabled={loading} className="mt-4 px-6 py-2.5 bg-black dark:bg-white text-white dark:text-black rounded-lg text-sm font-medium hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-50">
          Enregistrer
        </button>
      </form>

      {/* Role-specific profile */}
      {(isPrestataire || isProprietaire) && (
        <form onSubmit={handleProfileSubmit} className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">
            {isPrestataire ? 'Profil prestataire' : 'Profil propriétaire'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {isPrestataire && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nom entreprise</label>
                  <input className={inputClass} value={profileForm.company_name || ''} onChange={(e) => setProfileForm({ ...profileForm, company_name: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">SIRET</label>
                  <input className={inputClass} value={profileForm.siret || ''} onChange={(e) => setProfileForm({ ...profileForm, siret: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Site web</label>
                  <input className={inputClass} value={profileForm.website || ''} onChange={(e) => setProfileForm({ ...profileForm, website: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Années d'expérience</label>
                  <input type="number" className={inputClass} value={profileForm.years_experience || ''} onChange={(e) => setProfileForm({ ...profileForm, years_experience: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Rayon d'intervention (km)</label>
                  <input type="number" className={inputClass} value={profileForm.service_radius_km || ''} onChange={(e) => setProfileForm({ ...profileForm, service_radius_km: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Certifications</label>
                  <input className={inputClass} value={profileForm.certifications || ''} onChange={(e) => setProfileForm({ ...profileForm, certifications: e.target.value })} placeholder="QualiPV, RGE..." />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Spécialités</label>
                  <input className={inputClass} value={profileForm.specialties || ''} onChange={(e) => setProfileForm({ ...profileForm, specialties: e.target.value })} placeholder="Solaire, Thermodynamique..." />
                </div>
              </>
            )}
            {isProprietaire && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type de propriété</label>
                  <select className={inputClass} value={profileForm.property_type || ''} onChange={(e) => setProfileForm({ ...profileForm, property_type: e.target.value })}>
                    <option value="house">Maison</option>
                    <option value="apartment">Appartement</option>
                    <option value="commercial">Local commercial</option>
                    <option value="other">Autre</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Surface (m²)</label>
                  <input type="number" className={inputClass} value={profileForm.property_surface || ''} onChange={(e) => setProfileForm({ ...profileForm, property_surface: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Intérêts énergétiques</label>
                  <input className={inputClass} value={profileForm.energy_interests || ''} onChange={(e) => setProfileForm({ ...profileForm, energy_interests: e.target.value })} placeholder="Solaire, Borne de recharge..." />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Budget envisagé</label>
                  <input className={inputClass} value={profileForm.budget_range || ''} onChange={(e) => setProfileForm({ ...profileForm, budget_range: e.target.value })} placeholder="5 000 - 15 000 €" />
                </div>
              </>
            )}
          </div>
          <button type="submit" disabled={loading} className="mt-4 px-6 py-2.5 bg-black dark:bg-white text-white dark:text-black rounded-lg text-sm font-medium hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-50">
            Enregistrer
          </button>
        </form>
      )}

      {/* Password */}
      <form onSubmit={handlePasswordChange} className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
        <h3 className="text-lg font-semibold mb-4">Changer le mot de passe</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ancien mot de passe</label>
            <input type="password" className={inputClass} value={passwords.old_password} onChange={(e) => setPasswords({ ...passwords, old_password: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nouveau mot de passe</label>
            <input type="password" className={inputClass} value={passwords.new_password} onChange={(e) => setPasswords({ ...passwords, new_password: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Confirmer</label>
            <input type="password" className={inputClass} value={passwords.new_password2} onChange={(e) => setPasswords({ ...passwords, new_password2: e.target.value })} />
          </div>
        </div>
        <button type="submit" className="mt-4 px-6 py-2.5 bg-gray-100 dark:bg-gray-800 text-black dark:text-white rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700">
          Modifier le mot de passe
        </button>
      </form>

      {/* Notification Preferences */}
      {/* Reviews section */}
      {reviews.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6 mt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Star className="h-5 w-5 text-brand-300 fill-brand-300" />
              {isPrestataire ? 'Avis reçus' : 'Mes avis'} ({reviews.length})
            </h3>
          </div>
          <div className="space-y-4">
            {reviews.slice(0, 5).map((rev) => (
              <Card key={rev.id} className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-sm text-black dark:text-white">
                      {rev.author_name || rev.author_username}
                    </span>
                    <StarRating rating={rev.rating} size={14} />
                  </div>
                  <span className="text-xs text-gray-400">
                    {new Date(rev.created_at).toLocaleDateString('fr-FR')}
                  </span>
                </div>
                {rev.title && <p className="font-medium text-sm mb-1">{rev.title}</p>}
                <p className="text-sm text-gray-600 dark:text-gray-400">{rev.comment}</p>
                {rev.provider_response && (
                  <div className="mt-2 ml-4 pl-4 border-l-2 border-brand-200 dark:border-brand-800">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      <span className="font-medium">Réponse :</span> {rev.provider_response}
                    </p>
                  </div>
                )}
              </Card>
            ))}
            {reviews.length > 5 && (
              <p className="text-sm text-center text-gray-500">
                Et {reviews.length - 5} autre{reviews.length - 5 > 1 ? 's' : ''} avis…
              </p>
            )}
          </div>
        </div>
      )}

    </DashboardLayout>
  );
}
