// Accounts, organizations and roles, exercised in demo mode (everything in
// the browser). The server-side half of these promises is checked by
// rules-tests/, which runs the real security rules.
import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './AuthContext';
import firestoreClient, { setOrgScope } from '../api/firestoreClient';

const ME = 'demo-user';
const KEY = 'robotics_team_';
const seed = (collection, docs) => localStorage.setItem(KEY + collection, JSON.stringify(docs));
const stored = (collection) => JSON.parse(localStorage.getItem(KEY + collection) || '[]');

// An organization somebody else runs
const seedOtherOrg = (id = 'eagle', name = 'Eagle Works') => {
  seed('orgs', [...stored('orgs'), { id, name, teams: [{ name: 'Talons', category: 'FRC' }], created_by: 'someone-else' }]);
};

// What that organization's admin does when they approve (or change) a person
const adminSets = (orgId, data) => {
  const members = stored(`orgs/${orgId}/members`);
  seed(`orgs/${orgId}/members`, members.map(m => (m.id === ME ? { ...m, ...data } : m)));
};

async function start({ signedIn = true } = {}) {
  const wrapper = ({ children }) => (
    <QueryClientProvider client={new QueryClient()}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  );
  const view = renderHook(() => useAuth(), { wrapper });
  await waitFor(() => expect(view.result.current.loading).toBe(false));
  if (signedIn) await act(() => view.result.current.signInWithEmail('me@x.test', 'anything'));
  return view.result;
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  setOrgScope(null);
  jest.spyOn(console, 'log').mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

describe('signing in', () => {
  test('nobody is signed in to begin with', async () => {
    const auth = await start({ signedIn: false });
    expect(auth.current.isAuthenticated).toBe(false);
    expect(auth.current.user).toBeNull();
    expect(auth.current.org).toBeNull();
    expect(auth.current.isActive).toBe(false);
  });

  test('the demo starts as the admin of one empty organization', async () => {
    const auth = await start();
    expect(auth.current.user).toMatchObject({ uid: ME, email: 'me@x.test', role: 'admin', status: 'active' });
    expect(auth.current.org).toMatchObject({ id: 'demo', name: 'Demo organization', teams: [] });
    expect(auth.current.organizations).toHaveLength(1);
    expect(auth.current.isActive).toBe(true);
    expect(auth.current.isAdmin).toBe(true);
    expect(auth.current.needsOrganization).toBe(false);
  });

  test('signing out clears the account and closes its data', async () => {
    const auth = await start();
    await act(() => auth.current.logout());
    expect(auth.current.isAuthenticated).toBe(false);
    expect(auth.current.organizations).toEqual([]);
    await expect(firestoreClient.getAll('tasks')).rejects.toThrow('No organization selected');
  });

  test('an account in no organization is sent to start or join one', async () => {
    seed('users', [{ id: ME, email: 'me@x.test', orgs: [] }]);
    const auth = await start();
    expect(auth.current.needsOrganization).toBe(true);
    expect(auth.current.org).toBeNull();
    expect(auth.current.isActive).toBe(false);
  });
});

describe('one account in several organizations', () => {
  test('starting another organization makes you its admin and keeps the first', async () => {
    const auth = await start();
    await act(() => auth.current.createOrganization('  Alta Robotics  '));

    expect(auth.current.org.name).toBe('Alta Robotics');
    expect(auth.current.isAdmin).toBe(true);
    expect(auth.current.organizations.map(o => o.name)).toEqual(['Demo organization', 'Alta Robotics']);
    expect(stored('users')[0].orgs).toHaveLength(2);
  });

  test('switching shows that organization\'s data and nothing from the other', async () => {
    const auth = await start();
    await firestoreClient.create('tasks', { title: 'Demo task', team: 'Red' });
    await act(() => auth.current.createOrganization('Alta Robotics'));
    const alta = auth.current.org.id;

    expect(await firestoreClient.getAll('tasks')).toEqual([]);
    await firestoreClient.create('tasks', { title: 'Alta task', team: 'Blue' });

    act(() => auth.current.switchOrganization('demo'));
    expect(auth.current.org.id).toBe('demo');
    expect((await firestoreClient.getAll('tasks')).map(t => t.title)).toEqual(['Demo task']);

    act(() => auth.current.switchOrganization(alta));
    expect((await firestoreClient.getAll('tasks')).map(t => t.title)).toEqual(['Alta task']);
  });

  test('the organization you were last in is the one you come back to', async () => {
    const first = await start();
    await act(() => first.current.createOrganization('Alta Robotics'));
    act(() => first.current.switchOrganization('demo'));

    const again = await start({ signedIn: false });
    await waitFor(() => expect(again.current.org?.id).toBe('demo'));
  });

  test('a role in one organization does not carry into another', async () => {
    seedOtherOrg();
    const auth = await start();
    await act(() => auth.current.requestToJoin({ org: 'eagle', role: 'mentor', teams: ['Talons'] }));
    adminSets('eagle', { status: 'active', role: 'member', team: 'Talons', teams: [] });
    await act(() => auth.current.refreshUser('eagle'));

    // A student in Eagle Works...
    expect(auth.current.org.name).toBe('Eagle Works');
    expect(auth.current.role).toBe('member');
    expect(auth.current.isAdmin).toBe(false);
    expect(auth.current.canEditAnyTask).toBe(false);

    // ...and still the admin back home
    act(() => auth.current.switchOrganization('demo'));
    expect(auth.current.isAdmin).toBe(true);
    expect(auth.current.canEditAnyTask).toBe(true);
  });

  test('the team being viewed is remembered separately for each organization', async () => {
    const auth = await start();
    await act(() => auth.current.updateOrganization({ teams: [{ name: 'Red', category: 'FTC' }, { name: 'Blue', category: 'FTC' }] }));
    act(() => auth.current.setViewTeam('Red'));
    await act(() => auth.current.createOrganization('Alta Robotics'));
    expect(auth.current.viewTeam).toBeNull();

    act(() => auth.current.switchOrganization('demo'));
    expect(auth.current.viewTeam).toBe('Red');
  });
});

describe('joining by invite', () => {
  test('asking to join leaves you waiting, with no access to that organization', async () => {
    seedOtherOrg();
    const auth = await start();
    await act(() => auth.current.requestToJoin({ org: 'eagle', role: 'mentor', teams: ['Talons'] }));

    expect(auth.current.org.name).toBe('Eagle Works');
    expect(auth.current.user.status).toBe('pending');
    expect(auth.current.role).toBeNull();
    expect(auth.current.isActive).toBe(false);
    expect(auth.current.isAdmin).toBe(false);
    expect(auth.current.canContribute).toBe(false);
    await expect(firestoreClient.getAll('tasks')).rejects.toThrow('No organization selected');

    // The request is what the admin sees: no role or team of its own, only what the link offered
    expect(stored('orgs/eagle/members')[0]).toMatchObject({
      id: ME, email: 'me@x.test', status: 'pending', role: null, team: null,
      requested_role: 'mentor', requested_teams: ['Talons'],
    });
    // And the organization they already had is untouched
    expect(auth.current.organizations.map(o => [o.name, o.status])).toEqual([
      ['Demo organization', 'active'], ['Eagle Works', 'pending'],
    ]);
  });

  test('once approved, a mentor gets that organization with the teams they were given', async () => {
    seedOtherOrg();
    const auth = await start();
    await act(() => auth.current.requestToJoin({ org: 'eagle', role: 'mentor', teams: ['Talons'] }));
    adminSets('eagle', { status: 'active', role: 'mentor', teams: ['Talons'] });
    await act(() => auth.current.refreshUser());

    expect(auth.current.isActive).toBe(true);
    expect(auth.current.role).toBe('mentor');
    expect(auth.current.myTeams).toEqual(['Talons']);
    expect(auth.current.viewTeam).toBe('Talons');
    expect(auth.current.canEditAnyTask).toBe(true);
    expect(auth.current.isAdmin).toBe(false);
    expect(await firestoreClient.getAll('tasks')).toEqual([]);
  });

  test('withdrawing a request removes it and returns you to an organization you are in', async () => {
    seedOtherOrg();
    const auth = await start();
    await act(() => auth.current.requestToJoin({ org: 'eagle', role: 'mentor', teams: [] }));
    await act(() => auth.current.cancelJoinRequest());

    expect(stored('orgs/eagle/members')).toEqual([]);
    expect(stored('users')[0].orgs).toEqual(['demo']);
    expect(auth.current.org.id).toBe('demo');
    expect(auth.current.isAdmin).toBe(true);
  });

  test('an invite to an organization you are already in changes nothing', async () => {
    const auth = await start();
    await act(() => auth.current.requestToJoin({ org: 'demo', role: 'member', teams: [] }));

    expect(auth.current.organizations).toHaveLength(1);
    expect(auth.current.role).toBe('admin');
    expect(stored('orgs/demo/members')[0]).toMatchObject({ status: 'active', role: 'admin' });
  });

  test('an invite link opened before signing in is still waiting afterwards', async () => {
    seedOtherOrg();
    sessionStorage.setItem('pending_invite', JSON.stringify({ org: 'eagle', role: 'member', teams: ['Talons'] }));
    const auth = await start();

    expect(auth.current.invite).toEqual({ org: 'eagle', role: 'member', teams: ['Talons'] });
    // Nothing is joined until they say yes
    expect(auth.current.organizations.map(o => o.id)).toEqual(['demo']);
    expect(stored('orgs/eagle/members')).toEqual([]);
  });

  test('an unanswered invite is held until it is accepted or dismissed', async () => {
    seedOtherOrg();
    const auth = await start();
    expect(auth.current.invite).toBeNull();

    act(() => auth.current.offerInvite({ org: 'eagle', role: 'mentor', teams: [] }));
    expect(auth.current.invite).toMatchObject({ org: 'eagle', role: 'mentor' });
    expect(JSON.parse(sessionStorage.getItem('pending_invite'))).toMatchObject({ org: 'eagle' });

    act(() => auth.current.dismissInvite());
    expect(auth.current.invite).toBeNull();
    expect(sessionStorage.getItem('pending_invite')).toBeNull();

    act(() => auth.current.offerInvite({ org: 'eagle', role: 'mentor', teams: [] }));
    await act(() => auth.current.requestToJoin(auth.current.invite));
    expect(auth.current.invite).toBeNull();
    expect(auth.current.org.name).toBe('Eagle Works');
  });
});

describe('what each role may do', () => {
  const asRole = async (data) => {
    seedOtherOrg();
    const auth = await start();
    await act(() => auth.current.requestToJoin({ org: 'eagle', role: 'member', teams: [] }));
    adminSets('eagle', { status: 'active', ...data });
    await act(() => auth.current.refreshUser('eagle'));
    return auth;
  };

  test('a student adds and edits tasks for their own team only', async () => {
    const auth = await asRole({ role: 'member', team: 'Talons' });
    expect(auth.current.myTeams).toEqual(['Talons']);
    expect(auth.current.canCreateTasks).toBe(true);
    expect(auth.current.canCreateTaskFor('Talons')).toBe(true);
    expect(auth.current.canCreateTaskFor('Other')).toBe(false);
    expect(auth.current.canEditTask({ team: 'Talons' })).toBe(true);
    expect(auth.current.canEditTask({ team: 'Other' })).toBe(false);
    expect(auth.current.canEditTask(null)).toBe(false);
    expect(auth.current.canContribute).toBe(true);
    expect(auth.current.isAdmin).toBe(false);
  });

  test('a student with no team cannot add tasks', async () => {
    const auth = await asRole({ role: 'member', team: null });
    expect(auth.current.canCreateTasks).toBe(false);
    expect(auth.current.canCreateTaskFor('Talons')).toBe(false);
  });

  test('a mentor edits every team\'s tasks but is not an admin', async () => {
    const auth = await asRole({ role: 'mentor', teams: ['Talons'] });
    expect(auth.current.canCreateTaskFor('Other')).toBe(true);
    expect(auth.current.canEditTask({ team: 'Other' })).toBe(true);
    expect(auth.current.isAdmin).toBe(false);
  });

  test('someone made an admin of an organization they did not start gets the full admin job', async () => {
    const auth = await asRole({ role: 'admin', team: null, teams: [] });
    expect(auth.current.isAdmin).toBe(true);
    expect(auth.current.canEditAnyTask).toBe(true);
    expect(auth.current.organizations.find(o => o.id === 'eagle').role).toBe('admin');

    await act(() => auth.current.updateOrganization({ name: 'Eagle Works Robotics' }));
    expect(stored('orgs').find(o => o.id === 'eagle').name).toBe('Eagle Works Robotics');
  });

  test('an admin made a mentor again stops being an admin', async () => {
    const auth = await asRole({ role: 'admin' });
    adminSets('eagle', { role: 'mentor', teams: ['Talons'] });
    await act(() => auth.current.refreshUser('eagle'));
    expect(auth.current.isAdmin).toBe(false);
    expect(auth.current.canEditAnyTask).toBe(true);
  });

  test('only admins see the money until the organization opens it up', async () => {
    const mentor = await asRole({ role: 'mentor', teams: ['Talons'] });
    expect(mentor.current.canSeeMoney).toBe(false);

    const openTo = async (finance_visibility) => {
      seed('orgs', stored('orgs').map(o => (o.id === 'eagle' ? { ...o, finance_visibility } : o)));
      await act(() => mentor.current.refreshUser('eagle'));
    };
    await openTo('mentors');
    expect(mentor.current.canSeeMoney).toBe(true);

    // A student still does not, until it is opened to everyone
    adminSets('eagle', { role: 'member', team: 'Talons', teams: [] });
    await act(() => mentor.current.refreshUser('eagle'));
    expect(mentor.current.canSeeMoney).toBe(false);
    await openTo('everyone');
    expect(mentor.current.canSeeMoney).toBe(true);
  });

  test('an admin always sees the money and chooses who else does', async () => {
    const auth = await asRole({ role: 'admin' });
    expect(auth.current.canSeeMoney).toBe(true);
    await act(() => auth.current.updateOrganization({ finance_visibility: 'mentors' }));
    expect(auth.current.org.finance_visibility).toBe('mentors');
    expect(stored('orgs').find(o => o.id === 'eagle').finance_visibility).toBe('mentors');
  });

  test('a suspended member loses access but keeps their place in the list', async () => {
    const auth = await asRole({ role: 'mentor', teams: ['Talons'] });
    adminSets('eagle', { status: 'pending' });
    await act(() => auth.current.refreshUser('eagle'));

    expect(auth.current.isActive).toBe(false);
    expect(auth.current.canEditAnyTask).toBe(false);
    expect(auth.current.canContribute).toBe(false);
    expect(auth.current.organizations.find(o => o.id === 'eagle').status).toBe('pending');
    await expect(firestoreClient.getAll('tasks')).rejects.toThrow('No organization selected');
  });

  test('someone removed from an organization no longer sees it', async () => {
    const auth = await asRole({ role: 'mentor', teams: [] });
    seed('orgs/eagle/members', []);
    await act(() => auth.current.refreshUser());

    expect(auth.current.organizations.map(o => o.id)).toEqual(['demo']);
    expect(auth.current.org.id).toBe('demo');
  });
});

describe('accounts from before memberships existed', () => {
  test('whoever created the organization is its admin again without doing anything', async () => {
    seed('orgs', [{ id: 'old', name: 'Old Club', teams: [], created_by: ME }]);
    seed('users', [{ id: ME, email: 'me@x.test', org_id: 'old', role: 'admin', status: 'active', team: null }]);
    const auth = await start();

    expect(auth.current.org.name).toBe('Old Club');
    expect(auth.current.isAdmin).toBe(true);
    expect(stored('orgs/old/members')[0]).toMatchObject({ id: ME, role: 'admin', status: 'active' });
    expect(stored('users')[0]).toMatchObject({ orgs: ['old'], org_id: null });
  });

  test('anyone else comes back as a request, with their old role offered to the admin', async () => {
    seed('orgs', [{ id: 'old', name: 'Old Club', teams: [], created_by: 'someone-else' }]);
    seed('users', [{ id: ME, email: 'me@x.test', org_id: 'old', role: 'member', status: 'active', team: 'Red' }]);
    const auth = await start();

    expect(auth.current.org.name).toBe('Old Club');
    expect(auth.current.isActive).toBe(false);
    expect(stored('orgs/old/members')[0]).toMatchObject({
      status: 'pending', role: null, team: null, requested_role: 'member', requested_teams: ['Red'],
    });
  });

  test('moving over happens once', async () => {
    seed('orgs', [{ id: 'old', name: 'Old Club', teams: [], created_by: ME }]);
    seed('users', [{ id: ME, email: 'me@x.test', org_id: 'old', role: 'admin', status: 'active', team: null }]);
    const auth = await start();
    await act(() => auth.current.refreshUser());
    await act(() => auth.current.refreshUser());

    expect(stored('orgs/old/members')).toHaveLength(1);
    expect(stored('users')[0].orgs).toEqual(['old']);
  });

  test('an old account pointing at an organization that is gone starts fresh', async () => {
    seed('users', [{ id: ME, email: 'me@x.test', org_id: 'vanished', role: 'admin', status: 'active' }]);
    const auth = await start();
    expect(auth.current.needsOrganization).toBe(true);
    expect(stored('users')[0]).toMatchObject({ orgs: [], org_id: null });
  });
});

describe('running an organization', () => {
  test('renaming and adding teams shows up straight away', async () => {
    const auth = await start();
    await act(() => auth.current.updateOrganization({ name: 'Renamed', teams: [{ name: 'Red', category: 'FTC' }] }));
    expect(auth.current.org).toMatchObject({ name: 'Renamed', teams: [{ name: 'Red', category: 'FTC' }] });
    expect(stored('orgs').find(o => o.id === 'demo').name).toBe('Renamed');
    expect(auth.current.organizations[0].name).toBe('Renamed');
  });

  test('the demo can preview the read-only view', async () => {
    const auth = await start();
    act(() => auth.current.setRole('viewer'));
    const again = await start({ signedIn: false });
    await waitFor(() => expect(again.current.isAuthenticated).toBe(true));
    expect(again.current.role).toBe('viewer');
    expect(again.current.isAdmin).toBe(false);
    expect(again.current.canContribute).toBe(false);
  });
});
