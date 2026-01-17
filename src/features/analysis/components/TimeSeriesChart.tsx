/**
 * Time Series Chart Component
 *
 * Displays email authentication trends over time using a line chart.
 */

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { format } from 'date-fns';

// ============================================================================
// Types
// ============================================================================

export interface TimeSeriesDataPoint {
  date: Date;
  totalEmails: number;
  passedEmails: number;
  failedEmails: number;
  passRate: number;
  spfPassRate: number;
  dkimPassRate: number;
}

export interface TimeSeriesChartProps {
  data: TimeSeriesDataPoint[];
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export function TimeSeriesChart({ data, className = '' }: TimeSeriesChartProps) {
  if (data.length === 0) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <p className="text-gray-600">No time series data available</p>
      </div>
    );
  }

  // Format data for chart
  const chartData = data.map((point) => ({
    date: format(point.date, 'MMM dd'),
    fullDate: format(point.date, 'PPP'),
    totalEmails: point.totalEmails,
    passedEmails: point.passedEmails,
    failedEmails: point.failedEmails,
    passRate: point.passRate,
    spfPassRate: point.spfPassRate,
    dkimPassRate: point.dkimPassRate,
  }));

  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height={350}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" tick={{ fontSize: 12 }} tickLine={{ stroke: '#ccc' }} />
          <YAxis
            yAxisId="left"
            label={{ value: 'Email Count', angle: -90, position: 'insideLeft' }}
            tick={{ fontSize: 12 }}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            label={{ value: 'Pass Rate (%)', angle: 90, position: 'insideRight' }}
            tick={{ fontSize: 12 }}
            domain={[0, 100]}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload;
                return (
                  <div className="bg-white p-4 border rounded shadow-lg">
                    <p className="font-semibold mb-2">{data.fullDate}</p>
                    <div className="space-y-1 text-sm">
                      <p className="text-gray-700">
                        <strong>Total Emails:</strong> {data.totalEmails.toLocaleString()}
                      </p>
                      <p className="text-green-600">
                        <strong>Passed:</strong> {data.passedEmails.toLocaleString()}
                      </p>
                      <p className="text-red-600">
                        <strong>Failed:</strong> {data.failedEmails.toLocaleString()}
                      </p>
                      <hr className="my-2" />
                      <p className="text-blue-600">
                        <strong>Overall Pass Rate:</strong> {data.passRate.toFixed(1)}%
                      </p>
                      <p className="text-purple-600">
                        <strong>SPF Pass Rate:</strong> {data.spfPassRate.toFixed(1)}%
                      </p>
                      <p className="text-orange-600">
                        <strong>DKIM Pass Rate:</strong> {data.dkimPassRate.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                );
              }
              return null;
            }}
          />
          <Legend />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="totalEmails"
            stroke="#3b82f6"
            strokeWidth={2}
            name="Total Emails"
            dot={{ fill: '#3b82f6', r: 4 }}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="passRate"
            stroke="#10b981"
            strokeWidth={2}
            name="Pass Rate (%)"
            dot={{ fill: '#10b981', r: 4 }}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="spfPassRate"
            stroke="#8b5cf6"
            strokeWidth={1.5}
            strokeDasharray="5 5"
            name="SPF Pass Rate (%)"
            dot={{ fill: '#8b5cf6', r: 3 }}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="dkimPassRate"
            stroke="#f59e0b"
            strokeWidth={1.5}
            strokeDasharray="5 5"
            name="DKIM Pass Rate (%)"
            dot={{ fill: '#f59e0b', r: 3 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
