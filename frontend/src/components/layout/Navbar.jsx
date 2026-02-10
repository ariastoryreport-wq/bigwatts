import { useState, useRef, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Menu, X, Bell, User, LogOut, ChevronDown, Moon, Sun, MessageSquare, Check, FileText, Star, AlertCircle, Settings, Heart } from 'lucide-react';
import { notificationsAPI, messagingAPI } from '../../services/api';
import Logo from '../ui/Logo';

const NOTIF_ICONS = {
  new_message: MessageSquare,
  new_review: Star,
  quote_request: FileText,
  quote_response: FileText,
  ticket_update: AlertCircle,
  system: Settings,
  favorite: Heart,
};

function resolveLink(notification, userRole) {
  const link = notification.link || '';
  const type = notification.notification_type;
  if (link.startsWith('/dashboard/messages/')) return link;
  if (link.startsWith('/dashboard/bookings') || link.includes('booking')) return '/dashboard/bookings';
  if (link.startsWith('/dashboard/quotes/') || type === 'quote_request' || type === 'quote_response') {
    if (userRole === 'proprietaire') return '/dashboard/quotes';
    if (userRole === 'prestataire') return '/dashboard/quotes/received';
    return link;
  }
  if (type === 'new_message') return '/dashboard/messages';
  if (type === 'new_review') {
    if (userRole === 'prestataire') return '/dashboard/reviews';
    return '/dashboard';
  }
  if (type === 'favorite') return '/dashboard/favorites';
  if (type === 'ticket_update') {
    if (userRole === 'customer_service') return '/dashboard/cs/tickets';
    return '/dashboard/tickets';
  }
  if (link) return link;
  return '/dashboard';
}

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const { dark, toggle } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const notifRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) return;
    const fetchCounts = () => {
      notificationsAPI.getUnreadCount()
        .then(({ data }) => setUnreadCount(data.unread_count))
        .catch(() => {});
    };
    fetchCounts();
    const interval = setInterval(fetchCounts, 10000);

    // Heartbeat for online status
    messagingAPI.heartbeat().catch(() => {});
    const hbInterval = setInterval(() => messagingAPI.heartbeat().catch(() => {}), 30000);

    return () => { clearInterval(interval); clearInterval(hbInterval); };
  }, [isAuthenticated]);

  // Fetch notifications when dropdown opens
  const openNotifDropdown = useCallback(() => {
    setNotifOpen(prev => {
      if (!prev) {
        notificationsAPI.getNotifications()
          .then(({ data }) => setNotifications((data.results || data).slice(0, 8)))
          .catch(() => {});
      }
      return !prev;
    });
    setProfileOpen(false);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const markAllRead = async () => {
    await notificationsAPI.markRead([]);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  const handleNotifClick = async (n) => {
    if (!n.is_read) {
      await notificationsAPI.markSingleRead(n.id).catch(() => {});
      setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, is_read: true } : x));
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
    setNotifOpen(false);
    navigate(resolveLink(n, user?.role));
  };

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
        { to: '/dashboard/bookings', label: 'Réservations' },
        { to: '/dashboard/availability', label: 'Disponibilités' },
        { to: '/dashboard/reviews', label: 'Mes avis' },
      ];
    }
    if (user?.role === 'proprietaire') {
      return [
        ...base,
        { to: '/dashboard/quotes', label: 'Mes demandes' },
        { to: '/dashboard/bookings', label: 'Réservations' },
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
    <nav className="bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center">
              <Logo />
            </Link>
            {/* Desktop links */}
            <div className="hidden md:flex ml-10 space-x-6">
              <Link to="/services" className="text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white transition font-medium">Services</Link>
              <Link to="/providers" className="text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white transition font-medium">Prestataires</Link>
              <Link to="/map" className="text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white transition font-medium">Carte</Link>
              <Link to="/incentives" className="text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white transition font-medium">Aides</Link>
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center space-x-3">
            {/* Dark mode toggle */}
            <button
              onClick={toggle}
              className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
              title={dark ? 'Mode clair' : 'Mode sombre'}
            >
              {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>

            {isAuthenticated ? (
              <>
                {/* Notifications dropdown */}
                <div className="relative" ref={notifRef}>
                  <button
                    onClick={openNotifDropdown}
                    className="relative p-2 text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition"
                  >
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-brand-300 text-black text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </button>

                  {notifOpen && (
                    <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 z-30 shadow-2xl overflow-hidden">
                      {/* Header */}
                      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800">
                        <h3 className="text-sm font-bold text-black dark:text-white">Notifications</h3>
                        <div className="flex items-center gap-2">
                          {unreadCount > 0 && (
                            <button
                              onClick={markAllRead}
                              className="text-xs text-brand-600 dark:text-brand-300 hover:underline flex items-center gap-1"
                            >
                              <Check className="h-3 w-3" /> Tout lire
                            </button>
                          )}
                          <Link
                            to="/dashboard/notifications"
                            onClick={() => setNotifOpen(false)}
                            className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                          >
                            <Settings className="h-3.5 w-3.5" />
                          </Link>
                        </div>
                      </div>

                      {/* Notification list */}
                      <div className="max-h-80 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
                        {notifications.length === 0 ? (
                          <div className="px-4 py-8 text-center text-sm text-gray-400">
                            Aucune notification
                          </div>
                        ) : notifications.map((n) => {
                          const Icon = NOTIF_ICONS[n.notification_type] || Bell;
                          return (
                            <button
                              key={n.id}
                              onClick={() => handleNotifClick(n)}
                              className={`w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition ${!n.is_read ? 'bg-brand-50/50 dark:bg-brand-900/10' : ''}`}
                            >
                              <div className={`p-1.5 rounded-full shrink-0 mt-0.5 ${!n.is_read ? 'bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-300' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'}`}>
                                <Icon className="h-3.5 w-3.5" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={`text-xs leading-snug ${!n.is_read ? 'font-semibold text-black dark:text-white' : 'text-gray-600 dark:text-gray-400'}`}>{n.title}</p>
                                <p className="text-xs text-gray-400 truncate mt-0.5">{n.message}</p>
                              </div>
                              <span className="text-[10px] text-gray-400 shrink-0 mt-0.5">
                                {new Date(n.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                              </span>
                              {!n.is_read && <span className="w-2 h-2 rounded-full bg-brand-400 shrink-0 mt-1.5" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Profile dropdown */}
                <div className="relative">
                  <button
                    onClick={() => { setProfileOpen(!profileOpen); setNotifOpen(false); }}
                    className="flex items-center space-x-2 text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white transition"
                  >
                    <div className="w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-900 flex items-center justify-center">
                      <User className="h-4 w-4 text-brand-700 dark:text-brand-300" />
                    </div>
                    <span className="hidden md:block text-sm font-medium">{user.first_name || user.username}</span>
                    <ChevronDown className="h-4 w-4" />
                  </button>

                  {profileOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setProfileOpen(false)} />
                      <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 z-20 py-2 shadow-xl">
                        <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-800">
                          <p className="text-sm font-medium text-black dark:text-white">{user.first_name} {user.last_name}</p>
                          <p className="text-xs text-gray-500 capitalize">{user.role?.replace('_', ' ')}</p>
                        </div>
                        {dashboardLinks().map((link) => (
                          <Link
                            key={link.to}
                            to={link.to}
                            onClick={() => setProfileOpen(false)}
                            className="block px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-black dark:hover:text-white transition"
                          >
                            {link.label}
                          </Link>
                        ))}
                        <hr className="my-1 border-gray-200 dark:border-gray-800" />
                        <button
                          onClick={handleLogout}
                          className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center space-x-2"
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
                <Link to="/login" className="text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white font-medium transition">Connexion</Link>
                <Link to="/register" className="bg-black dark:bg-white text-white dark:text-black px-5 py-2 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 transition font-bold">
                  Inscription
                </Link>
              </div>
            )}

            {/* Mobile menu button */}
            <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden p-2 text-gray-500">
              {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden bg-white dark:bg-gray-950 border-t border-gray-200 dark:border-gray-800">
          <div className="px-4 py-3 space-y-2">
            <Link to="/services" onClick={() => setMobileOpen(false)} className="block py-2 text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white">Services</Link>
            <Link to="/providers" onClick={() => setMobileOpen(false)} className="block py-2 text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white">Prestataires</Link>
            <Link to="/map" onClick={() => setMobileOpen(false)} className="block py-2 text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white">Carte</Link>
            <Link to="/incentives" onClick={() => setMobileOpen(false)} className="block py-2 text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white">Aides</Link>
            {isAuthenticated ? (
              <>
                {dashboardLinks().map((link) => (
                  <Link key={link.to} to={link.to} onClick={() => setMobileOpen(false)} className="block py-2 text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white">
                    {link.label}
                  </Link>
                ))}
                <button onClick={handleLogout} className="block py-2 text-red-500">Déconnexion</button>
              </>
            ) : (
              <>
                <Link to="/login" onClick={() => setMobileOpen(false)} className="block py-2 text-gray-600 dark:text-gray-400">Connexion</Link>
                <Link to="/register" onClick={() => setMobileOpen(false)} className="block py-2 font-bold text-black dark:text-white">Inscription</Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
