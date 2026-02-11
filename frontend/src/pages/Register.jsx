import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAuthModal } from '../components/ui/AuthModal';

/**
 * Register page – opens the auth modal on Register tab then redirects to home.
 * Kept as a route so /register links still work.
 */
export default function Register() {
  const { isAuthenticated } = useAuth();
  const { openRegister } = useAuthModal();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    } else {
      openRegister('/dashboard');
      navigate('/', { replace: true });
    }
  }, []);

  return null;
}
