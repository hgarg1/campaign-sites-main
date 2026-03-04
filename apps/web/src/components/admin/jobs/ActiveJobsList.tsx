'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { BuildJob } from '@/hooks/useBuildJobs';

interface ActiveJobsListProps {
  jobs: BuildJob[];
  loading: boolean;
}

const statusColors = {
  PENDING: { bg: 'bg-gray-100', text: 'text-gray-800' },
  IN_PROGRESS: { bg: 'bg-blue-100', text: 'text-blue-800' },
  COMPLETED: { bg: 'bg-green-100', text: 'text-green-800' },
  FAILED: { bg: 'bg-red-100', text: 'text-red-800' },
  CANCELLED: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
};

const stageLabels = {
  BUILDER: 'Builder',
  AUDITOR_1: 'Auditor 1',
  CICD_BUILDER: 'CI/CD Builder',
  AUDITOR_2: 'Auditor 2',
  DEPLOYMENT: 'Deployment',
};

export function ActiveJobsList({ jobs, loading }: ActiveJobsListProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Active Jobs</h3>
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  const activeJobs = jobs.filter(job => job.status === 'PENDING' || job.status === 'IN_PROGRESS');

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.3 }}
      className="bg-white rounded-xl border border-gray-200 p-6"
    >
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Active Jobs ({activeJobs.length})
      </h3>
      
      <div className="space-y-3">
        {activeJobs.map((job, index) => (
          <motion.div
            key={job.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2, delay: index * 0.05 }}
            className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Link
                  href={`/admin/portal/websites/${job.websiteId}`}
                  className="font-medium text-gray-900 hover:text-blue-600"
                >
                  {job.website.name}
                </Link>
                <span className="text-xs text-gray-500">•</span>
                <span className="text-sm text-gray-600">{stageLabels[job.stage]}</span>
              </div>
              <p className="text-xs text-gray-500 font-mono">{job.id}</p>
              {job.startedAt && (
                <p className="text-xs text-gray-500 mt-1">
                  Started {new Date(job.startedAt).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              )}
            </div>

            <div className="flex items-center gap-3">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                statusColors[job.status].bg
              } ${statusColors[job.status].text}`}>
                {job.status === 'IN_PROGRESS' && <span className="mr-1 animate-pulse">●</span>}
                {job.status.replace('_', ' ')}
              </span>
            </div>
          </motion.div>
        ))}

        {activeJobs.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No active jobs at the moment
          </div>
        )}
      </div>
    </motion.div>
  );
}
