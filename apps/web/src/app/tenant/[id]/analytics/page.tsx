'use client';

import { useParams } from 'next/navigation';
import { TenantLayout } from '@/components/tenant/shared';
import { MetricCard } from '@/components/admin/shared';
import { useTenantAnalytics } from '@/hooks/useTenant';

function ProgressBar({ value, max, color = 'bg-blue-600' }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="w-full bg-gray-100 rounded-full h-2">
      <div style={{ width: `${pct}%` }} className={`h-2 rounded-full ${color} transition-all duration-500`} />
    </div>
  );
}

export default function AnalyticsPage() {
  const params = useParams();
  const orgId = params.id as string;

  const { data, loading } = useTenantAnalytics(orgId);

  const maxVisitors = data?.websiteStats ? Math.max(...data.websiteStats.map(w => w.visitors), 1) : 1;
  const maxDonations = data?.websiteStats ? Math.max(...data.websiteStats.map(w => w.donations), 1) : 1;

  return (
    <TenantLayout title="Analytics" subtitle="Performance across all websites" orgId={orgId}>
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <>
          <div className="grid md:grid-cols-4 gap-6 mb-8">
            <MetricCard label="Total Visitors" value={(data?.totalVisitors ?? 0).toLocaleString()} icon="👁️" variant="default" />
            <MetricCard label="Total Donations" value={(data?.totalDonations ?? 0).toLocaleString()} icon="💰" variant="success" />
            <MetricCard label="Amount Raised" value={`$${(data?.donationAmount ?? 0).toLocaleString()}`} icon="💵" variant="success" />
            <MetricCard label="Conversion Rate" value={`${((data?.conversionRate ?? 0) * 100).toFixed(1)}%`} icon="📈" variant="default" />
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-bold text-gray-900 mb-6">Visitors by Website</h2>
            {!data?.websiteStats || data.websiteStats.length === 0 ? (
              <p className="text-gray-500 text-sm">No website data available.</p>
            ) : (
              <div className="space-y-4">
                {[...data.websiteStats]
                  .sort((a, b) => b.visitors - a.visitors)
                  .map(w => (
                    <div key={w.websiteId}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-gray-900">{w.websiteName}</span>
                        <span className="text-gray-500">{w.visitors.toLocaleString()} visitors</span>
                      </div>
                      <ProgressBar value={w.visitors} max={maxVisitors} color="bg-blue-600" />
                    </div>
                  ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-bold text-gray-900 mb-6">Donations by Website</h2>
            {!data?.websiteStats || data.websiteStats.length === 0 ? (
              <p className="text-gray-500 text-sm">No website data available.</p>
            ) : (
              <div className="space-y-4">
                {[...data.websiteStats]
                  .sort((a, b) => b.donations - a.donations)
                  .map(w => (
                    <div key={w.websiteId}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-gray-900">{w.websiteName}</span>
                        <span className="text-gray-500">{w.donations} donations</span>
                      </div>
                      <ProgressBar value={w.donations} max={maxDonations} color="bg-green-600" />
                    </div>
                  ))}
              </div>
            )}
          </div>

          {data?.websiteStats && data.websiteStats.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-bold text-gray-900">Website Breakdown</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left font-semibold text-gray-700">Website</th>
                      <th className="px-6 py-3 text-right font-semibold text-gray-700">Visitors</th>
                      <th className="px-6 py-3 text-right font-semibold text-gray-700">Donations</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {data.websiteStats.map(w => (
                      <tr key={w.websiteId} className="hover:bg-gray-50">
                        <td className="px-6 py-4 font-medium text-gray-900">{w.websiteName}</td>
                        <td className="px-6 py-4 text-right text-gray-700">{w.visitors.toLocaleString()}</td>
                        <td className="px-6 py-4 text-right text-gray-700">{w.donations.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </TenantLayout>
  );
}