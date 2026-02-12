import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { useAuthModal } from './components/ui/AuthModal';
import { useEffect } from 'react';

// Layout
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';

// Public pages
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import AdList from './pages/AdList';
import AdDetail from './pages/AdDetail';
import ProviderList from './pages/ProviderList';
import ProviderDetail from './pages/ProviderDetail';
import MapView from './pages/MapView';
import IncentiveChecker from './pages/IncentiveChecker';
import IncentiveResults from './pages/IncentiveResults';

// Dashboard
import Dashboard from './pages/dashboard/Dashboard';
import Onboarding from './pages/dashboard/Onboarding';
import MyAds from './pages/dashboard/MyAds';
import AdForm from './pages/dashboard/AdForm';
import MyQuotes from './pages/dashboard/MyQuotes';
import Favorites from './pages/dashboard/Favorites';
import MyReviews from './pages/dashboard/MyReviews';
import Notifications from './pages/dashboard/Notifications';
import Profile from './pages/dashboard/Profile';
import MyTickets from './pages/dashboard/MyTickets';
import Analytics from './pages/dashboard/Analytics';
import Appointments from './pages/dashboard/Appointments';
import Availability from './pages/dashboard/Availability';
import Documents from './pages/dashboard/Documents';

// CS pages
import CSUsers from './pages/dashboard/cs/CSUsers';
import CSTickets from './pages/dashboard/cs/CSTickets';
import CSAds from './pages/dashboard/cs/CSAds';
import CSReports from './pages/dashboard/cs/CSReports';
import CSCertifications from './pages/dashboard/cs/CSCertifications';

function ProtectedRoute({ children, roles }) {
  const { isAuthenticated, user, loading } = useAuth();
  const { openLogin } = useAuthModal();

  useEffect(() => {
    if (!loading && !isAuthenticated) openLogin();
  }, [loading, isAuthenticated]);

  if (loading) return <div className="flex items-center justify-center h-screen"><Spinner /></div>;
  if (!isAuthenticated) return <Navigate to="/" />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" />;
  return children;
}

function Spinner() {
  return (
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-300"></div>
  );
}

export default function App() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <Routes>
          {/* Public */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/services" element={<AdList />} />
          <Route path="/services/:id" element={<AdDetail />} />
          <Route path="/providers" element={<ProviderList />} />
          <Route path="/providers/:id" element={<ProviderDetail />} />
          <Route path="/map" element={<MapView />} />
          <Route path="/incentives" element={<IncentiveChecker />} />
          <Route path="/incentives/results" element={<IncentiveResults />} />

          {/* Dashboard - All authenticated */}
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/dashboard/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />

          <Route path="/dashboard/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
          <Route path="/dashboard/tickets" element={<ProtectedRoute><MyTickets /></ProtectedRoute>} />
          <Route path="/dashboard/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
          <Route path="/dashboard/appointments" element={<ProtectedRoute><Appointments /></ProtectedRoute>} />

          {/* Prestataire */}
          <Route path="/dashboard/onboarding" element={<ProtectedRoute roles={['prestataire']}><Onboarding /></ProtectedRoute>} />
          <Route path="/dashboard/ads" element={<ProtectedRoute roles={['prestataire']}><MyAds /></ProtectedRoute>} />
          <Route path="/dashboard/ads/new" element={<ProtectedRoute roles={['prestataire']}><AdForm /></ProtectedRoute>} />
          <Route path="/dashboard/ads/:id/edit" element={<ProtectedRoute roles={['prestataire']}><AdForm /></ProtectedRoute>} />

          <Route path="/dashboard/reviews" element={<ProtectedRoute roles={['prestataire']}><MyReviews /></ProtectedRoute>} />
          <Route path="/dashboard/availability" element={<ProtectedRoute roles={['prestataire']}><Availability /></ProtectedRoute>} />
          <Route path="/dashboard/documents" element={<ProtectedRoute roles={['prestataire']}><Documents /></ProtectedRoute>} />

          {/* Propriétaire */}
          <Route path="/dashboard/quotes" element={<ProtectedRoute roles={['proprietaire']}><MyQuotes /></ProtectedRoute>} />
          <Route path="/dashboard/favorites" element={<ProtectedRoute roles={['proprietaire']}><Favorites /></ProtectedRoute>} />

          {/* Customer Service */}
          <Route path="/dashboard/cs/users" element={<ProtectedRoute roles={['customer_service']}><CSUsers /></ProtectedRoute>} />
          <Route path="/dashboard/cs/tickets" element={<ProtectedRoute roles={['customer_service']}><CSTickets /></ProtectedRoute>} />
          <Route path="/dashboard/cs/ads" element={<ProtectedRoute roles={['customer_service']}><CSAds /></ProtectedRoute>} />
          <Route path="/dashboard/cs/reports" element={<ProtectedRoute roles={['customer_service']}><CSReports /></ProtectedRoute>} />
          <Route path="/dashboard/cs/certifications" element={<ProtectedRoute roles={['customer_service']}><CSCertifications /></ProtectedRoute>} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}
