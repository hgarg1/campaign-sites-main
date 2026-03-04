import { motion } from 'framer-motion';

interface ActivityItem {
  id: string;
  action: string;
  description?: string;
  timestamp: string;
  type?: 'info' | 'success' | 'warning' | 'error';
}

interface ActivityFeedProps {
  activities: ActivityItem[];
  maxItems?: number;
}

export function ActivityFeed({ activities, maxItems = 5 }: ActivityFeedProps) {
  const typeIcons = {
    info: '📌',
    success: '✅',
    warning: '⚠️',
    error: '❌',
  };

  const displayActivities = activities.slice(0, maxItems);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="bg-white rounded-xl border border-gray-200 p-6"
    >
      <h2 className="text-lg font-bold text-gray-900 mb-6">Recent Activity</h2>

      <div className="space-y-4">
        {displayActivities.map((activity, index) => (
          <motion.div
            key={activity.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
            className="flex gap-4 pb-4 border-b border-gray-100 last:border-0 last:pb-0"
          >
            <div className="text-2xl flex-shrink-0 pt-1">
              {typeIcons[activity.type || 'info']}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 truncate">{activity.action}</p>
              {activity.description && (
                <p className="text-sm text-gray-600 truncate">{activity.description}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">{activity.timestamp}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {activities.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-600">No activity yet</p>
        </div>
      )}
    </motion.div>
  );
}
