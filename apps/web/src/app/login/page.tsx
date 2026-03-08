'use client';

import { FormEvent, KeyboardEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { MarketingLayout } from '../../components/marketing-layout';

function PasskeyLoginButton({ onError }: { onError: (msg: string) => void }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handlePasskeyLogin() {
    setLoading(true);
    try {
      // Dynamic import — @simplewebauthn/browser only works in browser context
      const { startAuthentication } = await import('@simplewebauthn/browser');

      // Get assertion challenge
      const optRes = await fetch('/api/auth/passkey/authenticate');
      if (!optRes.ok) {
        onError('Failed to start passkey authentication');
        return;
      }
      const options = await optRes.json();

      // Start WebAuthn assertion
      const credential = await startAuthentication(options);

      // Verify with server
      const verifyRes = await fetch('/api/auth/passkey/authenticate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credential),
      });
      const result = await verifyRes.json();

      if (!verifyRes.ok) {
        onError(result.error ?? 'Passkey authentication failed');
        return;
      }

      router.push(result.redirectTo ?? '/admin/portal');
    } catch (err: unknown) {
      // User cancelled or WebAuthn not supported
      if (err instanceof Error && err.name !== 'NotAllowedError') {
        onError('Passkey authentication failed. Try your password instead.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handlePasskeyLogin}
      disabled={loading}
      className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-full border-2 border-gray-300 bg-white text-gray-700 font-semibold hover:border-blue-400 hover:text-blue-700 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
    >
      <span className="text-lg">🔑</span>
      {loading ? 'Authenticating…' : 'Sign in with Passkey'}
    </button>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [capsLockOn, setCapsLockOn] = useState(false);

  const updateCapsLockState = (event: KeyboardEvent<HTMLInputElement>) => {
    setCapsLockOn(event.getModifierState('CapsLock'));
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data?.error || 'Unable to log in.');
        return;
      }

      router.push('/welcome');
    } catch {
      setError('Unable to log in. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <MarketingLayout>
      <section className="min-h-screen flex items-center justify-center px-6 bg-gradient-to-b from-blue-50 via-white to-purple-50">
        <div className="w-full max-w-xl rounded-3xl border border-blue-100 bg-white shadow-xl p-6 md:p-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">Log in</h1>
          <p className="text-gray-600 mb-6">Existing user? Sign in and continue your intake.</p>

          <form onSubmit={onSubmit} className="space-y-4">
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Work Email"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-blue-500 focus:outline-none"
              required
            />
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              onKeyDown={updateCapsLockState}
              onKeyUp={updateCapsLockState}
              onBlur={() => setCapsLockOn(false)}
              placeholder="Password"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-blue-500 focus:outline-none"
              required
            />

            {capsLockOn && <p className="text-sm text-amber-700">Caps Lock is on.</p>}

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="w-full px-6 py-3 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold hover:shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? 'Logging in...' : 'Log In'}
            </button>
          </form>

          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 border-t border-gray-200" />
            <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">or</span>
            <div className="flex-1 border-t border-gray-200" />
          </div>

          <PasskeyLoginButton onError={setError} />

          <p className="text-sm text-gray-600 mt-5">
            Need a new account? <Link href="/get-started" className="text-blue-600 font-semibold hover:text-blue-700">Create one in the intake wizard</Link>
          </p>
        </div>
      </section>
    </MarketingLayout>
  );
}
