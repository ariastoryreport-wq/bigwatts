import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard, FileText, MessageSquare, Star, Heart,
  ClipboardList, Users, LifeBuoy, Bell, User, Megaphone
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
    { to: '/dashboard/reviews', icon: Star, label: 'Mes avis', roles: ['prestataire'] },
    // Propriétaire
    { to: '/dashboard/quotes', icon: FileText, label: 'Mes demandes', roles: ['proprietaire'] },
    { to: '/dashboard/favorites', icon: Heart, label: 'Favoris', roles: ['proprietaire'] },
    // CS
    { to: '/dashboard/cs/users', icon: Users, label: 'Utilisateurs', roles: ['customer_service'] },
    { to: '/dashboard/cs/tickets', icon: LifeBuoy, label: 'Tickets', roles: ['customer_service'] },
    { to: '/dashboard/cs/ads', icon: Megaphone, label: 'Annonces', roles: ['customer_service'] },
    // Tickets (all)
    { to: '/dashboard/tickets', icon: LifeBuoy, label: 'Support', roles: ['prestataire', 'proprietaire'] },
  ];

  const filtered = links.filter(l => l.roles.includes(user?.role));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar */}
        <aside className="w-full md:w-64 shrink-0">
          <div className="bg-dark-800 rounded-lg border border-dark-700 p-4">
            <div className="mb-4 pb-4 border-b border-dark-700">
              <p className="font-semibold text-white">{user?.first_name} {user?.last_name}</p>
              <p className="text-sm text-dark-400 capitalize">{user?.role?.replace('_', ' ')}</p>
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
                        ? 'bg-primary-400/10 text-primary-400 border border-primary-400/20'
                        : 'text-dark-300 hover:bg-dark-700 hover:text-white'
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
