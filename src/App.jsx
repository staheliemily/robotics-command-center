import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Reports from './pages/Reports';
import TaskTracking from './pages/TaskTracking';
import Wishlist from './pages/Wishlist';
import MentorTasks from './pages/MentorTasks';
import Users from './pages/Users';
import AccessPending from './pages/AccessPending';
import Onboarding from './pages/Onboarding';
import Join from './pages/Join';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute
      refetchOnWindowFocus: false,
    },
  },
});

// Protected Route component
function ProtectedRoute({ children, adminOnly = false }) {
  const { isAuthenticated, isActive, isAdmin, needsOrganization, invite, user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-50 dark:bg-surface-950">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Verified, and either not part of any organization yet or holding an
  // invite link they have not answered: start one or join one
  if (needsOrganization || (invite && user?.emailVerified)) {
    return <Onboarding />;
  }

  // Signed in, but email unverified or not yet approved by an admin
  if (!isActive) {
    return <AccessPending />;
  }

  if (adminOnly && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return children;
}

// For signed-in, verified people whether or not an organization has approved
// them yet. Used for adding another organization to an account.
function AccountRoute({ children }) {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!user?.emailVerified) return <AccessPending />;
  return children;
}

// Public Route component (redirects if already authenticated)
function PublicRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-50 dark:bg-surface-950">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports"
        element={
          <ProtectedRoute>
            <Reports />
          </ProtectedRoute>
        }
      />
      <Route
        path="/tasks"
        element={
          <ProtectedRoute>
            <TaskTracking />
          </ProtectedRoute>
        }
      />
      <Route
        path="/wishlist"
        element={
          <ProtectedRoute>
            <Wishlist />
          </ProtectedRoute>
        }
      />
      <Route
        path="/mentor-tasks"
        element={
          <ProtectedRoute>
            <MentorTasks />
          </ProtectedRoute>
        }
      />
      <Route path="/join" element={<Join />} />
      <Route
        path="/organizations/new"
        element={
          <AccountRoute>
            <Onboarding />
          </AccountRoute>
        }
      />
      <Route
        path="/users"
        element={
          <ProtectedRoute adminOnly>
            <Users />
          </ProtectedRoute>
        }
      />
      {/* Fallback route */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
