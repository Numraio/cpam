/**
 * Usage Banner Component
 *
 * Displays warning banner when approaching or exceeding IuM limit
 */

import React from 'react';
import { ExclamationTriangleIcon, InformationCircleIcon } from '@heroicons/react/24/outline';

interface UsageBannerProps {
  current: number;
  limit: number | null;
  warningLevel: 'none' | 'low' | 'medium' | 'high' | 'critical';
  onUpgrade?: () => void;
}

export function UsageBanner({
  current,
  limit,
  warningLevel,
  onUpgrade,
}: UsageBannerProps) {
  if (warningLevel === 'none') {
    return null;
  }

  // Don't show banner for unlimited plans
  if (limit === null) {
    return null;
  }

  const percentageUsed = Math.round((current / limit) * 100);
  const remaining = Math.max(0, limit - current);

  // Banner styles based on warning level
  const styles = {
    low: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-800',
      icon: InformationCircleIcon,
      message: `You've used ${current} of ${limit} items (${percentageUsed}%). Consider upgrading soon.`,
    },
    medium: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      text: 'text-yellow-800',
      icon: ExclamationTriangleIcon,
      message: `You've used ${current} of ${limit} items (${percentageUsed}%). Only ${remaining} items remaining.`,
    },
    high: {
      bg: 'bg-orange-50',
      border: 'border-orange-200',
      text: 'text-orange-800',
      icon: ExclamationTriangleIcon,
      message: `You're approaching your limit! ${current} of ${limit} items used (${percentageUsed}%). Only ${remaining} items remaining.`,
    },
    critical: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-800',
      icon: ExclamationTriangleIcon,
      message: `You've reached your plan limit of ${limit} items. Upgrade to add more items.`,
    },
  };

  const style = styles[warningLevel];
  const Icon = style.icon;

  return (
    <div
      className={`rounded-md ${style.bg} ${style.border} border p-4 mb-4`}
      role="alert"
    >
      <div className="flex">
        <div className="flex-shrink-0">
          <Icon className={`h-5 w-5 ${style.text}`} aria-hidden="true" />
        </div>
        <div className="ml-3 flex-1">
          <p className={`text-sm font-medium ${style.text}`}>{style.message}</p>
          {onUpgrade && (
            <div className="mt-2">
              <button
                type="button"
                onClick={onUpgrade}
                className={`text-sm font-medium ${style.text} underline hover:no-underline`}
              >
                Upgrade your plan
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
