import React from 'react';
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface PieChartProps {
  data: any[];
  dataKey: string;
  nameKey: string;
  height?: number;
  showLegend?: boolean;
  colors?: string[];
  innerRadius?: number;
  formatTooltip?: (value: any) => string;
  labelLine?: boolean;
  label?: boolean | ((entry: any) => string);
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
  'hsl(160 100% 40%)',
  'hsl(30 100% 50%)',
];

export function PieChart({
  data,
  dataKey,
  nameKey,
  height = 300,
  showLegend = true,
  colors = DEFAULT_COLORS,
  innerRadius = 0,
  formatTooltip,
  labelLine = true,
  label = true,
  animate = true,
}: PieChartProps) {
  const renderLabel = (entry: any) => {
    if (typeof label === 'function') {
      return label(entry);
    }
    if (label === true) {
      const percent = entry.percent ? `${(entry.percent * 100).toFixed(0)}%` : '';
      return percent;
    }
    return '';
  };

  // Custom tooltip component (Modern design inspired by Figma/Google)
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;

    const entry = payload[0];
    const total = data.reduce((sum, item) => sum + item[dataKey], 0);
    const percentage = ((entry.value / total) * 100).toFixed(1);

    return (
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3 backdrop-blur-sm">
        <div className="flex items-center gap-2 mb-1.5">
          <div
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: entry.payload.fill }}
          />
          <p className="text-xs font-semibold text-gray-900 dark:text-gray-100">
            {entry.name}
          </p>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
            {formatTooltip ? formatTooltip(entry.value) : entry.value.toLocaleString()}
          </span>
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
            ({percentage}%)
          </span>
        </div>
      </div>
    );
  };

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsPieChart>
        <Pie
          data={data}
          dataKey={dataKey}
          nameKey={nameKey}
          cx="50%"
          cy="50%"
          innerRadius={innerRadius}
          outerRadius={innerRadius > 0 ? innerRadius + 70 : 90}
          label={label ? renderLabel : false}
          labelLine={labelLine && label}
          paddingAngle={innerRadius > 0 ? 3 : 2}
          isAnimationActive={animate}
          animationBegin={0}
          animationDuration={1200}
          animationEasing="ease-out"
          stroke="#fff"
          strokeWidth={2}
        >
          {data.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={colors[index % colors.length]}
              className="hover:opacity-80 transition-opacity duration-200"
            />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        {showLegend && (
          <Legend
            wrapperStyle={{ fontSize: '12px', fontWeight: 500, paddingTop: '10px' }}
            iconType="circle"
            iconSize={8}
          />
        )}
      </RechartsPieChart>
    </ResponsiveContainer>
  );
}
