import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, googleProvider, isFirebaseConfigured } from '../config/firebase';

const AuthContext = createContext(undefined);

// Demo user for when Firebase is not configured
const DEMO_USER = {
  uid: 'demo-user',
  email: 'demo@example.com',
  displayName: 'Demo User',
  role: 'admin',
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isDemo, setIsDemo] = useState(false);

  // Fetch user role from Firestore
  const fetchUserRole = async (uid) => {
    if (!isFirebaseConfigured() || !db) {
      return localStorage.getItem('user_role') || 'admin';
    }

    try {
      const userDocRef = doc(db, 'users', uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        return userDoc.data().role || 'viewer';
      }
      return 'viewer';
    } catch (error) {
      console.error('Error fetching user role:', error);
      return 'viewer';
    }
  };

  // Create or update user document in Firestore
  const ensureUserDocument = async (firebaseUser) => {
    if (!isFirebaseConfigured() || !db) return;

    try {
      const userDocRef = doc(db, 'users', firebaseUser.uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        // Create new user document with default role
        await setDoc(userDocRef, {
          email: firebaseUser.email,
          displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0],
          role: 'viewer', // Default role for new users
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error('Error creating user document:', error);
    }
  };

  useEffect(() => {
    // Check if Firebase is configured
    if (!isFirebaseConfigured() || !auth) {
      console.log('Firebase not configured. Running in demo mode.');
      setIsDemo(true);

      // Check for demo session
      const demoSession = localStorage.getItem('demo_session');
      if (demoSession) {
        setUser(DEMO_USER);
      }
      setLoading(false);
      return;
    }

    // Listen for auth state changes
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Ensure user document exists
        await ensureUserDocument(firebaseUser);

        // Fetch role from Firestore
        const role = await fetchUserRole(firebaseUser.uid);

        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0],
          role: role,
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Sign in with email and password
  const signInWithEmail = async (email, password) => {
    setError(null);

    if (isDemo) {
      // Demo mode login
      localStorage.setItem('demo_session', 'true');
      localStorage.setItem('user_role', 'admin');
      setUser({ ...DEMO_USER, email, displayName: email.split('@')[0] });
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
      // Demo mode signup
      localStorage.setItem('demo_session', 'true');
      localStorage.setItem('user_role', 'admin');
      setUser({ ...DEMO_USER, email, displayName: email.split('@')[0] });
      return;
    }

    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      // User document will be created by ensureUserDocument in onAuthStateChanged
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  // Sign in with Google
  const signInWithGoogle = async () => {
    setError(null);

    if (isDemo) {
      // Demo mode Google login
      localStorage.setItem('demo_session', 'true');
      localStorage.setItem('user_role', 'admin');
      setUser(DEMO_USER);
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

  const value = {
    user,
    loading,
    error,
    isDemo,
    isAdmin: user?.role === 'admin',
    role: user?.role || 'viewer',
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
