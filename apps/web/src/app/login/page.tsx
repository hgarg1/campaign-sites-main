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
      className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-full border-2 border-gray-300 bg-white text-gray-700 font-semibold hover:border-blue-400 hover:text-blue-700 transition-colors duration-fast ease-enter disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {/*
       * An inline SVG rather than a 🔑 emoji: the emoji renders as a different
       * object on every platform, is announced aloud by screen readers as "key",
       * and cannot inherit the button's colour on hover.
       */}
      <svg
        aria-hidden="true"
        className="h-5 w-5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="7.5" cy="15.5" r="4" />
        <path d="M10.5 12.5 21 2m-4 4 2.5 2.5M14 9l2.5 2.5" />
      </svg>
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

      // Check if user needs to change password (first login)
      if (data.requiresPasswordChange) {
        router.push('/change-password');
      } else {
        router.push('/welcome');
      }
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

          {/*
           * Labelled, not placeholder-only.
           *
           * Both fields previously carried their identity in the placeholder, which
           * disappears the moment the user starts typing — so anyone returning to a
           * half-filled form, or using a screen reader, had no way to tell which
           * field was which. `focus:outline-none` also removed the global focus ring
           * without replacing it with anything a keyboard user could see.
           */}
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label htmlFor="login-email" className="mb-1.5 block text-sm font-medium text-gray-700">
                Work email
              </label>
              <input
                id="login-email"
                name="email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 transition-colors duration-fast focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label
                htmlFor="login-password"
                className="mb-1.5 block text-sm font-medium text-gray-700"
              >
                Password
              </label>
              <input
                id="login-password"
                name="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                onKeyDown={updateCapsLockState}
                onKeyUp={updateCapsLockState}
                onBlur={() => setCapsLockOn(false)}
                aria-describedby={capsLockOn ? 'login-caps' : undefined}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 transition-colors duration-fast focus:border-blue-500"
                required
              />
            </div>

            {/*
             * Announced rather than merely shown — a caps-lock warning is useless to
             * someone who cannot see it, and they are the likeliest to hit it.
             */}
            <p id="login-caps" aria-live="polite" className="text-sm text-amber-700 empty:hidden">
              {capsLockOn && 'Caps Lock is on.'}
            </p>

            {error && (
              <p role="alert" className="text-sm text-red-600">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full px-6 py-3 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold shadow-raised transition-shadow duration-base ease-enter hover:shadow-floating disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:shadow-raised"
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
