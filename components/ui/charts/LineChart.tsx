import React from 'react';
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface LineChartProps {
  data: any[];
  lines: {
    dataKey: string;
    name: string;
    color?: string;
    strokeWidth?: number;
  }[];
  xAxisKey: string;
  height?: number;
  showGrid?: boolean;
  showLegend?: boolean;
  formatXAxis?: (value: any) => string;
  formatYAxis?: (value: any) => string;
  formatTooltip?: (value: any) => string;
  /** Enable/disable animations (default: true) */
  animate?: boolean;
}

const DEFAULT_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--success))',
  'hsl(var(--warning))',
  'hsl(var(--error))',
  'hsl(210 100% 50%)',
  'hsl(280 100% 50%)',
];

export function LineChart({
  data,
  lines,
  xAxisKey,
  height = 300,
  showGrid = true,
  showLegend = true,
  formatXAxis,
  formatYAxis,
  formatTooltip,
  animate = true,
}: LineChartProps) {
  // Custom tooltip component (Stripe/Figma inspired)
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;

    return (
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3 backdrop-blur-sm">
        <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 mb-2">
          {formatXAxis ? formatXAxis(label) : label}
        </p>
        <div className="space-y-1">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                  {entry.name}
                </span>
              </div>
              <span className="text-xs font-bold text-gray-900 dark:text-gray-100">
                {formatTooltip ? formatTooltip(entry.value) : entry.value.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsLineChart
        data={data}
        margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
      >
        {showGrid && (
          <CartesianGrid
            strokeDasharray="0"
            stroke="hsl(var(--border))"
            opacity={0.15}
            vertical={false}
          />
        )}
        <XAxis
          dataKey={xAxisKey}
          stroke="hsl(var(--muted-foreground))"
          fontSize={11}
          fontWeight={500}
          tickLine={false}
          axisLine={false}
          tickMargin={12}
          tickFormatter={formatXAxis}
          tick={{ fill: '#9ca3af' }}
        />
        <YAxis
          stroke="hsl(var(--muted-foreground))"
          fontSize={11}
          fontWeight={500}
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tickFormatter={formatYAxis}
          tick={{ fill: '#9ca3af' }}
          width={40}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#e5e7eb', strokeWidth: 1 }} />
        {showLegend && (
          <Legend
            wrapperStyle={{ fontSize: '12px', fontWeight: 500, paddingTop: '20px' }}
            iconType="circle"
            iconSize={8}
          />
        )}
        {lines.map((line, index) => (
          <Line
            key={line.dataKey}
            type="monotone"
            dataKey={line.dataKey}
            name={line.name}
            stroke={line.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length]}
            strokeWidth={line.strokeWidth || 2.5}
            dot={false}
            activeDot={{
              r: 6,
              strokeWidth: 2,
              stroke: '#fff',
              fill: line.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length]
            }}
            isAnimationActive={animate}
            animationBegin={index * 100}
            animationDuration={1200}
            animationEasing="ease-in-out"
          />
        ))}
      </RechartsLineChart>
    </ResponsiveContainer>
  );
}
