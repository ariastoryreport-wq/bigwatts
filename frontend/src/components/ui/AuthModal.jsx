import { useState, useEffect, useRef, createContext, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCountry } from '../../context/CountryContext';
import { Eye, EyeOff, X } from 'lucide-react';
import toast from 'react-hot-toast';

/* ─── Google Identity Services loader ─── */
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

let _gsiReady = null;
function loadGoogleScript() {
  if (_gsiReady) return _gsiReady;
  _gsiReady = new Promise((resolve) => {
    if (window.google?.accounts?.id) return resolve();
    const existing = document.getElementById('google-gsi');
    if (existing) {
      // Script tag exists but hasn't loaded yet — poll until ready
      const poll = setInterval(() => {
        if (window.google?.accounts?.id) { clearInterval(poll); resolve(); }
      }, 50);
      return;
    }
    const s = document.createElement('script');
    s.id = 'google-gsi';
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.defer = true;
    s.onload = () => {
      // GSI may need a tick after onload to attach window.google.accounts
      const poll = setInterval(() => {
        if (window.google?.accounts?.id) { clearInterval(poll); resolve(); }
      }, 50);
    };
    document.head.appendChild(s);
  });
  return _gsiReady;
}

/* ─── Auth Modal Context ─── */
const AuthModalContext = createContext(null);

export function AuthModalProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  const [initialTab, setInitialTab] = useState('login');
  const [registerRole, setRegisterRole] = useState('proprietaire');
  const [redirectAfter, setRedirectAfter] = useState(null);

  const openLogin = (redirect = null) => {
    setInitialTab('login');
    setRedirectAfter(redirect);
    setIsOpen(true);
  };

  const openRegister = (redirect = null, role = 'proprietaire') => {
    setInitialTab('register');
    setRegisterRole(role);
    setRedirectAfter(redirect);
    setIsOpen(true);
  };

  const close = () => {
    setIsOpen(false);
    setRedirectAfter(null);
  };

  return (
    <AuthModalContext.Provider value={{ isOpen, initialTab, registerRole, redirectAfter, openLogin, openRegister, close }}>
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

/* ─── Google button component ─── */
function GoogleButton({ label, onToken }) {
  const divRef = useRef(null);
  const onTokenRef = useRef(onToken);
  onTokenRef.current = onToken;           // always fresh without re-triggering effect

  useEffect(() => {
    if (!divRef.current || !GOOGLE_CLIENT_ID) return;
    let cancelled = false;
    loadGoogleScript().then(() => {
      if (cancelled || !divRef.current) return;
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (response) => onTokenRef.current(response.credential),
      });
      window.google.accounts.id.renderButton(divRef.current, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        width: divRef.current.offsetWidth,
        text: label === 'login' ? 'signin_with' : 'signup_with',
        logo_alignment: 'center',
      });
    });
    return () => { cancelled = true; };
  }, [label]);

  if (!GOOGLE_CLIENT_ID) return null;
  return <div ref={divRef} className="w-full" />;
}

/* ─── Auth Modal Component ─── */
function AuthModal() {
  const { isOpen, initialTab, registerRole, redirectAfter, close } = useContext(AuthModalContext);
  const { login, register, googleLogin, isAuthenticated } = useAuth();
  const { countryCode } = useCountry();
  const navigate = useNavigate();
  const [tab, setTab] = useState(initialTab);

  // Login state
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);

  // Register state — simplified: email + password only
  const [regRole, setRegRole] = useState(registerRole);
  const [regForm, setRegForm] = useState({
    email: '', password: '', password_confirm: '',
  });
  const [regLoading, setRegLoading] = useState(false);

  // Sync on open
  useEffect(() => {
    if (isOpen) {
      setTab(initialTab);
      setRegRole(registerRole);
      setLoginForm({ username: '', password: '' });
      setShowPw(false);
      setRegForm({ email: '', password: '', password_confirm: '' });
    }
  }, [isOpen, initialTab, registerRole]);

  // Close when authenticated
  useEffect(() => {
    if (isAuthenticated && isOpen) {
      close();
      if (regRole === 'prestataire' && tab === 'register') {
        navigate('/dashboard/onboarding');
      } else if (redirectAfter) {
        navigate(redirectAfter);
      }
    }
  }, [isAuthenticated]);

  if (!isOpen) return null;

  /* ─── Handlers ─── */
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
      await register({
        email: regForm.email,
        password: regForm.password,
        password_confirm: regForm.password_confirm,
        role: regRole,
        country_code: countryCode,
      });
      toast.success('Inscription réussie !');
    } catch (err) {
      const errors = err.response?.data;
      if (errors && typeof errors === 'object') {
        // Show field-specific errors with labels
        const fieldLabels = { email: 'Email', password: 'Mot de passe', password_confirm: 'Confirmation', username: "Nom d'utilisateur" };
        const messages = Object.entries(errors)
          .map(([field, msgs]) => {
            const label = fieldLabels[field] || field;
            const text = Array.isArray(msgs) ? msgs.join(' ') : msgs;
            return `${label} : ${text}`;
          });
        messages.forEach((m) => toast.error(m, { duration: 5000 }));
      } else {
        toast.error("Erreur lors de l'inscription");
      }
    } finally {
      setRegLoading(false);
    }
  };

  const handleGoogleToken = async (token) => {
    try {
      const u = await googleLogin({ token, role: regRole, country_code: countryCode });
      toast.success('Connexion réussie !');
      close();
      // New prestataire → onboarding
      if (u.role === 'prestataire' && tab === 'register') {
        navigate('/dashboard/onboarding');
      } else if (redirectAfter) {
        navigate(redirectAfter);
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur Google');
    }
  };

  const setReg = (field) => (e) => setRegForm({ ...regForm, [field]: e.target.value });
  const inputClass = "w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-950 border border-gray-300 dark:border-gray-700 rounded-lg text-black dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-brand-300 outline-none text-sm";

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={close}>
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-800"
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
                  autoComplete="username"
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
                    autoComplete="current-password"
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

              {/* Google */}
              {GOOGLE_CLIENT_ID && (
                <>
                  <div className="relative py-2">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200 dark:border-gray-700" /></div>
                    <div className="relative flex justify-center"><span className="bg-white dark:bg-gray-900 px-3 text-xs text-gray-400">ou</span></div>
                  </div>
                  <GoogleButton label="login" onToken={handleGoogleToken} />
                </>
              )}

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
              {/* Role title */}
              <div className="text-center pb-1">
                <h3 className="text-base font-bold text-black dark:text-white">
                  {regRole === 'proprietaire'
                    ? 'Créer un compte propriétaire'
                    : 'Créer un compte prestataire'}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {regRole === 'proprietaire'
                    ? 'Trouvez des professionnels pour vos projets énergétiques.'
                    : 'Proposez vos services aux propriétaires.'}
                </p>
              </div>

              {/* Google — top of form */}
              <GoogleButton label="register" onToken={handleGoogleToken} />
              {GOOGLE_CLIENT_ID && (
                <div className="relative py-1">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200 dark:border-gray-700" /></div>
                  <div className="relative flex justify-center"><span className="bg-white dark:bg-gray-900 px-3 text-xs text-gray-400">ou</span></div>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Email *</label>
                <input type="email" required value={regForm.email} onChange={setReg('email')} className={inputClass} placeholder="votre@email.fr" autoComplete="email" />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Mot de passe *</label>
                <div className="relative">
                  <input type={showPw ? 'text' : 'password'} required value={regForm.password} onChange={setReg('password')} className={`${inputClass} pr-12`} minLength={8} placeholder="8 caractères minimum" autoComplete="new-password" />
                  <button type="button" onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-gray-400 mt-1">Min. 8 caractères, pas trop courant (ex: pas "password123")</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Confirmer le mot de passe *</label>
                <input type="password" required value={regForm.password_confirm} onChange={setReg('password_confirm')} className={inputClass} minLength={8} placeholder="••••••••" autoComplete="new-password" />
              </div>

              <button type="submit" disabled={regLoading}
                className="w-full bg-black dark:bg-white text-white dark:text-black py-2.5 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 transition font-bold disabled:opacity-50 text-sm mt-1">
                {regLoading ? 'Inscription...' : 'Créer mon compte'}
              </button>

              {/* Cross-link to other role */}
              <div className="text-center pt-2">
                <p className="text-xs text-gray-400">
                  {regRole === 'proprietaire' ? (
                    <>
                      Vous êtes professionnel ?{' '}
                      <button type="button" onClick={() => setRegRole('prestataire')} className="text-brand-500 hover:text-brand-400 font-semibold underline underline-offset-2">
                        Inscrivez-vous en tant que prestataire
                      </button>
                    </>
                  ) : (
                    <>
                      Vous êtes propriétaire ?{' '}
                      <button type="button" onClick={() => setRegRole('proprietaire')} className="text-brand-500 hover:text-brand-400 font-semibold underline underline-offset-2">
                        Inscrivez-vous en tant que propriétaire
                      </button>
                    </>
                  )}
                </p>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default AuthModal;
