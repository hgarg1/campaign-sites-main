'use client';

import { motion } from 'framer-motion';
import { ServiceStatus } from '@/hooks/useMonitoring';

interface ServiceStatusDashboardProps {
  services: ServiceStatus[];
  loading: boolean;
}

const statusColors = {
  UP: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300', icon: '✓' },
  DOWN: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300', icon: '✗' },
  DEGRADED: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300', icon: '⚠' },
};

export function ServiceStatusDashboard({ services, loading }: ServiceStatusDashboardProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8">
        <div className="flex justify-center items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <h3 className="text-lg font-semibold text-gray-900">Service Status</h3>
        <p className="text-sm text-gray-600 mt-1">Real-time infrastructure health monitoring</p>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Service
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Uptime
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Latency
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Load
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Last Checked
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {services.map((service, index) => {
              const colors = statusColors[service.status];

              return (
                <motion.tr
                  key={service.name}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className="hover:bg-gray-50"
                >
                  {/* Service Name */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">{service.name}</div>
                    {service.message && (
                      <div className="text-sm text-gray-500 mt-1">{service.message}</div>
                    )}
                  </td>

                  {/* Status */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${colors.bg} ${colors.text} ${colors.border}`}
                    >
                      <span className="text-sm">{colors.icon}</span>
                      {service.status}
                    </span>
                  </td>

                  {/* Uptime */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-[100px]">
                        <div
                          className={`h-2 rounded-full ${
                            service.uptime >= 99.9
                              ? 'bg-green-500'
                              : service.uptime >= 99
                              ? 'bg-yellow-500'
                              : 'bg-red-500'
                          }`}
                          style={{ width: `${Math.min(service.uptime, 100)}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-700 font-medium">
                        {service.uptime.toFixed(2)}%
                      </span>
                    </div>
                  </td>

                  {/* Latency */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    {service.latency !== null ? (
                      <span
                        className={`text-sm font-medium ${
                          service.latency < 50
                            ? 'text-green-600'
                            : service.latency < 200
                            ? 'text-yellow-600'
                            : 'text-red-600'
                        }`}
                      >
                        {service.latency}ms
                      </span>
                    ) : (
                      <span className="text-sm text-gray-400">N/A</span>
                    )}
                  </td>

                  {/* Load */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-[80px]">
                        <div
                          className={`h-2 rounded-full ${
                            service.load < 60
                              ? 'bg-green-500'
                              : service.load < 80
                              ? 'bg-yellow-500'
                              : 'bg-red-500'
                          }`}
                          style={{ width: `${Math.min(service.load, 100)}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-700 font-medium">{service.load}%</span>
                    </div>
                  </td>

                  {/* Last Checked */}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {new Date(service.lastChecked).toLocaleTimeString()}
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
        <p className="text-xs text-gray-500">
          Auto-refreshes every 30 seconds · Last updated: {new Date().toLocaleTimeString()}
        </p>
      </div>
    </div>
  );
}
