import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  sendEmailVerification,
} from 'firebase/auth';
import { useQueryClient } from '@tanstack/react-query';
import { auth, googleProvider, isFirebaseConfigured } from '../config/firebase';
import firestoreClient, { setOrgScope } from '../api/firestoreClient';
import { peekInvite, saveInvite, takeInvite } from '../lib/teams';

const AuthContext = createContext(undefined);

// Demo user for when Firebase is not configured
const DEMO_ORG_ID = 'demo';
const DEMO_USER = {
  uid: 'demo-user',
  email: 'demo@example.com',
  displayName: 'Demo User',
  emailVerified: true,
};

const VIEW_TEAM_KEY = 'view_team';
const CURRENT_ORG_KEY = 'current_org';

// Roles that may write anything at all; mirrors firestore.rules
const CONTRIBUTOR_ROLES = ['admin', 'mentor', 'member'];

// One account can belong to several organizations. Its place in each one
// (role, teams, approval) is a record under that organization, so each
// organization's admin controls only their own.
const membersOf = (orgId) => `orgs/${orgId}/members`;

async function fetchOrg(orgId) {
  const data = await firestoreClient.getById('orgs', orgId);
  if (!data) return null;
  return {
    id: orgId,
    name: data.name || '',
    teams: Array.isArray(data.teams) ? data.teams : [],
    created_by: data.created_by || null,
  };
}

// Load this account's membership in each organization it lists. One that has
// gone away (organization deleted, or the person removed) is skipped.
async function fetchMemberships(uid, orgIds) {
  const loaded = await Promise.all(orgIds.map(async (orgId) => {
    try {
      const [org, member] = await Promise.all([
        fetchOrg(orgId),
        firestoreClient.getById(membersOf(orgId), uid),
      ]);
      if (!org || !member) return null;
      return {
        org,
        role: member.role || null,
        team: member.team || null,
        // Mentors can be on several teams; students have the single `team` above
        teams: Array.isArray(member.teams) ? member.teams : [],
        status: member.status || 'pending',
      };
    } catch (err) {
      console.error(`Error loading membership in ${orgId}:`, err);
      return null;
    }
  }));
  return loaded.filter(Boolean);
}

const identity = (base) => ({ uid: base.uid, email: base.email, displayName: base.displayName });

async function rememberOrg(uid, orgId) {
  const profile = await firestoreClient.getById('users', uid);
  const orgs = Array.isArray(profile?.orgs) ? profile.orgs : [];
  if (!orgs.includes(orgId)) await firestoreClient.setById('users', uid, { orgs: [...orgs, orgId] });
}

// Ask to join an organization. It grants nothing until one of its admins approves.
async function createJoinRequest(base, invite) {
  await firestoreClient.setById(membersOf(invite.org), base.uid, {
    ...identity(base),
    status: 'pending',
    role: null,
    team: null,
    teams: [],
    requested_role: invite.role || null,
    requested_teams: invite.teams || [],
    created_at: new Date().toISOString(),
  });
  await rememberOrg(base.uid, invite.org);
}

// Accounts used to hold a single organization on the account itself. Move
// that over: whoever created the organization is its admin again straight
// away; anyone else comes back as a request for the admin to approve once.
async function migrateLegacyMembership(base, profile) {
  const orgId = profile.org_id;
  if (!orgId) return;
  try {
    const org = await fetchOrg(orgId);
    if (org && !(await firestoreClient.getById(membersOf(orgId), base.uid))) {
      if (org.created_by === base.uid) {
        // The rules need a verified email for this; try again next sign-in
        if (!base.emailVerified) return;
        await firestoreClient.setById(membersOf(orgId), base.uid, {
          ...identity(base), status: 'active', role: 'admin', team: null, teams: [],
        });
      } else {
        const hadTeams = profile.role === 'member' ? [profile.team].filter(Boolean) : profile.teams;
        await createJoinRequest(base, {
          org: orgId,
          role: profile.role || profile.requested_role || null,
          teams: (Array.isArray(hadTeams) && hadTeams.length ? hadTeams : profile.requested_teams) || [],
        });
      }
    }
    const orgs = Array.isArray(profile.orgs) ? profile.orgs : [];
    await firestoreClient.setById('users', base.uid, {
      orgs: org && !orgs.includes(orgId) ? [...orgs, orgId] : orgs,
      org_id: null,
    });
  } catch (err) {
    console.error('Error moving membership over:', err);
  }
}

// The link in the verification email should open on our own address rather
// than Firebase's built-in one. If Firebase refuses the custom address, send
// the plain email so nobody is left unable to verify.
async function sendVerification(firebaseUser) {
  const { hostname, origin } = window.location;
  const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';
  if (isLocal) return sendEmailVerification(firebaseUser);
  try {
    await sendEmailVerification(firebaseUser, { url: `${origin}/`, linkDomain: hostname });
  } catch (err) {
    if (err?.code === 'auth/too-many-requests') throw err;
    await sendEmailVerification(firebaseUser);
  }
}

export function AuthProvider({ children }) {
  const queryClient = useQueryClient();
  // The signed-in account: { uid, email, displayName, emailVerified }
  const [account, setAccount] = useState(null);
  // Its place in each organization: [{ org: { id, name, teams }, role, team, teams, status }]
  const [memberships, setMemberships] = useState([]);
  // Which of those organizations is on screen
  const [currentOrgId, setCurrentOrgId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isDemo, setIsDemo] = useState(false);
  // Which team the dashboard is showing; null means all teams
  const [viewTeam, setViewTeamState] = useState(null);
  // An invite link the signed-in person opened and has not answered yet
  const [invite, setInvite] = useState(peekInvite);

  const clearSession = () => {
    setOrgScope(null);
    queryClient.clear();
    setMemberships([]);
    setCurrentOrgId(null);
    setAccount(null);
  };

  // Put an account, its memberships and the organization to show into state
  const applySession = (base, list, preferOrgId) => {
    const stored = localStorage.getItem(`${CURRENT_ORG_KEY}_${base.uid}`);
    const current =
      list.find(m => m.org.id === preferOrgId) ||
      list.find(m => m.org.id === stored) ||
      list.find(m => m.status === 'active') ||
      list[0] ||
      null;
    const active = !!current && current.status === 'active' && base.emailVerified;

    // Data is only reachable once they are an approved member of the organization
    setOrgScope(active ? current.org.id : null);
    queryClient.clear();
    setAccount(base);
    setMemberships(list);
    setCurrentOrgId(current ? current.org.id : null);
    if (current) localStorage.setItem(`${CURRENT_ORG_KEY}_${base.uid}`, current.org.id);

    // Start on the last team they were viewing, or their own team if they have just one
    const orgTeams = (current?.org.teams || []).map(t => t.name);
    const own = current ? (current.role === 'member' ? [current.team].filter(Boolean) : current.teams) : [];
    const storedTeam = current ? localStorage.getItem(`${VIEW_TEAM_KEY}_${base.uid}_${current.org.id}`) : null;
    if (orgTeams.includes(storedTeam)) setViewTeamState(storedTeam);
    else if (storedTeam !== 'all' && own.length === 1 && orgTeams.includes(own[0])) setViewTeamState(own[0]);
    else setViewTeamState(null);
  };

  // Load everything about an account. A first sign-in creates its profile
  // and, if it came through an invite link, asks to join that organization.
  const loadSession = async (base, preferOrgId) => {
    let orgIds = [];
    try {
      let profile = await firestoreClient.getById('users', base.uid);
      if (!profile) {
        profile = { email: base.email, displayName: base.displayName, orgs: [] };
        await firestoreClient.setById('users', base.uid, { ...profile, created_at: new Date().toISOString() });
        const firstInvite = takeInvite();
        if (firstInvite) {
          setInvite(null);
          await createJoinRequest(base, firstInvite);
        }
      } else {
        await migrateLegacyMembership(base, profile);
      }
      const latest = await firestoreClient.getById('users', base.uid);
      orgIds = Array.isArray(latest?.orgs) ? latest.orgs : [];
    } catch (err) {
      console.error('Error loading account:', err);
    }
    applySession(base, await fetchMemberships(base.uid, orgIds), preferOrgId);
  };

  const baseOf = (firebaseUser) => ({
    uid: firebaseUser.uid,
    email: firebaseUser.email,
    displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0],
    emailVerified: firebaseUser.emailVerified,
  });

  const loadUser = (firebaseUser, preferOrgId) => loadSession(baseOf(firebaseUser), preferOrgId);

  // Demo mode keeps everything in the browser. It starts with one empty
  // organization and behaves like a real account from there.
  const loadDemoUser = async (overrides = {}, preferOrgId) => {
    const base = { ...DEMO_USER, ...JSON.parse(localStorage.getItem('demo_identity') || '{}'), ...overrides };
    localStorage.setItem('demo_identity', JSON.stringify({ email: base.email, displayName: base.displayName }));
    if (!(await firestoreClient.getById('users', base.uid))) {
      if (!(await firestoreClient.getById('orgs', DEMO_ORG_ID))) {
        await firestoreClient.setById('orgs', DEMO_ORG_ID, { name: 'Demo organization', teams: [], created_by: base.uid });
      }
      await firestoreClient.setById(membersOf(DEMO_ORG_ID), base.uid, {
        ...identity(base), status: 'active', role: 'admin', team: null, teams: [],
      });
      await firestoreClient.setById('users', base.uid, { email: base.email, displayName: base.displayName, orgs: [DEMO_ORG_ID] });
    }
    await loadSession(base, preferOrgId);
  };

  useEffect(() => {
    // Check if Firebase is configured
    if (!isFirebaseConfigured() || !auth) {
      console.log('Firebase not configured. Running in demo mode.');
      setIsDemo(true);

      // Check for demo session
      const demoSession = localStorage.getItem('demo_session');
      (demoSession ? loadDemoUser() : Promise.resolve()).finally(() => setLoading(false));
      return;
    }

    // Listen for auth state changes
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        await loadUser(firebaseUser);
      } else {
        clearSession();
      }
      setLoading(false);
    });

    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startDemoSession = async (overrides) => {
    localStorage.setItem('demo_session', 'true');
    localStorage.setItem('user_role', 'admin');
    await loadDemoUser(overrides);
  };

  // Sign in with email and password
  const signInWithEmail = async (email, password) => {
    setError(null);

    if (isDemo) {
      await startDemoSession({ email, displayName: email.split('@')[0] });
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  // Sign up with email and password
  const signUpWithEmail = async (email, password) => {
    setError(null);

    if (isDemo) {
      await startDemoSession({ email, displayName: email.split('@')[0] });
      return;
    }

    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      // User document will be created by ensureUserDocument in onAuthStateChanged
      await sendVerification(result.user);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  // Sign in with Google
  const signInWithGoogle = async () => {
    setError(null);

    if (isDemo) {
      await startDemoSession();
      return;
    }

    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  // Sign out
  const logout = async () => {
    setError(null);

    if (isDemo) {
      localStorage.removeItem('demo_session');
      localStorage.removeItem('user_role');
      clearSession();
      return;
    }

    try {
      await signOut(auth);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  // Demo mode can preview the read-only view; the choice is kept in the browser
  const setRole = (role) => {
    if (isDemo) localStorage.setItem('user_role', role);
  };

  // Re-send the verification email to the signed-in user
  const resendVerification = async () => {
    if (isDemo || !auth.currentUser) return;
    await sendVerification(auth.currentUser);
  };

  // Re-check verification and approval, e.g. after clicking the email link.
  // The ID token is refreshed too, since the rules read email_verified from it.
  const refreshUser = async (preferOrgId) => {
    if (isDemo) return loadDemoUser({}, preferOrgId);
    if (!auth.currentUser) return;
    await auth.currentUser.reload();
    await auth.currentUser.getIdToken(true);
    await loadUser(auth.currentUser, preferOrgId);
  };

  // Show a different one of this account's organizations
  const switchOrganization = (orgId) => {
    if (!account || orgId === currentOrgId) return;
    applySession(account, memberships, orgId);
  };

  // Start a new organization. Whoever creates it becomes its first admin;
  // the rules allow that only for an organization the user created themselves.
  const createOrganization = async (name) => {
    const created = await firestoreClient.create('orgs', {
      name: name.trim(),
      teams: [],
      created_by: account.uid,
    });
    await firestoreClient.setById(membersOf(created.id), account.uid, {
      ...identity(account), status: 'active', role: 'admin', team: null, teams: [],
    });
    await rememberOrg(account.uid, created.id);
    await refreshUser(created.id);
  };

  // Remember an invite link the signed-in person opened, to ask them about it
  const offerInvite = (next) => {
    saveInvite(next);
    setInvite(next);
  };

  const dismissInvite = () => {
    takeInvite();
    setInvite(null);
  };

  // Ask to join the organization an invite link points at. The account keeps
  // the organizations it already has, and stays pending in this one until approved.
  const requestToJoin = async (accepted) => {
    if (!memberships.some(m => m.org.id === accepted.org)) {
      await createJoinRequest(account, accepted);
    }
    dismissInvite();
    await refreshUser(accepted.org);
  };

  // Withdraw a join request, e.g. after opening the wrong invite link
  const cancelJoinRequest = async () => {
    await firestoreClient.remove(membersOf(currentOrgId), account.uid);
    const profile = await firestoreClient.getById('users', account.uid);
    await firestoreClient.setById('users', account.uid, {
      orgs: (profile?.orgs || []).filter(id => id !== currentOrgId),
    });
    localStorage.removeItem(`${CURRENT_ORG_KEY}_${account.uid}`);
    await refreshUser();
  };

  // Change the organization's name or team list (admins only)
  const updateOrganization = async (data) => {
    await firestoreClient.update('orgs', currentOrgId, data);
    setMemberships(prev => prev.map(m => (m.org.id === currentOrgId ? { ...m, org: { ...m.org, ...data } } : m)));
    queryClient.invalidateQueries();
  };

  const setViewTeam = (teamName) => {
    setViewTeamState(teamName);
    if (account?.uid && currentOrgId) {
      localStorage.setItem(`${VIEW_TEAM_KEY}_${account.uid}_${currentOrgId}`, teamName || 'all');
    }
  };

  const membership = memberships.find(m => m.org.id === currentOrgId) || null;
  const org = membership?.org || null;
  const demoViewer = isDemo && localStorage.getItem('user_role') === 'viewer';
  const role = demoViewer ? 'viewer' : (membership?.role || null);
  const team = membership?.team || null;
  const status = membership?.status || 'pending';
  // The account together with its place in the organization on screen
  const user = account && {
    ...account,
    org_id: currentOrgId,
    role,
    team,
    teams: membership?.teams || [],
    status,
  };
  const isActive = !!account && !!org && status === 'active' && account.emailVerified;
  const canEditAnyTask = isActive && (role === 'admin' || role === 'mentor');
  const isMember = isActive && role === 'member';
  // Teams this person belongs to: one for a student, any number for a mentor
  const myTeams = role === 'member' ? [team].filter(Boolean) : (membership?.teams || []);

  const value = {
    user,
    org,
    // Every organization this account is in or has asked to join
    organizations: memberships.map(m => ({ id: m.org.id, name: m.org.name, role: m.role, status: m.status })),
    switchOrganization,
    loading,
    error,
    isDemo,
    role,
    team,
    myTeams,
    viewTeam,
    setViewTeam,
    isActive,
    // Signed in and verified, but not attached to any organization yet
    needsOrganization: !!account && account.emailVerified && memberships.length === 0,
    invite,
    offerInvite,
    dismissInvite,
    isAdmin: isActive && role === 'admin',
    // Admins and mentors manage every team's tasks and the milestones
    canEditAnyTask,
    // Students can also add tasks, but only for their own team
    canCreateTasks: canEditAnyTask || (isMember && !!team),
    canCreateTaskFor: (teamName) => canEditAnyTask || (isMember && team === teamName),
    canEditTask: (task) => canEditAnyTask || (isMember && !!task && task.team === team),
    // Mentor tasks and the wishlist are open to every role
    canContribute: isActive && CONTRIBUTOR_ROLES.includes(role),
    resendVerification,
    refreshUser,
    createOrganization,
    requestToJoin,
    cancelJoinRequest,
    updateOrganization,
    setRole,
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    logout,
    isAuthenticated: !!account,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
