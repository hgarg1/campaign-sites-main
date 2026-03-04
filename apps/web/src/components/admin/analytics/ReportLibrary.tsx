'use client';

import { motion } from 'framer-motion';
import { GeneratedReport } from '@/hooks/useAnalytics';

interface ReportLibraryProps {
  reports: GeneratedReport[];
  loading: boolean;
  onDownload: (reportId: string) => Promise<void>;
}

export function ReportLibrary({ reports, loading, onDownload }: ReportLibraryProps) {
  if (loading) {
    return <div className="animate-pulse bg-gray-200 h-96 rounded-lg" />;
  }

  if (reports.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-lg border border-gray-200 p-12 text-center"
      >
        <div className="text-5xl mb-4">📄</div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Reports Yet</h3>
        <p className="text-gray-600">Generate your first report using the generator above</p>
      </motion.div>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getReportIcon = (format: string) => {
    return format === 'pdf' ? '📑' : '📊';
  };

  const getReportTypeColor = (type: string) => {
    const colors: { [key: string]: string } = {
      daily: 'bg-blue-100 text-blue-900',
      weekly: 'bg-purple-100 text-purple-900',
      monthly: 'bg-green-100 text-green-900',
      quarterly: 'bg-orange-100 text-orange-900',
      custom: 'bg-pink-100 text-pink-900',
    };
    return colors[type] || 'bg-gray-100 text-gray-900';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <div>
        <h3 className="text-lg font-semibold mb-4">{reports.length} Generated Reports</h3>
      </div>

      <div className="space-y-3">
        {reports.map((report, index) => (
          <motion.div
            key={report.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 flex-1">
                {/* Report Icon */}
                <div className="text-3xl">{getReportIcon(report.format)}</div>

                {/* Report Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-semibold text-gray-900 truncate">{report.name}</h4>
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${getReportTypeColor(report.type)}`}>
                      {report.type}
                    </span>
                    <span className="px-2 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-900 whitespace-nowrap">
                      {report.format.toUpperCase()}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600">
                    Generated {formatDate(report.generatedAt)}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 ml-4">
                <button
                  onClick={() => onDownload(report.id)}
                  className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  ⬇️ Download
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
