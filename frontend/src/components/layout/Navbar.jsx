import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Menu, X, Bell, User, LogOut, Zap, ChevronDown } from 'lucide-react';
import { notificationsAPI } from '../../services/api';
import { useEffect } from 'react';

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      notificationsAPI.getUnreadCount()
        .then(({ data }) => setUnreadCount(data.unread_count))
        .catch(() => {});
    }
  }, [isAuthenticated]);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const dashboardLinks = () => {
    const base = [
      { to: '/dashboard', label: 'Tableau de bord' },
      { to: '/dashboard/messages', label: 'Messages' },
      { to: '/dashboard/profile', label: 'Mon profil' },
    ];
    if (user?.role === 'prestataire') {
      return [
        ...base,
        { to: '/dashboard/ads', label: 'Mes annonces' },
        { to: '/dashboard/quotes/received', label: 'Demandes reçues' },
        { to: '/dashboard/reviews', label: 'Mes avis' },
      ];
    }
    if (user?.role === 'proprietaire') {
      return [
        ...base,
        { to: '/dashboard/quotes', label: 'Mes demandes' },
        { to: '/dashboard/favorites', label: 'Favoris' },
      ];
    }
    if (user?.role === 'customer_service') {
      return [
        ...base,
        { to: '/dashboard/cs/users', label: 'Utilisateurs' },
        { to: '/dashboard/cs/tickets', label: 'Tickets' },
        { to: '/dashboard/cs/ads', label: 'Annonces' },
      ];
    }
    return base;
  };

  return (
    <nav className="bg-dark-900/95 backdrop-blur-md border-b border-dark-700 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2">
              <Zap className="h-8 w-8 text-primary-400" />
              <span className="text-xl font-bold text-white">Big<span className="text-primary-400">Watts</span></span>
            </Link>
            {/* Desktop links */}
            <div className="hidden md:flex ml-10 space-x-6">
              <Link to="/services" className="text-dark-300 hover:text-primary-400 transition font-medium">Services</Link>
              <Link to="/providers" className="text-dark-300 hover:text-primary-400 transition font-medium">Prestataires</Link>
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center space-x-4">
            {isAuthenticated ? (
              <>
                {/* Notifications */}
                <Link to="/dashboard/notifications" className="relative p-2 text-dark-400 hover:text-primary-400 transition">
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-primary-400 text-dark-900 text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </Link>

                {/* Profile dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setProfileOpen(!profileOpen)}
                    className="flex items-center space-x-2 text-dark-300 hover:text-primary-400 transition"
                  >
                    <div className="w-8 h-8 rounded-lg bg-navy-800 border border-dark-600 flex items-center justify-center">
                      <User className="h-4 w-4 text-primary-400" />
                    </div>
                    <span className="hidden md:block text-sm font-medium">{user.first_name || user.username}</span>
                    <ChevronDown className="h-4 w-4" />
                  </button>

                  {profileOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setProfileOpen(false)} />
                      <div className="absolute right-0 mt-2 w-56 bg-dark-800 rounded-lg border border-dark-700 z-20 py-2 shadow-xl">
                        <div className="px-4 py-2 border-b border-dark-700">
                          <p className="text-sm font-medium text-white">{user.first_name} {user.last_name}</p>
                          <p className="text-xs text-dark-400 capitalize">{user.role?.replace('_', ' ')}</p>
                        </div>
                        {dashboardLinks().map((link) => (
                          <Link
                            key={link.to}
                            to={link.to}
                            onClick={() => setProfileOpen(false)}
                            className="block px-4 py-2 text-sm text-dark-300 hover:bg-dark-700 hover:text-primary-400 transition"
                          >
                            {link.label}
                          </Link>
                        ))}
                        <hr className="my-1 border-dark-700" />
                        <button
                          onClick={handleLogout}
                          className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-dark-700 flex items-center space-x-2"
                        >
                          <LogOut className="h-4 w-4" />
                          <span>Déconnexion</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </>
            ) : (
              <div className="hidden md:flex items-center space-x-3">
                <Link to="/login" className="text-dark-300 hover:text-primary-400 font-medium transition">Connexion</Link>
                <Link to="/register" className="bg-primary-400 text-dark-900 px-4 py-2 rounded-lg hover:bg-primary-300 transition font-bold">
                  Inscription
                </Link>
              </div>
            )}

            {/* Mobile menu button */}
            <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden p-2 text-dark-400">
              {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden bg-dark-800 border-t border-dark-700">
          <div className="px-4 py-3 space-y-2">
            <Link to="/services" onClick={() => setMobileOpen(false)} className="block py-2 text-dark-300 hover:text-primary-400">Services</Link>
            <Link to="/providers" onClick={() => setMobileOpen(false)} className="block py-2 text-dark-300 hover:text-primary-400">Prestataires</Link>
            {isAuthenticated ? (
              <>
                {dashboardLinks().map((link) => (
                  <Link key={link.to} to={link.to} onClick={() => setMobileOpen(false)} className="block py-2 text-dark-300 hover:text-primary-400">
                    {link.label}
                  </Link>
                ))}
                <button onClick={handleLogout} className="block py-2 text-red-400">Déconnexion</button>
              </>
            ) : (
              <>
                <Link to="/login" onClick={() => setMobileOpen(false)} className="block py-2 text-dark-300">Connexion</Link>
                <Link to="/register" onClick={() => setMobileOpen(false)} className="block py-2 text-primary-400 font-bold">Inscription</Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
