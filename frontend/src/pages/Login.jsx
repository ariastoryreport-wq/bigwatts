import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAuthModal } from '../components/ui/AuthModal';

/**
 * Login page – opens the auth modal then redirects to home.
 * Kept as a route so /login links still work (bookmarks, external links).
 */
export default function Login() {
  const { isAuthenticated } = useAuth();
  const { openLogin } = useAuthModal();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    } else {
      openLogin('/dashboard');
      navigate('/', { replace: true });
    }
  }, []);

  return null;
}
