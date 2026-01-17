/**
 * Disposition Chart Component
 *
 * Displays DMARC policy disposition breakdown using a pie chart.
 */

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

// ============================================================================
// Types
// ============================================================================

export interface DispositionData {
  none: number;
  quarantine: number;
  reject: number;
}

export interface DispositionChartProps {
  data: DispositionData;
  className?: string;
}

// ============================================================================
// Constants
// ============================================================================

const COLORS = {
  none: '#10b981', // Green - no action taken
  quarantine: '#f59e0b', // Orange - quarantined
  reject: '#ef4444', // Red - rejected
};

const LABELS = {
  none: 'None (Delivered)',
  quarantine: 'Quarantine',
  reject: 'Reject',
};

// ============================================================================
// Component
// ============================================================================

export function DispositionChart({ data, className = '' }: DispositionChartProps) {
  const total = data.none + data.quarantine + data.reject;

  if (total === 0) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <p className="text-gray-600">No disposition data available</p>
      </div>
    );
  }

  // Format data for chart
  const chartData = [
    { name: LABELS.none, value: data.none, key: 'none' },
    { name: LABELS.quarantine, value: data.quarantine, key: 'quarantine' },
    { name: LABELS.reject, value: data.reject, key: 'reject' },
  ].filter((item) => item.value > 0); // Only show non-zero values

  // Calculate percentages
  const percentages = {
    none: total > 0 ? (data.none / total) * 100 : 0,
    quarantine: total > 0 ? (data.quarantine / total) * 100 : 0,
    reject: total > 0 ? (data.reject / total) * 100 : 0,
  };

  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={(entry) => {
              const percentage = ((entry.value / total) * 100).toFixed(1);
              return `${entry.name}: ${percentage}%`;
            }}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[entry.key as keyof typeof COLORS]} />
            ))}
          </Pie>
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0];
                const value = data.value as number;
                const percentage = ((value / total) * 100).toFixed(1);

                return (
                  <div className="bg-white p-3 border rounded shadow-lg">
                    <p className="font-semibold mb-2">{data.name}</p>
                    <p className="text-sm text-gray-700">
                      <strong>Count:</strong> {value.toLocaleString()} emails
                    </p>
                    <p className="text-sm text-gray-700">
                      <strong>Percentage:</strong> {percentage}%
                    </p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Legend
            verticalAlign="bottom"
            height={36}
            formatter={(value, entry: any) => {
              const percentage = ((entry.payload.value / total) * 100).toFixed(1);
              return `${value} (${percentage}%)`;
            }}
          />
        </PieChart>
      </ResponsiveContainer>

      {/* Summary Stats */}
      <div className="mt-4 grid grid-cols-3 gap-4 text-center">
        <div className="bg-green-50 border border-green-200 rounded p-3">
          <div className="text-2xl font-bold text-green-800">{data.none.toLocaleString()}</div>
          <div className="text-xs text-green-600 font-medium mt-1">
            {percentages.none.toFixed(1)}% Delivered
          </div>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded p-3">
          <div className="text-2xl font-bold text-orange-800">
            {data.quarantine.toLocaleString()}
          </div>
          <div className="text-xs text-orange-600 font-medium mt-1">
            {percentages.quarantine.toFixed(1)}% Quarantined
          </div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded p-3">
          <div className="text-2xl font-bold text-red-800">{data.reject.toLocaleString()}</div>
          <div className="text-xs text-red-600 font-medium mt-1">
            {percentages.reject.toFixed(1)}% Rejected
          </div>
        </div>
      </div>
    </div>
  );
}
