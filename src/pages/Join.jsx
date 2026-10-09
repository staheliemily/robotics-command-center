import { useEffect, useMemo } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { parseInvite } from '../lib/teams';

// Landing page for invite links. It remembers the invite and hands off:
// new people go to sign-up, signed-in people to the screen that asks to join.
export function Join() {
  const [searchParams] = useSearchParams();
  const invite = useMemo(() => parseInvite(searchParams), [searchParams]);
  const { isAuthenticated, loading, organizations, offerInvite, switchOrganization } = useAuth();

  useEffect(() => {
    if (!invite || loading) return;
    // Already in that organization (or already asked): just show it
    if (isAuthenticated && organizations.some(o => o.id === invite.org)) switchOrganization(invite.org);
    else offerInvite(invite);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invite, loading]);

  if (loading) return null;
  return <Navigate to={isAuthenticated ? '/' : '/login'} replace />;
}

export default Join;
