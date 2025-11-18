import Link from 'next/link';
import React from 'react';
import { useSession } from 'next-auth/react';
import {
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  SunIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline';
import { ChevronDownIcon } from '@heroicons/react/20/solid';
import useTheme from 'hooks/useTheme';
import env from '@/lib/env';
import { useTranslation } from 'next-i18next';
import { useCustomSignOut } from 'hooks/useCustomSignout';
import { DropdownMenu } from '@/components/ui/DropdownMenu';

interface HeaderProps {
  setSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const Header = ({ setSidebarOpen }: HeaderProps) => {
  const { toggleTheme } = useTheme();
  const { status, data } = useSession();
  const { t } = useTranslation('common');
  const signOut = useCustomSignOut();

  if (status === 'loading' || !data) {
    return null;
  }

  const { user } = data;

  const dropdownItems = [
    {
      label: (
        <div className="flex items-center gap-2">
          <UserCircleIcon className="h-4 w-4" />
          <span>{t('account')}</span>
        </div>
      ),
      onSelect: () => {
        window.location.href = '/settings/account';
      },
    },
    ...(env.darkModeEnabled
      ? [
          {
            label: (
              <div className="flex items-center gap-2">
                <SunIcon className="h-4 w-4" />
                <span>{t('switch-theme')}</span>
              </div>
            ),
            onSelect: toggleTheme,
          },
        ]
      : []),
    { type: 'separator' as const },
    {
      label: (
        <div className="flex items-center gap-2">
          <ArrowRightOnRectangleIcon className="h-4 w-4" />
          <span>{t('logout')}</span>
        </div>
      ),
      onSelect: signOut,
    },
  ];

  return (
    <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm backdrop-blur-sm bg-white/95 sm:gap-x-6 sm:px-6 lg:px-8 dark:border-gray-800 dark:bg-gray-900/95 dark:backdrop-blur-sm transition-shadow duration-200">
      <button
        type="button"
        className="-m-2.5 p-2.5 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200 lg:hidden dark:text-gray-300 dark:hover:text-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
        onClick={() => setSidebarOpen(true)}
        aria-label={t('open-sidebar')}
      >
        <Bars3Icon className="h-6 w-6" aria-hidden="true" />
      </button>
      <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
        <div className="relative flex flex-1"></div>
        <div className="flex items-center gap-x-4 lg:gap-x-6">
          <DropdownMenu
            trigger={
              <button
                className="hidden lg:flex lg:items-center gap-x-2 px-3 py-2 text-sm font-semibold text-gray-900 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all duration-200 dark:text-gray-100 dark:hover:text-gray-300 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
                aria-label="User menu"
              >
                <span>{user.name}</span>
                <ChevronDownIcon className="h-4 w-4 text-gray-500 dark:text-gray-400 transition-transform duration-200" aria-hidden="true" />
              </button>
            }
            items={dropdownItems}
            align="end"
          />
        </div>
      </div>
    </div>
  );
};

export default Header;
