'use client';

import { useState } from 'react';
import { ReactNode } from 'react';
import { AdminNavigation } from './AdminNavigation';
import { TopBar } from './TopBar';

interface AdminLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
}

export function AdminLayout({ children, title, subtitle }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    // h-dscreen, not h-screen: this shell pins its height and scrolls `main`
    // internally, so 100vh put the last ~90px of every admin page permanently
    // underneath the mobile browser's address bar.
    <div className="flex h-dscreen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <AdminNavigation isMobileOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Top Bar */}
        <TopBar title={title} subtitle={subtitle} onMenuClick={() => setSidebarOpen(true)} />

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

