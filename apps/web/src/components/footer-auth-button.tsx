'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

export function FooterAuthButton() {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [dashboardUrl, setDashboardUrl] = useState('/login');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await fetch('/api/auth/me', {
          method: 'GET',
          credentials: 'include',
        });

        if (response.ok) {
          const data = await response.json();
          if (data && data.organizations) {
            setIsSignedIn(true);

            // Determine dashboard URL based on user role and org count
            const isGlobalAdmin = data.role === 'GLOBAL_ADMIN';
            const orgCount = data.organizations.length;

            let url = '/login';
            if (isGlobalAdmin) {
              if (orgCount === 0) {
                url = '/admin/portal';
              } else if (orgCount === 1) {
                url = `/tenant/${data.organizations[0].id}`;
              } else {
                url = '/tenant-chooser';
              }
            } else {
              if (orgCount === 0) {
                url = '/get-started';
              } else if (orgCount === 1) {
                url = `/tenant/${data.organizations[0].id}`;
              } else {
                url = '/tenant-chooser';
              }
            }
            setDashboardUrl(url);
          }
        }
      } catch (error) {
        console.error('Failed to check session:', error);
        setIsSignedIn(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();
  }, []);

  if (isLoading) {
    // While loading, show the sign-in button as default
    return (
      <Link
        href="/login"
        className="inline-flex items-center justify-center rounded-full border border-blue-400/40 bg-gradient-to-r from-blue-600 to-purple-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-900/20 transition-all hover:from-blue-500 hover:to-purple-500 hover:shadow-blue-700/30 active:scale-95"
      >
        Sign In
      </Link>
    );
  }

  if (isSignedIn) {
    return (
      <Link
        href={dashboardUrl}
        className="inline-flex items-center justify-center rounded-full border border-purple-400/40 bg-gradient-to-r from-purple-600 to-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-purple-900/20 transition-all hover:from-purple-500 hover:to-blue-500 hover:shadow-purple-700/30 active:scale-95"
      >
        Go to Dashboard
      </Link>
    );
  }

  // Signed out
  return (
    <Link
      href="/login"
      className="inline-flex items-center justify-center rounded-full border border-blue-400/40 bg-gradient-to-r from-blue-600 to-purple-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-900/20 transition-all hover:from-blue-500 hover:to-purple-500 hover:shadow-blue-700/30 active:scale-95"
    >
      Sign In
    </Link>
  );
}
