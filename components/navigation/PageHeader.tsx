import React, { useState, useEffect } from 'react';
import classNames from 'classnames';

interface PageHeaderProps {
  title: React.ReactNode;
  subtitle?: string;
  primaryAction?: React.ReactNode;
  secondaryActions?: React.ReactNode;
  statusBadge?: React.ReactNode;
  className?: string;
  sticky?: boolean;
}

export default function PageHeader({
  title,
  subtitle,
  primaryAction,
  secondaryActions,
  statusBadge,
  className,
  sticky = false,
}: PageHeaderProps) {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    if (!sticky) return;

    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [sticky]);

  return (
    <header
      className={classNames(
        'bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-6 mb-6',
        {
          'sticky top-0 z-10 transition-shadow duration-normal': sticky,
          'shadow-md': sticky && isScrolled,
        },
        className
      )}
    >
      <div className="flex items-center justify-between">
        {/* Title section */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 truncate">
              {title}
            </h1>
            {statusBadge}
          </div>
          {subtitle && (
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 truncate">
              {subtitle}
            </p>
          )}
        </div>

        {/* Actions section */}
        {(primaryAction || secondaryActions) && (
          <div className="flex items-center gap-2 ml-4 shrink-0">
            {secondaryActions}
            {primaryAction}
          </div>
        )}
      </div>
    </header>
  );
}
