import React from 'react';
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface BarChartProps {
  data: any[];
  bars: {
    dataKey: string;
    name: string;
    color?: string;
  }[];
  xAxisKey: string;
  height?: number;
  showGrid?: boolean;
  showLegend?: boolean;
  formatXAxis?: (value: any) => string;
  formatYAxis?: (value: any) => string;
  formatTooltip?: (value: any) => string;
  orientation?: 'vertical' | 'horizontal';
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

export function BarChart({
  data,
  bars,
  xAxisKey,
  height = 300,
  showGrid = true,
  showLegend = true,
  formatXAxis,
  formatYAxis,
  formatTooltip,
  orientation = 'vertical',
  animate = true,
}: BarChartProps) {
  // Custom tooltip component (Google/Stripe inspired)
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
                  className="w-2 h-2 rounded-sm"
                  style={{ backgroundColor: entry.fill }}
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
      <RechartsBarChart
        data={data}
        margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
        layout={orientation === 'horizontal' ? 'vertical' : 'horizontal'}
        barGap={4}
        barCategoryGap="20%"
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
          dataKey={orientation === 'vertical' ? xAxisKey : undefined}
          type={orientation === 'vertical' ? 'category' : 'number'}
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
          dataKey={orientation === 'horizontal' ? xAxisKey : undefined}
          type={orientation === 'vertical' ? 'number' : 'category'}
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
        <Tooltip
          content={<CustomTooltip />}
          cursor={{ fill: 'hsl(var(--muted) / 0.08)', radius: 4 }}
        />
        {showLegend && (
          <Legend
            wrapperStyle={{ fontSize: '12px', fontWeight: 500, paddingTop: '20px' }}
            iconType="circle"
            iconSize={8}
          />
        )}
        {bars.map((bar, index) => (
          <Bar
            key={bar.dataKey}
            dataKey={bar.dataKey}
            name={bar.name}
            fill={bar.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length]}
            radius={[6, 6, 0, 0]}
            maxBarSize={60}
            isAnimationActive={animate}
            animationBegin={index * 100}
            animationDuration={1200}
            animationEasing="ease-in-out"
          />
        ))}
      </RechartsBarChart>
    </ResponsiveContainer>
  );
}
