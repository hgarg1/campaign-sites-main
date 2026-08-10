'use client';

import { motion } from 'framer-motion';
import { SectionLoading } from '@/components/ui/Skeleton';

interface Activity {
  id: string;
  type: 'login' | 'website_created' | 'website_published' | 'invite_sent' | 'settings_changed';
  title: string;
  description?: string;
  timestamp: string;
}

interface UserActivityTimelineProps {
  activities: Activity[];
  loading?: boolean;
}

const activityIcons = {
  login: '🔓',
  website_created: '✨',
  website_published: '🚀',
  invite_sent: '📧',
  settings_changed: '⚙️',
};

const activityColors = {
  login: 'bg-blue-100 text-blue-700',
  website_created: 'bg-green-100 text-green-700',
  website_published: 'bg-purple-100 text-purple-700',
  invite_sent: 'bg-yellow-100 text-yellow-700',
  settings_changed: 'bg-gray-100 text-gray-700',
};

export function UserActivityTimeline({ activities, loading = false }: UserActivityTimelineProps) {
  if (loading) {
    return (
      <SectionLoading />
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: 0.1 }}
      className="bg-white rounded-xl border border-gray-200 p-6"
    >
      <h3 className="text-lg font-bold text-gray-900 mb-6">Activity Timeline</h3>

      {activities.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-600">No activity recorded</p>
        </div>
      ) : (
        <div className="relative space-y-6">
          {/* Timeline line */}
          <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-200 to-blue-100"></div>

          {activities.map((activity, index) => (
            <motion.div
              key={activity.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2, delay: Math.min(index, 6) * 0.04 }}
              className="relative pl-16"
            >
              {/* Timeline dot */}
              <div className={`absolute left-0 w-10 h-10 rounded-full flex items-center justify-center text-lg ${activityColors[activity.type]} border-4 border-white shadow-raised`}>
                {activityIcons[activity.type]}
              </div>

              {/* Activity content */}
              <div>
                <p className="font-medium text-gray-900">{activity.title}</p>
                {activity.description && (
                  <p className="text-sm text-gray-600 mt-1">{activity.description}</p>
                )}
                <p className="text-xs text-gray-500 mt-2">
                  {new Date(activity.timestamp).toLocaleString()}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
