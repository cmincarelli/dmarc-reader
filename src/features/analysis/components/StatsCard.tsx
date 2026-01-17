/**
 * Statistics Card Component
 *
 * Displays a single metric with label, value, and optional trend.
 */

import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

export interface StatsCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  icon?: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger';
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export function StatsCard({
  label,
  value,
  subValue,
  trend,
  trendValue,
  icon,
  variant = 'default',
  className = '',
}: StatsCardProps) {
  const variantStyles = {
    default: 'bg-white border-gray-200',
    success: 'bg-green-50 border-green-200',
    warning: 'bg-yellow-50 border-yellow-200',
    danger: 'bg-red-50 border-red-200',
  };

  const trendColors = {
    up: 'text-green-600',
    down: 'text-red-600',
    neutral: 'text-gray-500',
  };

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;

  return (
    <div
      className={`
        rounded-lg border p-6 shadow-sm
        ${variantStyles[variant]}
        ${className}
      `}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600">{label}</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
          {subValue && <p className="mt-1 text-sm text-gray-500">{subValue}</p>}
        </div>
        {icon && (
          <div className="flex-shrink-0 ml-4">
            <div className="p-3 bg-white rounded-lg border border-gray-200">{icon}</div>
          </div>
        )}
      </div>

      {trend && trendValue && (
        <div className="mt-4 flex items-center">
          <TrendIcon className={`w-4 h-4 mr-1 ${trendColors[trend]}`} />
          <span className={`text-sm font-medium ${trendColors[trend]}`}>{trendValue}</span>
        </div>
      )}
    </div>
  );
}
