import React, { useState } from 'react';
import { Bot, Clock, MailCheck, LogOut, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { useAuth } from '../context/AuthContext';

// Shown to signed-in users who cannot see team data yet: either their email
// is unverified or an admin has not approved the account.
export function AccessPending() {
  const { user, org, logout, resendVerification, refreshUser, cancelJoinRequest } = useAuth();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  const needsVerification = !user?.emailVerified;

  const run = async (action, successMessage) => {
    setBusy(true);
    setNotice('');
    try {
      await action();
      setNotice(successMessage);
    } catch (err) {
      setNotice(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-accent-50 dark:from-surface-950 dark:via-surface-900 dark:to-surface-950 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900">
            <Bot className="h-8 w-8 text-primary-600 dark:text-primary-400" />
          </div>
          <CardTitle className="text-2xl">
            {needsVerification ? 'Verify your email' : 'Waiting for approval'}
          </CardTitle>
          <CardDescription>Signed in as {user?.email}</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex items-start gap-3 rounded-lg bg-yellow-50 p-3 text-sm text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200">
            {needsVerification ? (
              <MailCheck className="h-5 w-5 flex-shrink-0" />
            ) : (
              <Clock className="h-5 w-5 flex-shrink-0" />
            )}
            <p>
              {needsVerification
                ? 'We sent a verification link to your email. Click it, then come back and check again.'
                : `Your account is set up. An admin${org?.name ? ` of ${org.name}` : ''} needs to approve it before you can see the dashboard.`}
            </p>
          </div>

          {notice && (
            <p className="text-center text-sm text-surface-500 dark:text-surface-400">{notice}</p>
          )}

          <Button
            className="w-full gap-2"
            disabled={busy}
            onClick={() => run(refreshUser, 'Checked just now.')}
          >
            <RefreshCw className="h-4 w-4" />
            Check again
          </Button>

          {needsVerification && (
            <Button
              variant="outline"
              className="w-full gap-2"
              disabled={busy}
              onClick={() => run(resendVerification, 'Verification email sent.')}
            >
              <MailCheck className="h-4 w-4" />
              Resend verification email
            </Button>
          )}

          {!needsVerification && (
            <Button
              variant="outline"
              className="w-full"
              disabled={busy}
              onClick={() => run(cancelJoinRequest, '')}
            >
              Cancel this request
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

export default AccessPending;
