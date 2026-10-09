import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bot, Building2, UserPlus, LogOut } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input, Label } from '../components/ui/input';
import { useAuth } from '../context/AuthContext';
import firestoreClient from '../api/firestoreClient';
import { ROLE_LABELS } from '../lib/teams';

// Where someone starts an organization (and becomes its admin) or answers an
// invite to join one. Shown to people who are in no organization yet, and to
// anyone adding another organization to the account they already have.
export function Onboarding() {
  const navigate = useNavigate();
  const { user, org, organizations, logout, createOrganization, requestToJoin, invite, dismissInvite } = useAuth();
  const [name, setName] = useState('');
  const [inviteOrgName, setInviteOrgName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const hasOrganizations = organizations.length > 0;

  // Say which organization the invite is for
  useEffect(() => {
    let cancelled = false;
    setInviteOrgName('');
    if (invite) {
      firestoreClient.getById('orgs', invite.org)
        .then((found) => { if (!cancelled) setInviteOrgName(found?.name || ''); })
        .catch(() => {});
    }
    return () => { cancelled = true; };
  }, [invite]);

  const run = async (action) => {
    setBusy(true);
    setError('');
    try {
      await action();
      navigate('/');
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  const handleCreate = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    run(() => createOrganization(name));
  };

  const handleJoin = () => run(() => requestToJoin(invite));

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-accent-50 dark:from-surface-950 dark:via-surface-900 dark:to-surface-950 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900">
            <Bot className="h-8 w-8 text-primary-600 dark:text-primary-400" />
          </div>
          <CardTitle className="text-2xl">{hasOrganizations ? 'Add an organization' : 'Welcome'}</CardTitle>
          <CardDescription>Signed in as {user?.email}</CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
              {error}
            </div>
          )}

          {invite && (
            <div className="space-y-3 rounded-lg bg-primary-50 p-4 dark:bg-primary-900/30">
              <div className="flex items-start gap-2 text-sm text-primary-800 dark:text-primary-200">
                <UserPlus className="h-5 w-5 flex-shrink-0" />
                <p>
                  You opened an invite to join {inviteOrgName ? <strong>{inviteOrgName}</strong> : 'an organization'} as
                  a {ROLE_LABELS[invite.role].toLowerCase()}
                  {invite.teams.length > 0 && ` on ${invite.teams.join(', ')}`}.
                </p>
              </div>
              <Button className="w-full" disabled={busy} onClick={handleJoin}>
                Ask to join
              </Button>
              <button
                type="button"
                className="w-full text-center text-xs text-surface-500 hover:underline"
                onClick={dismissInvite}
              >
                Ignore this invite
              </button>
            </div>
          )}

          <form onSubmit={handleCreate} className="space-y-3">
            <div className="flex items-center gap-2 font-medium text-surface-900 dark:text-surface-100">
              <Building2 className="h-4 w-4" />
              Start a new organization
            </div>
            <p className="text-sm text-surface-500">
              For your club, school or program. You'll be its admin: you add the teams and approve
              the students and mentors who join.
            </p>
            <div className="space-y-2">
              <Label htmlFor="org-name">Organization name</Label>
              <Input
                id="org-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Maple Valley Robotics"
                maxLength={80}
                required
              />
            </div>
            <Button type="submit" variant={invite ? 'outline' : 'default'} className="w-full" disabled={busy}>
              Create organization
            </Button>
          </form>

          {!invite && (
            <p className="text-center text-sm text-surface-500">
              Joining a group that already exists? Ask its admin for an invite link and open it.
              {hasOrganizations && ' You keep the organizations you already have.'}
            </p>
          )}

          {hasOrganizations && !invite && (
            <Button variant="outline" className="w-full gap-2" disabled={busy} onClick={() => navigate('/')}>
              <ArrowLeft className="h-4 w-4" />
              Back{org?.name ? ` to ${org.name}` : ''}
            </Button>
          )}

          <Button variant="ghost" className="w-full gap-2" disabled={busy} onClick={logout}>
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default Onboarding;
