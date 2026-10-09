import React, { useState } from 'react';
import { UserCog, Check, Copy, Link2, Building2, Plus, X } from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { AppHeader, PageHeading } from '../components/layout/AppHeader';
import { useAuth } from '../context/AuthContext';
import { useUsers, useUpdateUser } from '../hooks/useUsers';
import { useTeams } from '../hooks/useTeams';
import { CATEGORIES, MONEY_AUDIENCES, ROLE_LABELS, buildInviteLink } from '../lib/teams';

const selectClass =
  'w-full rounded-md border border-surface-300 bg-white px-2 py-1.5 text-sm text-surface-900 focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:opacity-50 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100';

function TeamCheckboxes({ selected, onChange, disabled }) {
  const { teamNames: TEAMS } = useTeams();
  const toggle = (team) => {
    onChange(selected.includes(team) ? selected.filter(t => t !== team) : [...selected, team]);
  };

  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1">
      {TEAMS.length === 0 && <p className="py-1.5 text-sm text-surface-500">Add teams above first</p>}
      {TEAMS.map((team) => (
        <label key={team} className="flex items-center gap-1.5 text-sm text-surface-700 dark:text-surface-300">
          <input
            type="checkbox"
            checked={selected.includes(team)}
            disabled={disabled}
            onChange={() => toggle(team)}
          />
          {team}
        </label>
      ))}
    </div>
  );
}

// Students are on exactly one team; mentors can be on several
function TeamPicker({ role, teams, onChange, disabled }) {
  const { teamNames: TEAMS } = useTeams();
  if (role === 'member') {
    return (
      <select
        className={selectClass}
        value={teams[0] || ''}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value ? [e.target.value] : [])}
      >
        <option value="">No team</option>
        {TEAMS.map((t) => (
          <option key={t} value={t}>{t}</option>
        ))}
      </select>
    );
  }
  return <TeamCheckboxes selected={teams} onChange={onChange} disabled={disabled} />;
}

// How a role and its teams are stored: the security rules read a student's
// single `team`, while a mentor's list lives in `teams`.
function teamFields(role, teams) {
  if (role === 'member') return { team: teams[0] || null, teams: [] };
  if (role === 'mentor') return { team: null, teams };
  return { team: null, teams: [] };
}

function teamsOf(member) {
  if (member.role === 'member') return [member.team].filter(Boolean);
  return Array.isArray(member.teams) ? member.teams : [];
}

// Organization name and its list of teams
function OrganizationSettings() {
  const { org, updateOrganization } = useAuth();
  const [name, setName] = useState(org.name);
  const [newTeam, setNewTeam] = useState('');
  const [newCategory, setNewCategory] = useState(CATEGORIES[0]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const save = async (data) => {
    setBusy(true);
    setError('');
    try {
      await updateOrganization(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const addTeam = async (e) => {
    e.preventDefault();
    const teamName = newTeam.trim();
    if (!teamName) return;
    if (org.teams.some(t => t.name.toLowerCase() === teamName.toLowerCase())) {
      setError('There is already a team with that name.');
      return;
    }
    await save({ teams: [...org.teams, { name: teamName, category: newCategory }] });
    setNewTeam('');
  };

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <div className="flex items-center gap-2 font-medium text-surface-900 dark:text-surface-100">
          <Building2 className="h-4 w-4" />
          Organization
        </div>

        <div className="flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            className={selectClass}
            aria-label="Organization name"
          />
          <Button
            variant="outline"
            className="flex-shrink-0"
            disabled={busy || !name.trim() || name.trim() === org.name}
            onClick={() => save({ name: name.trim() })}
          >
            Rename
          </Button>
        </div>

        <div className="space-y-2">
          <p className="text-xs text-surface-500">Teams</p>
          {org.teams.length === 0 && (
            <p className="text-sm text-surface-500">No teams yet. Add your first one below.</p>
          )}
          {org.teams.map((t) => (
            <div key={t.name} className="flex items-center justify-between gap-2 rounded-md border border-surface-200 px-3 py-1.5 text-sm dark:border-surface-700">
              <span className="truncate text-surface-900 dark:text-surface-100">{t.name}</span>
              <span className="flex items-center gap-2">
                <Badge variant={t.category === 'FTC' ? 'ftc' : 'frc'}>{t.category}</Badge>
                <button
                  type="button"
                  disabled={busy}
                  title={`Remove ${t.name}`}
                  aria-label={`Remove ${t.name}`}
                  className="text-surface-400 hover:text-red-500 disabled:opacity-50"
                  onClick={() => save({ teams: org.teams.filter(x => x.name !== t.name) })}
                >
                  <X className="h-4 w-4" />
                </button>
              </span>
            </div>
          ))}
          {org.teams.length > 0 && (
            <p className="text-xs text-surface-500">
              Removing a team hides it from the dashboard. Its tasks are kept and come back if you add the same name again.
            </p>
          )}
        </div>

        <form onSubmit={addTeam} className="flex gap-2">
          <input
            value={newTeam}
            onChange={(e) => setNewTeam(e.target.value)}
            placeholder="New team name"
            maxLength={60}
            className={selectClass}
            aria-label="New team name"
          />
          <select
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            className={selectClass + ' !w-24 flex-shrink-0'}
            aria-label="Program"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <Button type="submit" className="gap-1 flex-shrink-0" disabled={busy || !newTeam.trim()}>
            <Plus className="h-4 w-4" />
            Add
          </Button>
        </form>

        <label className="block space-y-1 text-xs text-surface-500">
          Who can see sponsors, expenses and the budget
          <select
            className={selectClass}
            value={org.finance_visibility || 'admins'}
            disabled={busy}
            onChange={(e) => save({ finance_visibility: e.target.value })}
          >
            {Object.entries(MONEY_AUDIENCES).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <span className="block">Only admins can add or change them, whoever can see them.</span>
        </label>

        {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
      </CardContent>
    </Card>
  );
}

function InviteLink() {
  const { org } = useAuth();
  const [role, setRole] = useState('member');
  const [teams, setTeams] = useState([]);
  const [copied, setCopied] = useState(false);

  const link = buildInviteLink(org.id, role, role === 'member' ? teams.slice(0, 1) : teams);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      // Clipboard can be blocked; the link is still shown to copy by hand
    }
  };

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center gap-2 font-medium text-surface-900 dark:text-surface-100">
          <Link2 className="h-4 w-4" />
          Invite link
        </div>
        <p className="text-sm text-surface-500">
          Share this link with students or mentors. They sign up with it and show up below,
          ready for you to approve with the role and team already filled in.
        </p>

        <div className="grid gap-3 sm:grid-cols-3">
          <label className="space-y-1 text-xs text-surface-500">
            Invite as
            <select
              className={selectClass}
              value={role}
              onChange={(e) => { setRole(e.target.value); setTeams([]); }}
            >
              <option value="member">{ROLE_LABELS.member}</option>
              <option value="mentor">{ROLE_LABELS.mentor}</option>
            </select>
          </label>
          <div className="space-y-1 text-xs text-surface-500 sm:col-span-2">
            {role === 'member' ? 'Team' : 'Teams'}
            <TeamPicker role={role} teams={teams} onChange={setTeams} />
          </div>
        </div>

        <div className="flex gap-2">
          <input
            readOnly
            value={link}
            onFocus={(e) => e.target.select()}
            className={selectClass}
            aria-label="Invite link"
          />
          <Button variant="outline" className="gap-2 flex-shrink-0" onClick={copy}>
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Copied' : 'Copy'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function UserRow({ member, isSelf }) {
  const updateUser = useUpdateUser();
  const { teamNames } = useTeams();
  const [error, setError] = useState('');

  const save = async (data) => {
    setError('');
    try {
      await updateUser.mutateAsync({ id: member.id, data });
    } catch (err) {
      setError(err.message);
    }
  };

  const isPending = member.status !== 'active';
  // Admins cannot edit their own row, so nobody can lock themselves out
  const disabled = isSelf || updateUser.isPending;

  // Until an admin sets a role, show what the invite link offered
  // An invite link can carry any text, so keep only teams that really exist here
  const requestedTeams = (Array.isArray(member.requested_teams) ? member.requested_teams : [])
    .filter(t => teamNames.includes(t));
  const role = member.role || (isPending ? member.requested_role : null) || '';
  const teams = member.role ? teamsOf(member) : (isPending ? requestedTeams : []);
  const fromInvite = isPending && !member.role && !!member.requested_role;

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-medium text-surface-900 dark:text-surface-100">
              {member.displayName || member.email}
              {isSelf && <span className="ml-2 text-xs text-surface-500">(you)</span>}
            </p>
            <p className="truncate text-sm text-surface-500">{member.email}</p>
          </div>
          <Badge variant={isPending ? 'pending' : 'completed'}>
            {isPending ? 'Pending' : 'Active'}
          </Badge>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <label className="space-y-1 text-xs text-surface-500">
            Role
            <select
              className={selectClass}
              value={role}
              disabled={disabled}
              onChange={(e) => save({ role: e.target.value || null, ...teamFields(e.target.value, teams) })}
            >
              <option value="">No role</option>
              {Object.entries(ROLE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>

          <div className="space-y-1 text-xs text-surface-500 sm:col-span-2">
            {role === 'mentor' ? 'Teams' : 'Team'}
            {role === 'member' || role === 'mentor' ? (
              <TeamPicker
                role={role}
                teams={teams}
                disabled={disabled}
                onChange={(next) => save({ role, ...teamFields(role, next) })}
              />
            ) : (
              <p className="py-1.5 text-sm text-surface-500">
                {role === 'admin' ? 'Admins see every team' : 'Pick a role first'}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-surface-500">
            {fromInvite && 'Filled in from their invite link.'}
            {isPending && !role && 'Pick a role before approving.'}
            {role === 'member' && teams.length === 0 && 'Students can only edit their own team\'s tasks, so pick a team.'}
          </p>
          {isPending ? (
            <Button
              className="gap-2 flex-shrink-0"
              disabled={disabled || !role}
              onClick={() => save({ status: 'active', role, ...teamFields(role, teams) })}
            >
              <Check className="h-4 w-4" />
              Approve
            </Button>
          ) : (
            <Button
              variant="outline"
              className="flex-shrink-0"
              disabled={disabled}
              onClick={() => save({ status: 'pending' })}
            >
              Suspend
            </Button>
          )}
        </div>

        {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
      </CardContent>
    </Card>
  );
}

export function Users() {
  const { user } = useAuth();
  const { data: members = [], isLoading, error } = useUsers();

  // Pending accounts first, then by name
  const sorted = [...members].sort((a, b) => {
    const pendingDiff = (a.status === 'active') - (b.status === 'active');
    if (pendingDiff !== 0) return pendingDiff;
    return (a.displayName || a.email || '').localeCompare(b.displayName || b.email || '');
  });
  const pendingCount = members.filter((m) => m.status !== 'active').length;

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-950">
      <AppHeader />

      <main className="mx-auto max-w-3xl space-y-3 px-4 py-6 sm:px-6">
        <PageHeading
          icon={UserCog}
          title="People"
          subtitle={pendingCount > 0 ? `${pendingCount} waiting for approval` : 'Approve accounts and set roles'}
        />
        <OrganizationSettings />
        <InviteLink />

        {isLoading && <p className="text-center text-surface-500">Loading...</p>}
        {error && (
          <p className="text-center text-red-600 dark:text-red-400">Could not load people: {error.message}</p>
        )}
        {!isLoading && !error && sorted.length === 0 && (
          <p className="text-center text-surface-500">Nobody has joined yet.</p>
        )}
        {sorted.map((member) => (
          <UserRow key={member.id} member={member} isSelf={member.id === user?.uid} />
        ))}
      </main>
    </div>
  );
}

export default Users;
