import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard, FileText, MessageSquare, Star, Heart,
  ClipboardList, Users, LifeBuoy, Bell, User, Megaphone,
  BarChart3, Calendar, Briefcase, CalendarDays, CreditCard, Flag, ShieldCheck
} from 'lucide-react';

export default function DashboardLayout({ children }) {
  const { user } = useAuth();

  const links = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Tableau de bord', roles: ['prestataire', 'proprietaire', 'customer_service'] },
    { to: '/dashboard/profile', icon: User, label: 'Mon profil', roles: ['prestataire', 'proprietaire', 'customer_service'] },
    { to: '/dashboard/messages', icon: MessageSquare, label: 'Messages', roles: ['prestataire', 'proprietaire'] },
    { to: '/dashboard/notifications', icon: Bell, label: 'Notifications', roles: ['prestataire', 'proprietaire', 'customer_service'] },

    // Prestataire
    { to: '/dashboard/ads', icon: Megaphone, label: 'Mes annonces', roles: ['prestataire'] },
    { to: '/dashboard/quotes/received', icon: ClipboardList, label: 'Demandes reçues', roles: ['prestataire'] },
    { to: '/dashboard/bookings', icon: Briefcase, label: 'Réservations', roles: ['prestataire', 'proprietaire'] },
    { to: '/dashboard/availability', icon: CalendarDays, label: 'Disponibilités', roles: ['prestataire'] },
    { to: '/dashboard/documents', icon: ShieldCheck, label: 'Documents', roles: ['prestataire'] },
    { to: '/dashboard/reviews', icon: Star, label: 'Mes avis', roles: ['prestataire'] },
    // Propriétaire
    { to: '/dashboard/quotes', icon: FileText, label: 'Mes demandes', roles: ['proprietaire'] },
    { to: '/dashboard/favorites', icon: Heart, label: 'Favoris', roles: ['proprietaire'] },
    // CS
    { to: '/dashboard/cs/users', icon: Users, label: 'Utilisateurs', roles: ['customer_service'] },
    { to: '/dashboard/cs/tickets', icon: LifeBuoy, label: 'Tickets', roles: ['customer_service'] },
    { to: '/dashboard/cs/ads', icon: Megaphone, label: 'Annonces', roles: ['customer_service'] },
    { to: '/dashboard/cs/reports', icon: Flag, label: 'Signalements', roles: ['customer_service'] },
    // Tickets (all)
    { to: '/dashboard/tickets', icon: LifeBuoy, label: 'Support', roles: ['prestataire', 'proprietaire'] },
  ];

  const filtered = links.filter(l => l.roles.includes(user?.role));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar */}
        <aside className="w-full md:w-64 shrink-0">
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4 shadow-card">
            <div className="mb-4 pb-4 border-b border-gray-200 dark:border-gray-800">
              <p className="font-semibold text-black dark:text-white">{user?.first_name} {user?.last_name}</p>
              <p className="text-sm text-gray-500 capitalize">{user?.role?.replace('_', ' ')}</p>
            </div>
            <nav className="space-y-1">
              {filtered.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.to === '/dashboard'}
                  className={({ isActive }) =>
                    `flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                      isActive
                        ? 'bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-800'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-black dark:hover:text-white'
                    }`
                  }
                >
                  <link.icon className="h-4 w-4" />
                  <span>{link.label}</span>
                </NavLink>
              ))}
            </nav>
          </div>
        </aside>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {children}
        </div>
      </div>
    </div>
  );
}
