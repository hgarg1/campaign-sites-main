'use client';

import { motion } from 'framer-motion';
import { BuildJob } from '@/hooks/useBuildJobs';

interface BuildJobsTimelineProps {
  jobs: BuildJob[];
  loading: boolean;
}

const stageLabels = {
  BUILDER: 'Builder (3+ LLM Ring)',
  AUDITOR_1: 'Auditor 1 (Single LLM)',
  CICD_BUILDER: 'CI/CD Builder (3+ LLM Ring)',
  AUDITOR_2: 'Auditor 2 (Single LLM)',
  DEPLOYMENT: 'Deployment',
};

const statusColors = {
  PENDING: { bg: 'bg-gray-100', text: 'text-gray-800', icon: '⏱️' },
  IN_PROGRESS: { bg: 'bg-blue-100', text: 'text-blue-800', icon: '🔄' },
  COMPLETED: { bg: 'bg-green-100', text: 'text-green-800', icon: '✓' },
  FAILED: { bg: 'bg-red-100', text: 'text-red-800', icon: '✗' },
  CANCELLED: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: '⊘' },
};

export function BuildJobsTimeline({ jobs, loading }: BuildJobsTimelineProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  const calculateDuration = (startedAt: string | null, completedAt: string | null) => {
    if (!startedAt || !completedAt) return null;
    const diff = new Date(completedAt).getTime() - new Date(startedAt).getTime();
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
      className="bg-white rounded-xl border border-gray-200 p-6"
    >
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Build Jobs History ({jobs.length})</h3>
      
      <div className="space-y-4">
        {jobs.map((job, index) => {
          const duration = calculateDuration(job.startedAt, job.completedAt);
          const statusInfo = statusColors[job.status];

          return (
            <motion.div
              key={job.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2, delay: index * 0.05 }}
              className="relative pl-8 pb-4 border-l-2 border-gray-200 last:border-l-0"
            >
              {/* Timeline dot */}
              <div className={`absolute left-0 top-0 -translate-x-1/2 w-4 h-4 rounded-full ${
                statusInfo.bg
              } border-2 border-white shadow-sm`}></div>

              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="font-semibold text-gray-900">
                      {stageLabels[job.stage]}
                    </h4>
                    <p className="text-xs text-gray-500 font-mono mt-1">{job.id}</p>
                  </div>
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    statusInfo.bg
                  } ${statusInfo.text}`}>
                    <span>{statusInfo.icon}</span>
                    {job.status.replace('_', ' ')}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  {job.startedAt && (
                    <div>
                      <span className="text-gray-600">Started:</span>
                      <span className="text-gray-900 ml-2">
                        {new Date(job.startedAt).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  )}

                  {job.completedAt && (
                    <div>
                      <span className="text-gray-600">Completed:</span>
                      <span className="text-gray-900 ml-2">
                        {new Date(job.completedAt).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  )}

                  {duration && (
                    <div>
                      <span className="text-gray-600">Duration:</span>
                      <span className="text-gray-900 ml-2 font-medium">{duration}</span>
                    </div>
                  )}

                  {job.llmLogs && job.llmLogs.length > 0 && (
                    <div>
                      <span className="text-gray-600">LLM Calls:</span>
                      <span className="text-purple-600 ml-2 font-medium">{job.llmLogs.length}</span>
                    </div>
                  )}
                </div>

                {job.error && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm font-medium text-red-800 mb-1">Error:</p>
                    <p className="text-sm text-red-700">{job.error}</p>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}

        {jobs.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No build jobs found
          </div>
        )}
      </div>
    </motion.div>
  );
}
