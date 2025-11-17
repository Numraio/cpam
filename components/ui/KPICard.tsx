import React from 'react';
import classNames from 'classnames';
import { ArrowUpIcon, ArrowDownIcon, MinusIcon } from '@heroicons/react/20/solid';

interface KPICardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  className?: string;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error';
  subtitle?: string;
  sparkline?: number[];  // Mini trend chart data
}

export function KPICard({
  title,
  value,
  change,
  changeLabel,
  icon,
  trend = 'neutral',
  className,
  variant = 'default',
  subtitle,
  sparkline,
}: KPICardProps) {
  const getTrendColor = () => {
    if (trend === 'up') return 'text-success bg-success-light/10';
    if (trend === 'down') return 'text-error bg-error-light/10';
    return 'text-gray-600 bg-gray-100';
  };

  const getTrendIcon = () => {
    if (trend === 'up') return <ArrowUpIcon className="w-3 h-3" />;
    if (trend === 'down') return <ArrowDownIcon className="w-3 h-3" />;
    return <MinusIcon className="w-3 h-3" />;
  };

  const getIconBgColor = () => {
    if (variant === 'primary') return 'bg-primary-100 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400';
    if (variant === 'success') return 'bg-success-light/20 dark:bg-success/20 text-success dark:text-success-light';
    if (variant === 'warning') return 'bg-warning-light/20 dark:bg-warning/20 text-warning dark:text-warning-light';
    if (variant === 'error') return 'bg-error-light/10 dark:bg-error/20 text-error dark:text-error-light';
    return 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400';
  };

  // Simple sparkline renderer (Stripe-inspired mini trend chart)
  const renderSparkline = (data: number[]) => {
    if (!data || data.length === 0) return null;

    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;
    const width = 100;
    const height = 32;
    const points = data.map((val, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((val - min) / range) * height;
      return `${x},${y}`;
    }).join(' ');

    const trendColor = trend === 'up' ? 'hsl(var(--success))' : trend === 'down' ? 'hsl(var(--error))' : '#9ca3af';

    return (
      <svg width={width} height={height} className="opacity-70">
        <polyline
          points={points}
          fill="none"
          stroke={trendColor}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  };

  return (
    <div
      className={classNames(
        'bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm hover:shadow-md transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-700',
        className
      )}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
            {title}
          </p>
          {subtitle && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
              {subtitle}
            </p>
          )}
        </div>
        {icon && (
          <div className="flex-shrink-0 ml-3">
            <div className={classNames('w-10 h-10 rounded-lg flex items-center justify-center', getIconBgColor())}>
              {icon}
            </div>
          </div>
        )}
      </div>

      <div className="flex items-end justify-between">
        <div className="flex-1">
          <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 tracking-tight mb-2">
            {value}
          </p>
          {(change !== undefined || changeLabel) && (
            <div className="flex items-center gap-2">
              {change !== undefined && (
                <span className={classNames(
                  'inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full',
                  getTrendColor()
                )}>
                  {getTrendIcon()}
                  <span>{Math.abs(change)}%</span>
                </span>
              )}
              {changeLabel && (
                <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                  {changeLabel}
                </span>
              )}
            </div>
          )}
        </div>
        {sparkline && sparkline.length > 0 && (
          <div className="flex-shrink-0 ml-4">
            {renderSparkline(sparkline)}
          </div>
        )}
      </div>
    </div>
  );
}
