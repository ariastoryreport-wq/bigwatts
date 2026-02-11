import { useState, useEffect, createContext, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCountry } from '../../context/CountryContext';
import { Eye, EyeOff, X } from 'lucide-react';
import toast from 'react-hot-toast';

/* ─── Auth Modal Context ─── */
const AuthModalContext = createContext(null);

export function AuthModalProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  const [initialTab, setInitialTab] = useState('login'); // 'login' | 'register'
  const [redirectAfter, setRedirectAfter] = useState(null);

  const openLogin = (redirect = null) => {
    setInitialTab('login');
    setRedirectAfter(redirect);
    setIsOpen(true);
  };

  const openRegister = (redirect = null) => {
    setInitialTab('register');
    setRedirectAfter(redirect);
    setIsOpen(true);
  };

  const close = () => {
    setIsOpen(false);
    setRedirectAfter(null);
  };

  return (
    <AuthModalContext.Provider value={{ isOpen, initialTab, redirectAfter, openLogin, openRegister, close }}>
      {children}
      <AuthModal />
    </AuthModalContext.Provider>
  );
}

export function useAuthModal() {
  const ctx = useContext(AuthModalContext);
  if (!ctx) throw new Error('useAuthModal must be used within AuthModalProvider');
  return ctx;
}

/* ─── Auth Modal Component ─── */
function AuthModal() {
  const { isOpen, initialTab, redirectAfter, close } = useContext(AuthModalContext);
  const { login, register, isAuthenticated } = useAuth();
  const { countries, countryCode } = useCountry();
  const navigate = useNavigate();
  const [tab, setTab] = useState(initialTab);

  // Login state
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);

  // Register state
  const [regForm, setRegForm] = useState({
    username: '', email: '', password: '', password_confirm: '',
    first_name: '', last_name: '', role: 'proprietaire',
    phone: '', city: '', postal_code: '', country_code: countryCode,
  });
  const [regLoading, setRegLoading] = useState(false);

  // Sync tab with initialTab when modal opens
  useEffect(() => {
    if (isOpen) {
      setTab(initialTab);
      setLoginForm({ username: '', password: '' });
      setShowPw(false);
    }
  }, [isOpen, initialTab]);

  // Close when authenticated
  useEffect(() => {
    if (isAuthenticated && isOpen) {
      close();
      if (redirectAfter) navigate(redirectAfter);
    }
  }, [isAuthenticated]);

  if (!isOpen) return null;

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginLoading(true);
    try {
      await login(loginForm);
      toast.success('Connexion réussie !');
      close();
      if (redirectAfter) navigate(redirectAfter);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur de connexion');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (regForm.password !== regForm.password_confirm) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }
    setRegLoading(true);
    try {
      await register(regForm);
      toast.success('Inscription réussie !');
      close();
      if (redirectAfter) navigate(redirectAfter);
    } catch (err) {
      const errors = err.response?.data;
      if (errors) {
        toast.error(Object.values(errors).flat().join('. '));
      } else {
        toast.error("Erreur lors de l'inscription");
      }
    } finally {
      setRegLoading(false);
    }
  };

  const setReg = (field) => (e) => setRegForm({ ...regForm, [field]: e.target.value });
  const inputClass = "w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-950 border border-gray-300 dark:border-gray-700 rounded-lg text-black dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-brand-300 outline-none text-sm";

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={close}>
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 pb-0">
          <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => setTab('login')}
              className={`px-4 py-2 rounded-md text-sm font-semibold transition ${
                tab === 'login'
                  ? 'bg-white dark:bg-gray-700 text-black dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              Connexion
            </button>
            <button
              onClick={() => setTab('register')}
              className={`px-4 py-2 rounded-md text-sm font-semibold transition ${
                tab === 'register'
                  ? 'bg-white dark:bg-gray-700 text-black dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              Inscription
            </button>
          </div>
          <button onClick={close} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="p-5">
          {/* ─── Login Tab ─── */}
          {tab === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Email ou nom d'utilisateur</label>
                <input
                  type="text" required
                  className={inputClass}
                  value={loginForm.username}
                  onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                  placeholder="votre@email.fr"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Mot de passe</label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'} required
                    className={`${inputClass} pr-12`}
                    value={loginForm.password}
                    onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                    placeholder="••••••••"
                  />
                  <button type="button" onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loginLoading}
                className="w-full bg-black dark:bg-white text-white dark:text-black py-2.5 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 transition font-bold disabled:opacity-50 text-sm">
                {loginLoading ? 'Connexion...' : 'Se connecter'}
              </button>

              {/* Demo accounts */}
              <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
                <p className="text-xs text-gray-400 text-center mb-2">Comptes de démo :</p>
                <div className="grid grid-cols-1 gap-1.5 text-xs">
                  {[
                    { label: 'Prestataire', user: 'solarpro', pw: 'demo1234' },
                    { label: 'Propriétaire', user: 'alice_leroy', pw: 'demo1234' },
                    { label: 'Support', user: 'support', pw: 'support123' },
                  ].map((demo) => (
                    <button
                      key={demo.user} type="button"
                      onClick={() => setLoginForm({ username: demo.user, password: demo.pw })}
                      className="text-left bg-gray-50 dark:bg-gray-800 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition border border-gray-200 dark:border-gray-700"
                    >
                      <span className="font-medium text-gray-700 dark:text-gray-300">{demo.label}:</span>{' '}
                      <span className="text-gray-500 dark:text-gray-400">{demo.user} / {demo.pw}</span>
                    </button>
                  ))}
                </div>
              </div>
            </form>
          )}

          {/* ─── Register Tab ─── */}
          {tab === 'register' && (
            <form onSubmit={handleRegister} className="space-y-3">
              {/* Role selection */}
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Je suis :</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 'proprietaire', label: 'Propriétaire', desc: 'Je cherche des prestataires' },
                    { value: 'prestataire', label: 'Prestataire', desc: 'Je propose mes services' },
                  ].map((role) => (
                    <button
                      key={role.value} type="button"
                      onClick={() => setRegForm({ ...regForm, role: role.value })}
                      className={`p-3 rounded-lg border-2 text-left transition text-sm ${
                        regForm.role === role.value
                          ? 'border-brand-300 bg-brand-50 dark:bg-brand-900/30'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-400'
                      }`}
                    >
                      <div className="font-semibold text-black dark:text-white">{role.label}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{role.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Prénom *</label>
                  <input type="text" required value={regForm.first_name} onChange={setReg('first_name')} className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Nom *</label>
                  <input type="text" required value={regForm.last_name} onChange={setReg('last_name')} className={inputClass} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Nom d'utilisateur *</label>
                <input type="text" required value={regForm.username} onChange={setReg('username')} className={inputClass} />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Email *</label>
                <input type="email" required value={regForm.email} onChange={setReg('email')} className={inputClass} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Ville</label>
                  <input type="text" value={regForm.city} onChange={setReg('city')} className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Code postal</label>
                  <input type="text" value={regForm.postal_code} onChange={setReg('postal_code')} className={inputClass} />
                </div>
              </div>

              {countries.length > 1 && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Pays</label>
                  <select value={regForm.country_code} onChange={(e) => setRegForm({ ...regForm, country_code: e.target.value })} className={inputClass}>
                    {countries.map((c) => (
                      <option key={c.code} value={c.code}>{c.flag_emoji} {c.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Mot de passe *</label>
                  <input type="password" required value={regForm.password} onChange={setReg('password')} className={inputClass} minLength={8} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Confirmer *</label>
                  <input type="password" required value={regForm.password_confirm} onChange={setReg('password_confirm')} className={inputClass} minLength={8} />
                </div>
              </div>

              <button type="submit" disabled={regLoading}
                className="w-full bg-black dark:bg-white text-white dark:text-black py-2.5 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 transition font-bold disabled:opacity-50 text-sm mt-1">
                {regLoading ? 'Inscription...' : 'Créer mon compte'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default AuthModal;
