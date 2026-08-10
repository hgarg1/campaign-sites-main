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
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`rounded-xl border p-6 ${variantClasses[variant]} shadow-raised transition duration-base hover:shadow-floating`}
    >
      <div className="mb-3 flex items-center justify-between">
        {/*
         * Three type roles rather than three independently-chosen sizes. The
         * label, the figure and the comparison were all being assembled from
         * size + weight + colour at each call site, which is why so many cards
         * ended up flat.
         */}
        <p className="type-label">{label}</p>
        <span className="text-2xl" aria-hidden="true">
          {icon}
        </span>
      </div>
      <div className="flex items-end justify-between gap-3">
        {/* tabular-nums via .type-metric, so a column of these lines up. */}
        <p className="type-metric text-3xl">{value}</p>
        {trend && (
          <div
            className={`flex flex-col items-end ${trendClasses[trend.direction]}`}
            title={trend.label}
          >
            <div className="flex items-center gap-1 text-sm font-medium tabular">
              <span aria-hidden="true">{trendArrows[trend.direction]}</span>
              <span>
                {trend.direction === 'flat' ? 'no change' : `${Math.abs(trend.percentage)}%`}
              </span>
            </div>
            {trend.label && <span className="type-caption">{trend.label}</span>}
          </div>
        )}
      </div>
    </motion.div>
  );
}
