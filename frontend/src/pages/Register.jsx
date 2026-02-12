import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAuthModal } from '../components/ui/AuthModal';

/**
 * Register page – opens the auth modal on Register tab then redirects to home.
 * Kept as a route so /register links still work.
 * Supports ?role=prestataire|proprietaire query param.
 */
export default function Register() {
  const { isAuthenticated } = useAuth();
  const { openRegister } = useAuthModal();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    } else {
      const role = searchParams.get('role') === 'prestataire' ? 'prestataire' : 'proprietaire';
      openRegister('/dashboard', role);
      navigate('/', { replace: true });
    }
  }, []);

  return null;
}
