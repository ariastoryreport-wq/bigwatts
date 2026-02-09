import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Zap, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Login() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) {
    navigate('/dashboard');
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(form);
      toast.success('Connexion réussie !');
      navigate('/dashboard');
    } catch (err) {
      const msg = err.response?.data?.error || 'Erreur de connexion';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center space-x-2 mb-6">
            <Zap className="h-10 w-10 text-brand-600 dark:text-brand-300" />
            <span className="text-2xl font-bold text-black dark:text-white">Big<span className="text-brand-600 dark:text-brand-300">Watts</span></span>
          </Link>
          <h1 className="text-2xl font-display font-bold text-black dark:text-white">Connexion</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">Accédez à votre espace BigWatts</p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Email ou nom d'utilisateur</label>
              <input
                type="text" required
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-950 border border-gray-300 dark:border-gray-700 rounded-lg text-black dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-brand-300 focus:border-brand-300 outline-none"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                placeholder="votre@email.fr"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Mot de passe</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'} required
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-950 border border-gray-300 dark:border-gray-700 rounded-lg text-black dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-brand-300 focus:border-brand-300 outline-none pr-12"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {showPw ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit" disabled={loading}
              className="w-full bg-black dark:bg-white text-white dark:text-black py-3 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 transition font-bold disabled:opacity-50"
            >
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>
          </form>

          {/* Demo accounts */}
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-800">
            <p className="text-xs text-gray-400 text-center mb-3">Comptes de démo :</p>
            <div className="grid grid-cols-1 gap-2 text-xs">
              {[
                { label: 'Prestataire', user: 'solarpro', pw: 'demo1234' },
                { label: 'Propriétaire', user: 'proprietaire1', pw: 'demo1234' },
                { label: 'Support', user: 'support', pw: 'support123' },
              ].map((demo) => (
                <button
                  key={demo.user}
                  onClick={() => { setForm({ username: demo.user, password: demo.pw }); }}
                  className="text-left bg-gray-100 dark:bg-gray-800 p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition border border-gray-300 dark:border-gray-700"
                >
                  <span className="font-medium text-gray-700 dark:text-gray-300">{demo.label}:</span>{' '}
                  <span className="text-gray-500 dark:text-gray-400">{demo.user} / {demo.pw}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="text-center mt-6 text-gray-500 dark:text-gray-400">
          Pas encore de compte ?{' '}
          <Link to="/register" className="text-brand-600 dark:text-brand-300 hover:underline font-medium">
            S'inscrire
          </Link>
        </p>
      </div>
    </div>
  );
}
