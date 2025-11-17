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
      return `${entry[nameKey]}: ${entry.percent ? `${(entry.percent * 100).toFixed(0)}%` : ''}`;
    }
    return '';
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
          outerRadius={innerRadius > 0 ? innerRadius + 60 : 80}
          label={label ? renderLabel : false}
          labelLine={labelLine}
          paddingAngle={2}
          isAnimationActive={animate}
          animationBegin={0}
          animationDuration={800}
          animationEasing="ease-out"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--background))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '6px',
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
          }}
          labelStyle={{ color: 'hsl(var(--foreground))' }}
          formatter={formatTooltip}
        />
        {showLegend && (
          <Legend
            wrapperStyle={{ fontSize: '12px' }}
            iconType="circle"
          />
        )}
      </RechartsPieChart>
    </ResponsiveContainer>
  );
}
