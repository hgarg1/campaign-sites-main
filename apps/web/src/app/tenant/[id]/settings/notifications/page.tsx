'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { TenantLayout } from '@/components/tenant/shared';
import { useTenantSettings, WebhookLogEntry } from '@/hooks/useTenant';

interface TestWebhookResult {
  success: boolean;
  statusCode: number | null;
  responseBody: string;
  durationMs: number;
}

export default function NotificationsPage() {
  const params = useParams();
  const orgId = params.id as string;

  const { data, loading, updateSettings, refetch } = useTenantSettings(orgId);
  const [saving, setSaving] = useState(false);

  const [notifyOnBuildComplete, setNotifyOnBuildComplete] = useState(true);
  const [notifyOnBuildFailed, setNotifyOnBuildFailed] = useState(true);
  const [notifyOnTeamChanges, setNotifyOnTeamChanges] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookUrlError, setWebhookUrlError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [msgError, setMsgError] = useState(false);

  const [testingWebhook, setTestingWebhook] = useState(false);
  const [testResult, setTestResult] = useState<TestWebhookResult | null>(null);

  const [webhookLog, setWebhookLog] = useState<WebhookLogEntry[]>([]);

  useEffect(() => {
    if (data) {
      setNotifyOnBuildComplete(data.notifyOnBuildComplete ?? true);
      setNotifyOnBuildFailed(data.notifyOnBuildFailed ?? true);
      setNotifyOnTeamChanges(data.notifyOnTeamChanges ?? false);
      setWebhookUrl(data.webhookUrl || '');
      setWebhookLog(data.webhookLog ?? []);
    }
  }, [data]);

  const validateWebhookUrl = (url: string) => {
    if (url && !url.startsWith('https://')) {
      setWebhookUrlError('Webhook URL must start with https://');
      return false;
    }
    setWebhookUrlError(null);
    return true;
  };

  const showMsg = (text: string, isError = false) => {
    setMsg(text);
    setMsgError(isError);
    setTimeout(() => setMsg(null), 4000);
  };

  const handleSave = async () => {
    if (!validateWebhookUrl(webhookUrl)) return;
    setSaving(true);
    try {
      await updateSettings({ notifyOnBuildComplete, notifyOnBuildFailed, notifyOnTeamChanges, webhookUrl: webhookUrl || null });
      showMsg('Notification preferences saved.');
    } catch (e) {
      showMsg(e instanceof Error ? e.message : 'Failed to save', true);
    } finally {
      setSaving(false);
    }
  };

  const handleTestWebhook = async () => {
    if (!validateWebhookUrl(webhookUrl)) return;
    setTestingWebhook(true);
    setTestResult(null);
    try {
      const res = await fetch(`/api/tenant/${orgId}/settings/test-webhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: webhookUrl || undefined }),
      });
      const json = await res.json() as TestWebhookResult | { error: string };
      if ('error' in json) throw new Error(json.error);
      setTestResult(json as TestWebhookResult);
      // Refresh to pick up the new log entry
      await refetch();
      setTimeout(() => setTestResult(null), 10000);
    } catch (e) {
      setTestResult({ success: false, statusCode: null, responseBody: e instanceof Error ? e.message : 'Failed', durationMs: 0 });
      setTimeout(() => setTestResult(null), 10000);
    } finally {
      setTestingWebhook(false);
    }
  };

  const inputClass = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

  if (loading) {
    return (
      <TenantLayout title="Notifications" orgId={orgId}>
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
        </div>
      </TenantLayout>
    );
  }

  const canTest = webhookUrl.startsWith('https://') && !testingWebhook;

  return (
    <TenantLayout title="Notifications" subtitle="Configure your notification preferences" orgId={orgId}>
      <Link href={`/tenant/${orgId}/settings`} className="text-blue-600 hover:text-blue-700 font-medium text-sm mb-6 inline-block">
        ← Back to Settings
      </Link>

      <div className="max-w-2xl space-y-6">
        {/* Email notifications */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-2">Email Notifications</h2>
          <p className="text-sm text-gray-500 mb-4">Choose which events trigger email notifications.</p>
          <div className="space-y-3">
            {[
              { id: 'buildComplete', label: 'Build completed', description: 'When a website build finishes successfully.', checked: notifyOnBuildComplete, onChange: setNotifyOnBuildComplete },
              { id: 'buildFailed', label: 'Build failed', description: 'When a website build fails.', checked: notifyOnBuildFailed, onChange: setNotifyOnBuildFailed },
              { id: 'teamChanges', label: 'Team changes', description: 'When members join or leave the organization.', checked: notifyOnTeamChanges, onChange: setNotifyOnTeamChanges },
            ].map(n => (
              <div key={n.id} className="flex items-start gap-3 p-4 rounded-lg border border-gray-100 hover:bg-gray-50">
                <input type="checkbox" id={n.id} checked={n.checked} onChange={e => n.onChange(e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600" />
                <div>
                  <label htmlFor={n.id} className="text-sm font-medium text-gray-900 cursor-pointer">{n.label}</label>
                  <p className="text-xs text-gray-500 mt-0.5">{n.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Webhook */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-2">Webhook Notifications</h2>
          <p className="text-sm text-gray-500 mb-4">Send event payloads to your own endpoint via HTTP POST.</p>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Webhook URL</label>
            <input
              type="url"
              value={webhookUrl}
              onChange={e => {
                setWebhookUrl(e.target.value);
                validateWebhookUrl(e.target.value);
              }}
              className={`${inputClass} ${webhookUrlError ? 'border-red-400 focus:ring-red-500' : ''}`}
              placeholder="https://your-server.com/webhook"
            />
            {webhookUrlError && <p className="text-xs text-red-600 mt-1">{webhookUrlError}</p>}
          </div>

          {/* Test webhook */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleTestWebhook}
              disabled={!canTest || !webhookUrl}
              className="text-sm font-medium px-3 py-2 rounded-lg border border-blue-200 text-blue-600 hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {testingWebhook ? (
                <><span className="animate-spin inline-block h-3 w-3 border-2 border-blue-600 border-t-transparent rounded-full" /> Testing…</>
              ) : 'Send Test Webhook'}
            </button>

            {testResult && (
              <span className={`text-sm font-medium ${testResult.success ? 'text-green-700' : 'text-red-700'}`}>
                {testResult.success
                  ? `✓ Delivered (${testResult.statusCode} OK, ${testResult.durationMs}ms)`
                  : `✗ Failed${testResult.statusCode ? ` (${testResult.statusCode})` : ''} — ${testResult.responseBody || 'Connection refused'} (${testResult.durationMs}ms)`}
              </span>
            )}
          </div>
        </div>

        {/* Delivery log */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Recent Webhook Deliveries</h2>
          {webhookLog.length === 0 ? (
            <p className="text-sm text-gray-500">No deliveries yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {['Time', 'Event', 'Status', 'Duration', 'Response'].map(h => (
                      <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {webhookLog.map(entry => (
                    <tr key={entry.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-xs text-gray-500 whitespace-nowrap">
                        {new Date(entry.createdAt).toLocaleString()}
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-700">{entry.eventType}</td>
                      <td className="px-3 py-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${entry.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {entry.success ? '✓' : '✗'} {entry.statusCode ?? 'ERR'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-500">{entry.durationMs}ms</td>
                      <td className="px-3 py-2 text-xs text-gray-500 max-w-xs truncate">—</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {msg && (
          <div className={`text-sm px-3 py-2 rounded ${msgError ? 'text-red-700 bg-red-50' : 'text-green-700 bg-green-50'}`}>{msg}</div>
        )}

        <button
          onClick={handleSave}
          disabled={saving || !!webhookUrlError}
          className="bg-blue-600 text-white hover:bg-blue-700 rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save Preferences'}
        </button>
      </div>
    </TenantLayout>
  );
}