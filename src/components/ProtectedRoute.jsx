import { useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
const CANDIDATE_IDLE_MS = 15 * 60 * 1000;
export default function ProtectedRoute({ allowed, children }) {
  const { session, logout } = useAuth(); const navigate = useNavigate();
  useEffect(() => {
    if (session?.type !== 'CANDIDATE') return undefined;
    let timer; const reset = () => { clearTimeout(timer); timer = setTimeout(async () => { await logout(); navigate('/candidate-login', { replace: true, state: { message: 'You were logged out after 15 minutes of inactivity. Your saved draft is safe.' } }); }, CANDIDATE_IDLE_MS); };
    const events = ['click', 'keydown', 'pointerdown', 'touchstart', 'scroll']; events.forEach((event) => window.addEventListener(event, reset, { passive: true })); reset();
    return () => { clearTimeout(timer); events.forEach((event) => window.removeEventListener(event, reset)); };
  }, [session?.type, logout, navigate]);
  if (!session) return <Navigate to="/" replace />;
  if (allowed && !allowed.includes(session.type)) return <Navigate to={session.type === 'CANDIDATE' ? '/candidate-welcome' : '/dashboard'} replace />;
  return children;
}
