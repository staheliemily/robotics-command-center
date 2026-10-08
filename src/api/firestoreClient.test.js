// With no Firebase config (as in tests and `npm start`) the client stores
// everything in the browser. These check that it keeps organizations apart.
import firestoreClient, { setOrgScope } from './firestoreClient';

beforeEach(() => {
  localStorage.clear();
  setOrgScope(null);
});

test('team data cannot be touched until an organization is selected', async () => {
  await expect(firestoreClient.getAll('tasks')).rejects.toThrow('No organization selected');
  await expect(firestoreClient.create('tasks', { title: 't' })).rejects.toThrow('No organization selected');
  await expect(firestoreClient.setSetting('k', 1)).rejects.toThrow('No organization selected');
});

test('accounts and organizations are reachable without one', async () => {
  await firestoreClient.setById('users', 'u1', { email: 'a@x.test' });
  await firestoreClient.setById('orgs', 'A', { name: 'Org A' });
  expect(await firestoreClient.getById('users', 'u1')).toMatchObject({ email: 'a@x.test' });
  expect(await firestoreClient.getById('orgs', 'A')).toMatchObject({ name: 'Org A' });
});

test('each organization sees only its own data', async () => {
  setOrgScope('A');
  const task = await firestoreClient.create('tasks', { title: 'A task', team: 'Red' });
  await firestoreClient.setSetting('banner', 'hello from A');

  setOrgScope('B');
  expect(await firestoreClient.getAll('tasks')).toEqual([]);
  expect(await firestoreClient.getById('tasks', task.id)).toBeNull();
  expect(await firestoreClient.getSetting('banner', 'none')).toBe('none');
  expect(await firestoreClient.update('tasks', task.id, { title: 'hijacked' })).toBeNull();
  expect(await firestoreClient.remove('tasks', task.id)).toBe(false);

  setOrgScope('A');
  expect(await firestoreClient.getAll('tasks')).toHaveLength(1);
  expect((await firestoreClient.getById('tasks', task.id)).title).toBe('A task');
  expect(await firestoreClient.getSetting('banner')).toBe('hello from A');
});

test('a full path names its organization regardless of the one selected', async () => {
  setOrgScope('A');
  await firestoreClient.setById('orgs/B/members', 'u1', { role: 'mentor' });
  expect(await firestoreClient.getById('orgs/B/members', 'u1')).toMatchObject({ role: 'mentor' });
  // The selected organization's own members list is a different place
  expect(await firestoreClient.getAll('members')).toEqual([]);
  setOrgScope('B');
  expect(await firestoreClient.getAll('members')).toHaveLength(1);
});

test('setById creates under the given id, then merges into it', async () => {
  await firestoreClient.setById('users', 'u1', { email: 'a@x.test', orgs: ['A'] });
  await firestoreClient.setById('users', 'u1', { orgs: ['A', 'B'] });
  const all = await firestoreClient.query('users');
  expect(all).toHaveLength(1);
  expect(all[0]).toMatchObject({ id: 'u1', email: 'a@x.test', orgs: ['A', 'B'] });
});

test('query filters by field and ignores empty filters', async () => {
  setOrgScope('A');
  await firestoreClient.create('tasks', { title: '1', team: 'Red' });
  await firestoreClient.create('tasks', { title: '2', team: 'Blue' });
  expect(await firestoreClient.query('tasks', { team: 'Red' })).toHaveLength(1);
  expect(await firestoreClient.query('tasks', { team: '' })).toHaveLength(2);
});
