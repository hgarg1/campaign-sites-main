'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SuspendedPage() {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await globalThis.fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } finally {
      router.push('/');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center">
        <div className="text-5xl mb-4">❌</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-3">Organization Suspended</h1>
        <p className="text-gray-600 mb-8 leading-relaxed">
          Your organization or one of its parent organizations has been suspended. Please contact support for assistance.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => router.back()}
            className="bg-white border border-gray-300 text-gray-700 rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-50"
          >
            Go Back
          </button>
          <button
            onClick={handleSignOut}
            disabled={signingOut}
            className="bg-red-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-red-700 disabled:opacity-50"
          >
            {signingOut ? 'Signing out...' : 'Sign Out'}
          </button>
        </div>
      </div>
    </div>
  );
}
