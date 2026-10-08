import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  sendEmailVerification,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useQueryClient } from '@tanstack/react-query';
import { auth, db, googleProvider, isFirebaseConfigured } from '../config/firebase';
import firestoreClient, { setOrgScope } from '../api/firestoreClient';
import { takeInvite } from '../lib/teams';

const AuthContext = createContext(undefined);

// Demo user for when Firebase is not configured
const DEMO_ORG_ID = 'demo';
const DEMO_USER = {
  uid: 'demo-user',
  email: 'demo@example.com',
  displayName: 'Demo User',
  org_id: DEMO_ORG_ID,
  role: 'admin',
  team: null,
  teams: [],
  status: 'active',
  emailVerified: true,
};

const VIEW_TEAM_KEY = 'view_team';

// Roles that may write anything at all; mirrors firestore.rules
const CONTRIBUTOR_ROLES = ['admin', 'mentor', 'member'];

const NO_MEMBERSHIP = { org_id: null, role: null, team: null, teams: [], status: 'pending' };

export function AuthProvider({ children }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  // The organization the signed-in user belongs to: { id, name, teams: [{ name, category }] }
  const [org, setOrg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isDemo, setIsDemo] = useState(false);
  // Which team the dashboard is showing; null means all teams
  const [viewTeam, setViewTeamState] = useState(null);

  // Fetch the member record (organization, role, team, approval status)
  const fetchMemberRecord = async (uid) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (!userDoc.exists()) return NO_MEMBERSHIP;

      const data = userDoc.data();
      return {
        org_id: data.org_id || null,
        role: data.role || null,
        team: data.team || null,
        // Mentors can be on several teams; students have the single `team` above
        teams: Array.isArray(data.teams) ? data.teams : [],
        status: data.status || 'pending',
      };
    } catch (err) {
      console.error('Error fetching member record:', err);
      return NO_MEMBERSHIP;
    }
  };

  const fetchOrg = async (orgId) => {
    if (!orgId) return null;
    try {
      const data = await firestoreClient.getById('orgs', orgId);
      if (!data) return null;
      return { id: orgId, name: data.name || '', teams: Array.isArray(data.teams) ? data.teams : [] };
    } catch (err) {
      console.error('Error fetching organization:', err);
      return null;
    }
  };

  // Create the user document on first sign-in. The security rules only allow
  // a new user to create themselves as pending, with no role and no team.
  const ensureUserDocument = async (firebaseUser) => {
    try {
      const userDocRef = doc(db, 'users', firebaseUser.uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        // If they arrived through an invite link, ask to join that organization.
        // It grants nothing until one of its admins approves.
        const invite = takeInvite();
        await setDoc(userDocRef, {
          email: firebaseUser.email,
          displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0],
          status: 'pending',
          role: null,
          team: null,
          org_id: invite ? invite.org : null,
          ...(invite ? { requested_role: invite.role, requested_teams: invite.teams } : {}),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.error('Error creating user document:', err);
    }
  };

  // Put a loaded member and their organization into state
  const applyMembership = async (base, record) => {
    const loadedOrg = await fetchOrg(record.org_id);
    const active = record.status === 'active' && base.emailVerified && !!loadedOrg;

    // Data is only reachable once they are an approved member of the organization
    setOrgScope(active ? loadedOrg.id : null);
    queryClient.clear();
    setOrg(loadedOrg);
    setUser({ ...base, ...record });

    // Start on the last team they were viewing, or their own team if they have just one
    const orgTeams = (loadedOrg?.teams || []).map(t => t.name);
    const own = record.role === 'member' ? [record.team].filter(Boolean) : record.teams;
    const stored = localStorage.getItem(`${VIEW_TEAM_KEY}_${base.uid}`);
    if (orgTeams.includes(stored)) setViewTeamState(stored);
    else if (stored !== 'all' && own.length === 1 && orgTeams.includes(own[0])) setViewTeamState(own[0]);
    else setViewTeamState(null);
  };

  const loadUser = async (firebaseUser) => {
    await ensureUserDocument(firebaseUser);
    const record = await fetchMemberRecord(firebaseUser.uid);
    await applyMembership({
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0],
      emailVerified: firebaseUser.emailVerified,
    }, record);
  };

  // Demo mode keeps one organization in the browser, starting with no teams
  const loadDemoUser = async (overrides = {}) => {
    const existing = await firestoreClient.getById('orgs', DEMO_ORG_ID);
    if (!existing) {
      const orgs = JSON.parse(localStorage.getItem('robotics_team_orgs') || '[]');
      orgs.push({ id: DEMO_ORG_ID, name: 'Demo organization', teams: [], created_by: DEMO_USER.uid });
      localStorage.setItem('robotics_team_orgs', JSON.stringify(orgs));
    }
    const { uid, email, displayName, emailVerified, ...record } = {
      ...DEMO_USER,
      role: localStorage.getItem('user_role') || 'admin',
      ...overrides,
    };
    await applyMembership({ uid, email, displayName, emailVerified }, record);
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
        setOrgScope(null);
        queryClient.clear();
        setOrg(null);
        setUser(null);
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
      await sendEmailVerification(result.user);
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
      setOrgScope(null);
      queryClient.clear();
      setOrg(null);
      setUser(null);
      return;
    }

    try {
      await signOut(auth);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  // Set user role (for demo mode toggle)
  const setRole = (role) => {
    if (isDemo) {
      localStorage.setItem('user_role', role);
      setUser(prev => prev ? { ...prev, role } : null);
    }
  };

  // Re-send the verification email to the signed-in user
  const resendVerification = async () => {
    if (isDemo || !auth.currentUser) return;
    await sendEmailVerification(auth.currentUser);
  };

  // Re-check verification and approval, e.g. after clicking the email link.
  // The ID token is refreshed too, since the rules read email_verified from it.
  const refreshUser = async () => {
    if (isDemo) return loadDemoUser();
    if (!auth.currentUser) return;
    await auth.currentUser.reload();
    await auth.currentUser.getIdToken(true);
    await loadUser(auth.currentUser);
  };

  // Start a new organization. Whoever creates it becomes its first admin;
  // the rules allow that only for an organization the user created themselves.
  const createOrganization = async (name) => {
    const created = await firestoreClient.create('orgs', {
      name: name.trim(),
      teams: [],
      created_by: user.uid,
    });
    await firestoreClient.update('users', user.uid, {
      org_id: created.id,
      role: 'admin',
      status: 'active',
      team: null,
      teams: [],
    });
    await refreshUser();
  };

  // Ask to join the organization an invite link points at. Used when someone
  // who already has an account opens a link; they stay pending until approved.
  const requestToJoin = async (invite) => {
    await firestoreClient.update('users', user.uid, {
      org_id: invite.org,
      status: 'pending',
      role: null,
      team: null,
      requested_role: invite.role,
      requested_teams: invite.teams,
    });
    await refreshUser();
  };

  // Withdraw a join request, e.g. after opening the wrong invite link
  const cancelJoinRequest = async () => {
    await firestoreClient.update('users', user.uid, {
      org_id: null,
      status: 'pending',
      role: null,
      team: null,
    });
    await refreshUser();
  };

  // Change the organization's name or team list (admins only)
  const updateOrganization = async (data) => {
    await firestoreClient.update('orgs', org.id, data);
    setOrg(prev => ({ ...prev, ...data }));
    queryClient.invalidateQueries();
  };

  const setViewTeam = (teamName) => {
    setViewTeamState(teamName);
    if (user?.uid) {
      localStorage.setItem(`${VIEW_TEAM_KEY}_${user.uid}`, teamName || 'all');
    }
  };

  const role = user?.role || null;
  const team = user?.team || null;
  const isActive = !!user && !!org && user.status === 'active' && user.emailVerified;
  const canEditAnyTask = isActive && (role === 'admin' || role === 'mentor');
  const isMember = isActive && role === 'member';
  // Teams this person belongs to: one for a student, any number for a mentor
  const myTeams = role === 'member' ? [team].filter(Boolean) : (user?.teams || []);

  const value = {
    user,
    org,
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
    needsOrganization: !!user && user.emailVerified && !user.org_id,
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
    isAuthenticated: !!user,
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
