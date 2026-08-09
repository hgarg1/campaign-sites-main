import { motion } from 'framer-motion';

interface MetricCardProps {
  label: string;
  value: string | number;
  icon: string;
  trend?: {
    /**
     * Derive this from the sign of the change — do not hard-code it. Passing
     * 'up' with a negative percentage renders an upward arrow on a decline.
     */
    direction: 'up' | 'down' | 'flat';
    /** Magnitude of the change. Rendered as an absolute value. */
    percentage: number;
    /** What the change is measured against, e.g. "vs prior 30 days". */
    label?: string;
  };
  variant?: 'default' | 'success' | 'warning' | 'danger';
}

export function MetricCard({ label, value, icon, trend, variant = 'default' }: MetricCardProps) {
  const variantClasses = {
    default: 'bg-blue-50 border-blue-200',
    success: 'bg-green-50 border-green-200',
    warning: 'bg-yellow-50 border-yellow-200',
    danger: 'bg-red-50 border-red-200',
  };

  const trendClasses = {
    up: 'text-green-600',
    down: 'text-red-600',
    flat: 'text-gray-500',
  };

  const trendArrows = { up: '↑', down: '↓', flat: '→' };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={`rounded-xl border p-6 ${variantClasses[variant]} transition-all duration-200 hover:shadow-lg`}
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium text-gray-700">{label}</p>
        <span className="text-2xl">{icon}</span>
      </div>
      <div className="flex items-end justify-between">
        <p className="text-3xl font-bold text-gray-900">{value}</p>
        {trend && (
          <div
            className={`flex flex-col items-end ${trendClasses[trend.direction]}`}
            title={trend.label}
          >
            <div className="flex items-center gap-1 text-sm font-medium">
              <span aria-hidden="true">{trendArrows[trend.direction]}</span>
              <span>
                {trend.direction === 'flat' ? 'no change' : `${Math.abs(trend.percentage)}%`}
              </span>
            </div>
            {trend.label && (
              <span className="text-xs text-gray-500 font-normal">{trend.label}</span>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
