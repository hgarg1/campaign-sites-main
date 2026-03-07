'use client';

import { useParams } from 'next/navigation';
import { TenantLayout } from '@/components/tenant/shared';
import { useTenantUsage } from '@/hooks/useTenant';

interface UsageBarProps {
  label: string;
  used: number;
  limit: number | null;
  formatValue?: (v: number) => string;
}

function UsageBar({ label, used, limit, formatValue }: UsageBarProps) {
  const pct = limit && limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const color = pct >= 90 ? 'bg-red-500' : pct >= 75 ? 'bg-yellow-500' : 'bg-green-500';
  const textColor = pct >= 90 ? 'text-red-700' : pct >= 75 ? 'text-yellow-700' : 'text-green-700';
  const bgColor = pct >= 90 ? 'bg-red-50 border-red-200' : pct >= 75 ? 'bg-yellow-50 border-yellow-200' : 'bg-green-50 border-green-200';
  const fmt = formatValue || ((v: number) => v.toLocaleString());

  return (
    <div className={`rounded-xl border p-6 ${bgColor}`}>
      <div className="flex justify-between items-start mb-3">
        <p className="font-semibold text-gray-900">{label}</p>
        {limit != null && <span className={`text-sm font-bold ${textColor}`}>{pct}%</span>}
      </div>
      {limit != null && (
        <div className="w-full bg-white bg-opacity-60 rounded-full h-3 mb-3">
          <div style={{ width: `${pct}%` }} className={`h-3 rounded-full ${color} transition-all duration-500`} />
        </div>
      )}
      <div className="flex justify-between text-sm text-gray-600">
        <span>{fmt(used)}</span>
        {limit != null && <span>of {fmt(limit)}</span>}
      </div>
    </div>
  );
}

export default function UsagePage() {
  const params = useParams();
  const orgId = params.id as string;

  const { data, loading } = useTenantUsage(orgId);

  const fmtStorage = (mb: number) => {
    if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
    return `${mb} MB`;
  };

  const fmtCost = (usd: number) => `$${usd.toFixed(2)}`;

  return (
    <TenantLayout title="Usage" subtitle="Monitor your resource consumption" orgId={orgId}>
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : !data ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-500">
          Usage data not available.
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <UsageBar
              label="Monthly Builds"
              used={data.monthlyBuilds}
              limit={data.monthlyBuildsLimit}
            />
            <UsageBar
              label="API Calls"
              used={data.apiCalls}
              limit={data.apiCallsLimit}
            />
            <UsageBar
              label="Storage Used"
              used={data.storageUsedMb}
              limit={data.storageLimit}
              formatValue={fmtStorage}
            />
            <UsageBar
              label="LLM Costs (This Period)"
              used={data.llmCosts}
              limit={null}
              formatValue={fmtCost}
            />
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Usage Summary</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">{data.monthlyBuilds}</p>
                <p className="text-sm text-gray-500 mt-1">Builds this month</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">{data.apiCalls.toLocaleString()}</p>
                <p className="text-sm text-gray-500 mt-1">API calls</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">{fmtStorage(data.storageUsedMb)}</p>
                <p className="text-sm text-gray-500 mt-1">Storage used</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">{fmtCost(data.llmCosts)}</p>
                <p className="text-sm text-gray-500 mt-1">LLM spend</p>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700">
            <p className="font-medium mb-1">Usage resets at the beginning of each billing period.</p>
            <p>Contact support if you need to increase your limits.</p>
          </div>
        </div>
      )}
    </TenantLayout>
  );
}