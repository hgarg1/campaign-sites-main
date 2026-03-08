'use client';

import { motion } from 'framer-motion';
import { BillingData, Invoice } from '@/hooks/useAnalytics';

interface BillingOverviewProps {
  data: BillingData | null;
  loading: boolean;
}

export function BillingOverview({ data, loading }: BillingOverviewProps) {
  if (loading) {
    return <div className="animate-pulse bg-gray-200 h-96 rounded-lg" />;
  }

  if (!data) {
    return <div className="text-center py-8 text-gray-600">No billing data available</div>;
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getStatusColor = (status: Invoice['status']) => {
    const colors: { [key in Invoice['status']]: string } = {
      draft: 'bg-gray-100 text-gray-900',
      sent: 'bg-blue-100 text-blue-900',
      paid: 'bg-green-100 text-green-900',
      overdue: 'bg-red-100 text-red-900',
      cancelled: 'bg-gray-100 text-gray-900',
    };
    return colors[status];
  };

  const getStatusLabel = (status: Invoice['status']) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Billing Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6 border border-green-200"
        >
          <div className="text-sm font-medium text-green-900 opacity-75">Subscription Status</div>
          <div className="text-2xl font-bold text-green-900 mt-2 capitalize">{data.subscriptionStatus}</div>
          <div className="text-xs text-green-800 mt-2">✓ Active and billing</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6 border border-blue-200"
        >
          <div className="text-sm font-medium text-blue-900 opacity-75">Next Billing Date</div>
          <div className="text-lg font-bold text-blue-900 mt-2">{formatDate(data.nextBillingDate)}</div>
          <div className="text-xs text-blue-800 mt-2">📅 Upcoming</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className={`rounded-lg p-6 border ${
            data.outstandingBalance > 0
              ? 'bg-red-50 border-red-200'
              : 'bg-green-50 border-green-200'
          }`}
        >
          <div className={`text-sm font-medium opacity-75 ${
            data.outstandingBalance > 0 ? 'text-red-900' : 'text-green-900'
          }`}>
            Outstanding Balance
          </div>
          <div className={`text-2xl font-bold mt-2 ${
            data.outstandingBalance > 0 ? 'text-red-900' : 'text-green-900'
          }`}>
            {formatCurrency(data.outstandingBalance)}
          </div>
          <div className={`text-xs mt-2 ${
            data.outstandingBalance > 0 ? 'text-red-800' : 'text-green-800'
          }`}>
            {data.outstandingBalance > 0 ? '⚠️ Payment needed' : '✓ All paid'}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-6 border border-purple-200"
        >
          <div className="text-sm font-medium text-purple-900 opacity-75">Total Invoices</div>
          <div className="text-3xl font-bold text-purple-900 mt-2">{data.invoices.length}</div>
          <div className="text-xs text-purple-800 mt-2">
            {data.invoices.filter(i => i.status === 'paid').length} paid
          </div>
        </motion.div>
      </div>

      {/* Payment History */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white rounded-lg border border-gray-200 p-6"
      >
        <h3 className="text-lg font-semibold mb-4">Recent Payments</h3>
        
        {data.paymentHistory.length === 0 ? (
          <div className="text-center py-8 text-gray-600">No payment history available</div>
        ) : (
          <div className="space-y-3">
            {data.paymentHistory.slice(0, 5).map((payment, index) => (
              <div
                key={index}
                className="flex items-center justify-between pb-3 border-b border-gray-100 last:border-0"
              >
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    {(payment.method ?? 'unknown').toUpperCase()}
                  </div>
                  <div className="text-xs text-gray-600">{formatDate(payment.date)}</div>
                </div>
                <div className="text-sm font-semibold text-green-600">
                  +{formatCurrency(payment.amount)}
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Invoices Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white rounded-lg border border-gray-200 overflow-hidden"
      >
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold">Recent Invoices</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Number</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Date</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Due Date</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data.invoices.slice(0, 10).map((invoice) => (
                <tr key={invoice.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-3 text-sm font-medium text-gray-900">{invoice.number}</td>
                  <td className="px-6 py-3 text-sm text-gray-600">{formatDate(invoice.date)}</td>
                  <td className="px-6 py-3 text-sm text-gray-600">{formatDate(invoice.dueDate)}</td>
                  <td className="px-6 py-3 text-sm font-semibold text-gray-900">
                    {formatCurrency(invoice.amount)}
                  </td>
                  <td className="px-6 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(invoice.status)}`}>
                      {getStatusLabel(invoice.status)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {data.invoices.length > 10 && (
          <div className="p-4 bg-gray-50 text-center text-sm text-gray-600">
            Showing 10 of {data.invoices.length} invoices
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
