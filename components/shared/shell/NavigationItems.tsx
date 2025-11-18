import Link from 'next/link';
import classNames from 'classnames';
import { useState, useEffect } from 'react';
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

export interface MenuItem {
  name: string;
  href: string;
  icon?: any;
  active?: boolean;
  items?: Omit<MenuItem, 'icon' | 'items'>[];
  className?: string;
}

export interface NavigationProps {
  activePathname: string | null;
}

interface NavigationItemsProps {
  menus: MenuItem[];
}

interface NavigationItemProps {
  menu: MenuItem;
  className?: string;
}

const STORAGE_KEY = 'cpam-nav-expanded';

// Get initial expansion state from localStorage or default to expanded for active items
const getInitialExpandedState = (menus: MenuItem[]): Record<string, boolean> => {
  if (typeof window === 'undefined') return {};

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to parse navigation state from localStorage', e);
  }

  // Default: expand sections that have active items
  const defaultState: Record<string, boolean> = {};
  menus.forEach((menu) => {
    if (menu.items && menu.items.length > 0) {
      defaultState[menu.name] = menu.active || menu.items.some((item) => item.active) || false;
    }
  });
  return defaultState;
};

const NavigationItems = ({ menus }: NavigationItemsProps) => {
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>(() =>
    getInitialExpandedState(menus)
  );

  // Persist expansion state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(expandedItems));
    } catch (e) {
      console.error('Failed to save navigation state to localStorage', e);
    }
  }, [expandedItems]);

  const toggleExpanded = (menuName: string) => {
    setExpandedItems((prev) => ({
      ...prev,
      [menuName]: !prev[menuName],
    }));
  };

  return (
    <ul role="list" className="flex flex-1 flex-col gap-y-1">
      {menus.map((menu) => (
        <li key={menu.name}>
          <CollapsibleNavItem
            menu={menu}
            isExpanded={expandedItems[menu.name] ?? false}
            onToggle={() => toggleExpanded(menu.name)}
          />
        </li>
      ))}
    </ul>
  );
};

interface CollapsibleNavItemProps {
  menu: MenuItem;
  isExpanded: boolean;
  onToggle: () => void;
  className?: string;
}

const CollapsibleNavItem = ({ menu, isExpanded, onToggle, className = '' }: CollapsibleNavItemProps) => {
  const hasSubitems = menu.items && menu.items.length > 0;

  if (!hasSubitems) {
    // Simple navigation item without children
    return <NavigationItem menu={menu} className={className} />;
  }

  return (
    <div>
      {/* Parent item with toggle */}
      <div className="relative">
        <Link
          href={menu.href}
          className={classNames(
            'group flex items-center gap-x-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-all duration-200 border-l-4',
            {
              'bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-400 border-primary-600': menu.active,
              'text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-gray-100 border-transparent hover:border-gray-300 dark:hover:border-gray-700':
                !menu.active,
            },
            className
          )}
          aria-current={menu.active ? 'page' : undefined}
        >
          {menu.icon && (
            <menu.icon
              className={classNames('h-5 w-5 shrink-0 transition-colors duration-200', {
                'text-primary-600 dark:text-primary-400': menu.active,
                'text-gray-500 group-hover:text-gray-700 dark:text-gray-400 dark:group-hover:text-gray-300':
                  !menu.active,
              })}
              aria-hidden="true"
            />
          )}
          <span className="truncate flex-1">{menu.name}</span>
        </Link>

        {/* Toggle button */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onToggle();
          }}
          className={classNames(
            'absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-all duration-200 hover:scale-110',
            {
              'text-primary-600 hover:bg-primary-100 dark:text-primary-400 dark:hover:bg-primary-900/30': menu.active,
              'text-gray-500 hover:bg-gray-200 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-300':
                !menu.active,
            }
          )}
          aria-label={isExpanded ? `Collapse ${menu.name}` : `Expand ${menu.name}`}
          aria-expanded={isExpanded}
        >
          {isExpanded ? (
            <ChevronDownIcon className="h-4 w-4 transition-transform duration-200" />
          ) : (
            <ChevronRightIcon className="h-4 w-4 transition-transform duration-200" />
          )}
        </button>
      </div>

      {/* Collapsible submenu */}
      <div
        className={classNames(
          'overflow-hidden transition-all duration-300 ease-in-out',
          {
            'max-h-0 opacity-0': !isExpanded,
            'max-h-96 opacity-100 mt-1': isExpanded,
          }
        )}
      >
        <ul
          role="group"
          aria-label={`${menu.name} submenu`}
          className="flex flex-col gap-y-1 ml-2 pl-4 border-l-2 border-gray-200 dark:border-gray-700"
        >
          {menu.items.map((subitem) => (
            <li key={subitem.name}>
              <NavigationItem menu={subitem} className="pl-8" />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

const NavigationItem = ({ menu, className = '' }: NavigationItemProps) => {
  return (
    <Link
      href={menu.href}
      className={classNames(
        'group flex items-center gap-x-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-all duration-200 relative',
        {
          'bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-400 border-l-4 border-primary-600': menu.active,
          'text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-gray-100 border-l-4 border-transparent hover:border-gray-300 dark:hover:border-gray-700':
            !menu.active,
        },
        className
      )}
      aria-current={menu.active ? 'page' : undefined}
    >
      {menu.icon && (
        <menu.icon
          className={classNames('h-5 w-5 shrink-0 transition-colors duration-200', {
            'text-primary-600 dark:text-primary-400': menu.active,
            'text-gray-500 group-hover:text-gray-700 dark:text-gray-400 dark:group-hover:text-gray-300':
              !menu.active,
          })}
          aria-hidden="true"
        />
      )}
      <span className="truncate">{menu.name}</span>
    </Link>
  );
};

export default NavigationItems;
