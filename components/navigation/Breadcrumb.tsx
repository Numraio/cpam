import Link from 'next/link';
import { ChevronRightIcon, HomeIcon } from '@heroicons/react/24/outline';
import classNames from 'classnames';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: any;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export default function Breadcrumb({ items, className }: BreadcrumbProps) {
  if (!items || items.length === 0) return null;

  return (
    <nav
      aria-label="Breadcrumb"
      className={classNames(
        'flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400',
        className
      )}
    >
      <ol className="flex items-center space-x-2">
        {/* Home link */}
        <li>
          <Link
            href="/dashboard"
            className="flex items-center hover:text-gray-900 dark:hover:text-gray-200 transition-colors duration-normal"
          >
            <HomeIcon className="h-4 w-4" />
            <span className="sr-only">Home</span>
          </Link>
        </li>

        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li key={index} className="flex items-center space-x-2">
              {/* Separator */}
              <ChevronRightIcon className="h-4 w-4 text-gray-400 dark:text-gray-600" />

              {/* Breadcrumb item */}
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className={classNames(
                    'flex items-center gap-1.5 hover:text-gray-900 dark:hover:text-gray-200 transition-colors duration-normal',
                    'truncate max-w-[200px]'
                  )}
                >
                  {item.icon && <item.icon className="h-4 w-4 shrink-0" />}
                  <span>{item.label}</span>
                </Link>
              ) : (
                <span
                  className={classNames(
                    'flex items-center gap-1.5 truncate max-w-[200px]',
                    isLast
                      ? 'font-medium text-gray-900 dark:text-gray-100'
                      : 'text-gray-600 dark:text-gray-400'
                  )}
                  aria-current={isLast ? 'page' : undefined}
                >
                  {item.icon && <item.icon className="h-4 w-4 shrink-0" />}
                  <span>{item.label}</span>
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
