import React from 'react';
import classNames from 'classnames';

interface KPICardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  className?: string;
}

export function KPICard({
  title,
  value,
  change,
  changeLabel,
  icon,
  trend = 'neutral',
  className,
}: KPICardProps) {
  const getTrendColor = () => {
    if (trend === 'up') return 'text-success';
    if (trend === 'down') return 'text-error';
    return 'text-gray-500';
  };

  const getTrendIcon = () => {
    if (trend === 'up') return '↑';
    if (trend === 'down') return '↓';
    return '→';
  };

  return (
    <div
      className={classNames(
        'bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6 shadow-sm hover:shadow-md transition-shadow duration-normal',
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
            {title}
          </p>
          <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            {value}
          </p>
          {(change !== undefined || changeLabel) && (
            <div className="flex items-center gap-2 mt-2">
              {change !== undefined && (
                <span className={classNames('text-sm font-medium flex items-center gap-1', getTrendColor())}>
                  <span>{getTrendIcon()}</span>
                  <span>{Math.abs(change)}%</span>
                </span>
              )}
              {changeLabel && (
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {changeLabel}
                </span>
              )}
            </div>
          )}
        </div>
        {icon && (
          <div className="flex-shrink-0 ml-4">
            <div className="w-12 h-12 rounded-lg bg-primary-100 dark:bg-primary-900/20 flex items-center justify-center text-primary-600 dark:text-primary-400">
              {icon}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
