import React from 'react';
import {
  AreaChart as RechartsAreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface AreaChartProps {
  data: any[];
  areas: {
    dataKey: string;
    name: string;
    color?: string;
    fillOpacity?: number;
  }[];
  xAxisKey: string;
  height?: number;
  showGrid?: boolean;
  showLegend?: boolean;
  formatXAxis?: (value: any) => string;
  formatYAxis?: (value: any) => string;
  formatTooltip?: (value: any) => string;
  stacked?: boolean;
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

export function AreaChart({
  data,
  areas,
  xAxisKey,
  height = 300,
  showGrid = true,
  showLegend = true,
  formatXAxis,
  formatYAxis,
  formatTooltip,
  stacked = false,
  animate = true,
}: AreaChartProps) {
  // Custom tooltip component (Stripe gradient-inspired)
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
                  style={{ backgroundColor: entry.stroke }}
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
      <RechartsAreaChart
        data={data}
        margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
      >
        <defs>
          {areas.map((area, index) => (
            <linearGradient
              key={area.dataKey}
              id={`gradient-${area.dataKey}`}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop
                offset="5%"
                stopColor={area.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length]}
                stopOpacity={0.3}
              />
              <stop
                offset="95%"
                stopColor={area.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length]}
                stopOpacity={0.05}
              />
            </linearGradient>
          ))}
        </defs>
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
        {areas.map((area, index) => (
          <Area
            key={area.dataKey}
            type="monotone"
            dataKey={area.dataKey}
            name={area.name}
            stroke={area.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length]}
            fill={`url(#gradient-${area.dataKey})`}
            strokeWidth={2.5}
            stackId={stacked ? '1' : undefined}
            isAnimationActive={animate}
            animationBegin={index * 100}
            animationDuration={1200}
            animationEasing="ease-in-out"
          />
        ))}
      </RechartsAreaChart>
    </ResponsiveContainer>
  );
}
