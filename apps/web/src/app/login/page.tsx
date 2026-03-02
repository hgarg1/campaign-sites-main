'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { MarketingLayout } from '../../components/marketing-layout';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

      router.push('/get-started');
    } catch {
      setError('Unable to log in. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <MarketingLayout>
      <section className="px-6 pt-28 pb-16 bg-gradient-to-b from-blue-50 via-white to-purple-50">
        <div className="max-w-xl mx-auto rounded-3xl border border-blue-100 bg-white shadow-xl p-6 md:p-8">
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
              placeholder="Password"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-blue-500 focus:outline-none"
              required
            />

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="w-full px-6 py-3 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold hover:shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? 'Logging in...' : 'Log In'}
            </button>
          </form>

          <p className="text-sm text-gray-600 mt-5">
            Need a new account? <Link href="/get-started" className="text-blue-600 font-semibold hover:text-blue-700">Create one in the intake wizard</Link>
          </p>
        </div>
      </section>
    </MarketingLayout>
  );
}
