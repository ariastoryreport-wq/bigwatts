import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Zap } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Register() {
  const { register, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    username: '', email: '', password: '', password_confirm: '',
    first_name: '', last_name: '', role: 'proprietaire',
    phone: '', city: '', postal_code: ''
  });

  if (isAuthenticated) {
    navigate('/dashboard');
    return null;
  }

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.password_confirm) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }
    setLoading(true);
    try {
      await register(form);
      toast.success('Inscription réussie !');
      navigate('/dashboard');
    } catch (err) {
      const errors = err.response?.data;
      if (errors) {
        const msg = Object.values(errors).flat().join('. ');
        toast.error(msg);
      } else {
        toast.error('Erreur lors de l\'inscription');
      }
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-950 border border-gray-300 dark:border-gray-700 rounded-lg text-black dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-brand-300 outline-none";

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center space-x-2 mb-6">
            <Zap className="h-10 w-10 text-brand-600 dark:text-brand-300" />
            <span className="text-2xl font-bold text-black dark:text-white">Big<span className="text-brand-600 dark:text-brand-300">Watts</span></span>
          </Link>
          <h1 className="text-2xl font-display font-bold text-black dark:text-white">Créer un compte</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">Rejoignez la communauté BigWatts</p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-8">
          {/* Role selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-3">Je suis :</label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: 'proprietaire', label: 'Propriétaire', desc: 'Je cherche des prestataires' },
                { value: 'prestataire', label: 'Prestataire', desc: 'Je propose mes services' },
              ].map((role) => (
                <button
                  key={role.value}
                  type="button"
                  onClick={() => setForm({ ...form, role: role.value })}
                  className={`p-4 rounded-lg border-2 text-left transition ${
                    form.role === role.value
                      ? 'border-brand-300 bg-brand-50 dark:bg-brand-900/30'
                      : 'border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600'
                  }`}
                >
                  <div className="font-semibold text-black dark:text-white">{role.label}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{role.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Prénom *</label>
                <input
                  type="text" required value={form.first_name} onChange={set('first_name')}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Nom *</label>
                <input
                  type="text" required value={form.last_name} onChange={set('last_name')}
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Nom d'utilisateur *</label>
              <input
                type="text" required value={form.username} onChange={set('username')}
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Email *</label>
              <input
                type="email" required value={form.email} onChange={set('email')}
                className={inputClass}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Ville</label>
                <input
                  type="text" value={form.city} onChange={set('city')}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Code postal</label>
                <input
                  type="text" value={form.postal_code} onChange={set('postal_code')}
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Téléphone</label>
              <input
                type="tel" value={form.phone} onChange={set('phone')}
                className={inputClass}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Mot de passe *</label>
                <input
                  type="password" required value={form.password} onChange={set('password')}
                  className={inputClass}
                  minLength={8}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Confirmer *</label>
                <input
                  type="password" required value={form.password_confirm} onChange={set('password_confirm')}
                  className={inputClass}
                  minLength={8}
                />
              </div>
            </div>

            <button
              type="submit" disabled={loading}
              className="w-full bg-black dark:bg-white text-white dark:text-black py-3 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 transition font-bold disabled:opacity-50 mt-2"
            >
              {loading ? 'Inscription...' : 'Créer mon compte'}
            </button>
          </form>
        </div>

        <p className="text-center mt-6 text-gray-500 dark:text-gray-400">
          Déjà inscrit ?{' '}
          <Link to="/login" className="text-brand-600 dark:text-brand-300 hover:underline font-medium">
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  );
}
