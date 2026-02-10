import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

/**
 * Legacy route: /dashboard/messages/:id
 * Redirects to the unified Messages page with the conversation pre-selected.
 */
export default function ConversationView() {
  const { id } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to unified messages page with conv query param
    navigate(`/dashboard/messages?conv=${id}`, { replace: true });
  }, [id, navigate]);

  return null;
}
