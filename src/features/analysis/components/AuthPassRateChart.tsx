/**
 * Authentication Pass Rate Chart
 *
 * Displays SPF and DKIM authentication pass rates using a bar chart.
 */

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

// ============================================================================
// Types
// ============================================================================

export interface AuthPassRateChartProps {
  data: {
    dkim: { total: number; passed: number; failed: number; passRate: number };
    spf: { total: number; passed: number; failed: number; passRate: number };
    overall: { total: number; passed: number; failed: number; passRate: number };
  };
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export function AuthPassRateChart({ data, className = '' }: AuthPassRateChartProps) {
  const chartData = [
    {
      name: 'SPF',
      passed: data.spf.passed,
      failed: data.spf.failed,
      passRate: data.spf.passRate.toFixed(1),
    },
    {
      name: 'DKIM',
      passed: data.dkim.passed,
      failed: data.dkim.failed,
      passRate: data.dkim.passRate.toFixed(1),
    },
    {
      name: 'Overall',
      passed: data.overall.passed,
      failed: data.overall.failed,
      passRate: data.overall.passRate.toFixed(1),
    },
  ];

  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload;
                return (
                  <div className="bg-white p-3 border rounded shadow-lg">
                    <p className="font-semibold mb-2">{data.name}</p>
                    <p className="text-green-600 text-sm">Passed: {data.passed.toLocaleString()}</p>
                    <p className="text-red-600 text-sm">Failed: {data.failed.toLocaleString()}</p>
                    <p className="text-gray-700 text-sm font-medium mt-1">
                      Pass Rate: {data.passRate}%
                    </p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Legend />
          <Bar dataKey="passed" fill="#10b981" name="Passed" />
          <Bar dataKey="failed" fill="#ef4444" name="Failed" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
