/**
 * Usage Meter Component
 *
 * Displays visual meter of IuM usage
 */

import React from 'react';

interface UsageMeterProps {
  current: number;
  limit: number | null;
  className?: string;
}

export function UsageMeter({ current, limit, className = '' }: UsageMeterProps) {
  // Don't show meter for unlimited plans
  if (limit === null) {
    return (
      <div className={className}>
        <div className="text-sm text-gray-600">
          <span className="font-semibold">{current}</span> items
          <span className="ml-2 text-xs text-gray-500">(Unlimited plan)</span>
        </div>
      </div>
    );
  }

  const percentageUsed = Math.min(100, Math.round((current / limit) * 100));
  const remaining = Math.max(0, limit - current);

  // Color based on usage
  let barColor = 'bg-green-500';
  if (percentageUsed >= 100) {
    barColor = 'bg-red-500';
  } else if (percentageUsed >= 90) {
    barColor = 'bg-orange-500';
  } else if (percentageUsed >= 75) {
    barColor = 'bg-yellow-500';
  }

  return (
    <div className={className}>
      <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
        <span>
          <span className="font-semibold">{current}</span> of{' '}
          <span className="font-semibold">{limit}</span> items used
        </span>
        <span className="text-xs">
          {remaining > 0 ? `${remaining} remaining` : 'Limit reached'}
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
        <div
          className={`h-full ${barColor} transition-all duration-300 ease-in-out`}
          style={{ width: `${percentageUsed}%` }}
          role="progressbar"
          aria-valuenow={percentageUsed}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${percentageUsed}% of plan limit used`}
        />
      </div>

      <div className="mt-1 text-xs text-gray-500">{percentageUsed}% used</div>
    </div>
  );
}
