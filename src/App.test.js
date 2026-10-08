import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import { setOrgScope } from './api/firestoreClient';

const KEY = 'robotics_team_';
const seed = (collection, docs) => localStorage.setItem(KEY + collection, JSON.stringify(docs));
const stored = (collection) => JSON.parse(localStorage.getItem(KEY + collection) || '[]');

// A signed-in demo account that is the admin of "Home Club"
const signedIn = ({ orgs = ['home'] } = {}) => {
  localStorage.setItem('demo_session', 'true');
  seed('users', [{ id: 'demo-user', email: 'demo@example.com', orgs }]);
  seed('orgs', [
    { id: 'home', name: 'Home Club', teams: [], created_by: 'demo-user' },
    { id: 'eagle', name: 'Eagle Works', teams: [{ name: 'Talons', category: 'FRC' }], created_by: 'someone-else' },
  ]);
  seed('orgs/home/members', [{ id: 'demo-user', email: 'demo@example.com', status: 'active', role: 'admin', team: null, teams: [] }]);
};

const open = (path) => {
  window.history.pushState({}, '', path);
  return render(<App />);
};

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  setOrgScope(null);
  jest.spyOn(console, 'log').mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

test('shows the login page when signed out', async () => {
  open('/');
  expect(await screen.findByText('Robotics Team Dashboard')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument();
});

test('an invite link opened while signed out leads to sign-in and says what it offers', async () => {
  open('/join?org=eagle&invite=mentor&team=Talons');
  expect(await screen.findByText(/invited as a mentor on Talons/i)).toBeInTheDocument();
});

test('a signed-in admin lands on their organization\'s dashboard', async () => {
  signedIn();
  open('/');
  expect(await screen.findByText('Home Club')).toBeInTheDocument();
  expect(screen.getByText("Let's get you set up")).toBeInTheDocument();
  // The page links appear twice: in the bar on wide screens and as a row on phones
  expect(screen.getAllByRole('link', { name: 'Tasks' })).toHaveLength(2);
});

test('an account in no organization is asked to start or join one', async () => {
  signedIn({ orgs: [] });
  open('/');
  expect(await screen.findByText('Start a new organization')).toBeInTheDocument();
  expect(screen.getByText('Welcome')).toBeInTheDocument();
  expect(screen.queryByText("Let's get you set up")).not.toBeInTheDocument();
});

test('an invite link opened while signed in names the organization and keeps the current one', async () => {
  signedIn();
  open('/join?org=eagle&invite=mentor&team=Talons');
  expect(await screen.findByText('Eagle Works')).toBeInTheDocument();
  expect(screen.getByText('Add an organization')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Ask to join' })).toBeInTheDocument();
  // Nothing has been joined just by opening the link
  expect(stored('orgs/eagle/members')).toEqual([]);
});

test('accepting the invite leaves a request and a waiting screen with a way back', async () => {
  signedIn();
  open('/join?org=eagle&invite=mentor&team=Talons');
  await userEvent.click(await screen.findByRole('button', { name: 'Ask to join' }));

  expect(await screen.findByText('Waiting for approval')).toBeInTheDocument();
  expect(screen.getByText(/An admin of Eagle Works needs to approve/)).toBeInTheDocument();
  expect(stored('orgs/eagle/members')[0]).toMatchObject({ status: 'pending', role: null, requested_role: 'mentor' });

  await userEvent.click(screen.getByRole('button', { name: /Home Club/ }));
  expect(await screen.findByText("Let's get you set up")).toBeInTheDocument();
});

test('ignoring the invite goes back to the dashboard without joining', async () => {
  signedIn();
  open('/join?org=eagle&invite=mentor');
  await userEvent.click(await screen.findByRole('button', { name: 'Ignore this invite' }));

  expect(await screen.findByText("Let's get you set up")).toBeInTheDocument();
  expect(stored('orgs/eagle/members')).toEqual([]);
  expect(stored('users')[0].orgs).toEqual(['home']);
});

test('the People page is for admins only', async () => {
  signedIn({ orgs: ['eagle'] });
  seed('orgs/eagle/members', [{ id: 'demo-user', email: 'demo@example.com', status: 'active', role: 'mentor', team: null, teams: ['Talons'] }]);
  open('/users');
  // A mentor is sent to the dashboard instead
  expect(await screen.findByText('Eagle Works')).toBeInTheDocument();
  expect(screen.queryByText('Invite link')).not.toBeInTheDocument();
});

test('an admin sees their people and the invite link on the People page', async () => {
  signedIn();
  open('/users');
  expect(await screen.findByText('Invite link')).toBeInTheDocument();
  expect(await screen.findByText('(you)')).toBeInTheDocument();
});

test('starting another organization from inside the app switches to it', async () => {
  signedIn();
  open('/organizations/new');
  await userEvent.type(await screen.findByLabelText('Organization name'), 'Alta Robotics');
  await userEvent.click(screen.getByRole('button', { name: 'Create organization' }));

  expect(await screen.findByText('Alta Robotics')).toBeInTheDocument();
  expect(stored('users')[0].orgs).toHaveLength(2);
  expect(stored('orgs').find(o => o.name === 'Alta Robotics').created_by).toBe('demo-user');
});
