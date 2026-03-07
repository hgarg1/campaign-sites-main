'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { TenantLayout } from '@/components/tenant/shared';

const PLANS = [
  {
    name: 'Starter',
    price: '$19',
    period: '/month',
    features: ['3 websites', '30 builds/month', '2 GB storage', '2 team members', 'Email support'],
    current: false,
  },
  {
    name: 'Pro',
    price: '$49',
    period: '/month',
    features: ['10 websites', '100 builds/month', '10 GB storage', '5 team members', 'Priority support', 'Custom domain'],
    current: true,
  },
  {
    name: 'Enterprise',
    price: '$149',
    period: '/month',
    features: ['Unlimited websites', 'Unlimited builds', '100 GB storage', 'Unlimited members', '24/7 support', 'White label', 'SLA guarantee'],
    current: false,
  },
];

const INVOICES = [
  { date: 'Dec 1, 2024', amount: '$49.00', status: 'Paid', id: 'INV-2024-12' },
  { date: 'Nov 1, 2024', amount: '$49.00', status: 'Paid', id: 'INV-2024-11' },
  { date: 'Oct 1, 2024', amount: '$49.00', status: 'Paid', id: 'INV-2024-10' },
];

export default function BillingPage() {
  const params = useParams();
  const orgId = params.id as string;

  return (
    <TenantLayout title="Billing" subtitle="Manage your subscription and invoices" orgId={orgId}>
      <Link href={`/tenant/${orgId}/settings`} className="text-blue-600 hover:text-blue-700 font-medium text-sm mb-6 inline-block">
        ← Back to Settings
      </Link>

      <div className="space-y-8">
        {/* Current plan */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Current Plan</h2>
          <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div>
              <p className="font-semibold text-blue-900">Pro Plan</p>
              <p className="text-sm text-blue-700">$49/month · Next billing: Jan 1, 2025</p>
            </div>
            <span className="px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded-full">Active</span>
          </div>
        </div>

        {/* Plans */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Available Plans</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {PLANS.map(plan => (
              <div
                key={plan.name}
                className={`rounded-xl border p-5 ${plan.current ? 'border-blue-400 bg-blue-50' : 'border-gray-200'}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <p className="font-bold text-gray-900">{plan.name}</p>
                  {plan.current && <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full">Current</span>}
                </div>
                <p className="text-2xl font-bold text-gray-900 mb-1">
                  {plan.price}<span className="text-sm font-normal text-gray-500">{plan.period}</span>
                </p>
                <ul className="space-y-1.5 mt-4 mb-5">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                      <span className="text-green-600">✓</span> {f}
                    </li>
                  ))}
                </ul>
                <button
                  disabled={plan.current}
                  className={`w-full rounded-lg px-4 py-2 text-sm font-medium ${plan.current ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                >
                  {plan.current ? 'Current Plan' : `Switch to ${plan.name}`}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Payment method */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Payment Method</h2>
          <div className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="flex items-center gap-3">
              <span className="text-2xl">💳</span>
              <div>
                <p className="font-medium text-gray-900">Visa ending in 4242</p>
                <p className="text-sm text-gray-500">Expires 12/2027</p>
              </div>
            </div>
            <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">Update</button>
          </div>
        </div>

        {/* Invoices */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-bold text-gray-900">Invoice History</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {INVOICES.map(inv => (
              <div key={inv.id} className="flex items-center justify-between px-6 py-4">
                <div>
                  <p className="font-medium text-gray-900">{inv.id}</p>
                  <p className="text-sm text-gray-500">{inv.date}</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-medium text-gray-900">{inv.amount}</span>
                  <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">{inv.status}</span>
                  <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">Download</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Cancel */}
        <div className="bg-white rounded-xl border border-red-200 p-6">
          <h2 className="text-lg font-semibold text-red-700 mb-2">Cancel Subscription</h2>
          <p className="text-sm text-gray-600 mb-4">Your account will remain active until the end of the billing period.</p>
          <button className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50">
            Cancel Subscription
          </button>
        </div>
      </div>
    </TenantLayout>
  );
}