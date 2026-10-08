import { useEffect, useMemo } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { parseInvite, saveInvite } from '../lib/teams';

// Landing page for invite links. It remembers the invite and hands off:
// new people go to sign-up, signed-in people to the screen that asks to join.
export function Join() {
  const [searchParams] = useSearchParams();
  const invite = useMemo(() => parseInvite(searchParams), [searchParams]);
  const { isAuthenticated, loading, user } = useAuth();

  // Someone already in an organization keeps it; the invite is not stored for them
  const alreadyPlaced = isAuthenticated && !!user?.org_id;

  useEffect(() => {
    if (invite && !loading && !alreadyPlaced) saveInvite(invite);
  }, [invite, loading, alreadyPlaced]);

  if (loading) return null;
  return <Navigate to={isAuthenticated ? '/' : '/login'} replace />;
}

export default Join;
