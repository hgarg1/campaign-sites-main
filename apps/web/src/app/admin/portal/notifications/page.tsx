'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/shared';

type NotificationPreferences = {
  productUpdates: boolean;
  securityAlerts: boolean;
  deploymentUpdates: boolean;
};

const STORAGE_KEY = 'admin-notification-preferences-v1';

export default function NotificationsPage() {
  const [prefs, setPrefs] = useState<NotificationPreferences>({
    productUpdates: true,
    securityAlerts: true,
    deploymentUpdates: true,
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return;
      }
      const parsed = JSON.parse(raw) as NotificationPreferences;
      setPrefs(parsed);
    } catch {
    }
  }, []);

  const updatePref = (key: keyof NotificationPreferences, value: boolean) => {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    setSaved(false);
  };

  const savePreferences = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    setSaved(true);
    
    // Clear success message after 3 seconds
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <AdminLayout
      title="Notifications"
      subtitle="Manage your personal admin notification preferences"
    >
      <div className="max-w-2xl bg-white rounded-lg border border-gray-200 shadow-sm p-6 space-y-5">
        <label className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-gray-900">Product updates</p>
            <p className="text-xs text-gray-600">Receive updates about new features and improvements.</p>
          </div>
          <input
            type="checkbox"
            checked={prefs.productUpdates}
            onChange={(e) => updatePref('productUpdates', e.target.checked)}
            className="h-4 w-4"
          />
        </label>

        <label className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-gray-900">Security alerts</p>
            <p className="text-xs text-gray-600">Get notified about important security events.</p>
          </div>
          <input
            type="checkbox"
            checked={prefs.securityAlerts}
            onChange={(e) => updatePref('securityAlerts', e.target.checked)}
            className="h-4 w-4"
          />
        </label>

        <label className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-gray-900">Deployment updates</p>
            <p className="text-xs text-gray-600">Receive status updates for site deployments.</p>
          </div>
          <input
            type="checkbox"
            checked={prefs.deploymentUpdates}
            onChange={(e) => updatePref('deploymentUpdates', e.target.checked)}
            className="h-4 w-4"
          />
        </label>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={savePreferences}
            className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Save Preferences
          </button>
          {saved && <p className="text-sm text-green-700">Preferences saved.</p>}
        </div>

        <div className="pt-2 border-t border-gray-100">
          <p className="text-xs text-gray-600">
            System-wide notification channels are managed in{' '}
            <Link href="/admin/portal/monitoring?tab=channels" className="text-blue-600 hover:underline">
              Monitoring → Notification Channels
            </Link>
            .
          </p>
        </div>
      </div>
    </AdminLayout>
  );
}
