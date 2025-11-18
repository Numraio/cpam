import React, { useEffect } from 'react';
import TeamDropdown from '../TeamDropdown';
import { XMarkIcon } from '@heroicons/react/24/outline';
import Brand from './Brand';
import Navigation from './Navigation';
import { useTranslation } from 'next-i18next';
import { motion, AnimatePresence } from 'framer-motion';

interface DrawerProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

const Drawer = ({ sidebarOpen, setSidebarOpen }: DrawerProps) => {
  const { t } = useTranslation('common');

  // Close drawer on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && sidebarOpen) {
        setSidebarOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [sidebarOpen, setSidebarOpen]);

  // Prevent body scroll when drawer is open on mobile
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [sidebarOpen]);

  return (
    <>
      {/* Mobile Drawer */}
      <AnimatePresence>
        {sidebarOpen && (
          <div className="relative z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation menu">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="fixed inset-0 bg-gray-900/80 backdrop-blur-sm"
              onClick={() => setSidebarOpen(false)}
              aria-hidden="true"
            />

            {/* Drawer Panel */}
            <div className="fixed inset-0 flex">
              <motion.div
                initial={{ x: -320 }}
                animate={{ x: 0 }}
                exit={{ x: -320 }}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                className="relative mr-16 flex w-full max-w-xs flex-1"
              >
                {/* Close button */}
                <div className="absolute left-full top-0 flex w-16 justify-center pt-5">
                  <button
                    type="button"
                    className="-m-2.5 p-2.5 hover:bg-gray-800/50 rounded-lg transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-white"
                    onClick={() => setSidebarOpen(false)}
                    aria-label={t('close-sidebar')}
                  >
                    <XMarkIcon
                      className="h-6 w-6 text-white"
                      aria-hidden="true"
                    />
                  </button>
                </div>

                {/* Drawer content */}
                <div className="flex grow flex-col gap-y-6 overflow-y-auto bg-white dark:bg-gray-900 px-6 pb-4 shadow-2xl border-r border-gray-200 dark:border-gray-800">
                  <Brand />
                  <TeamDropdown />
                  <Navigation />
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-64 lg:flex-col">
        <div className="flex grow flex-col gap-y-6 overflow-y-auto border-r border-gray-200 bg-white px-6 pb-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <Brand />
          <TeamDropdown />
          <Navigation />
        </div>
      </div>
    </>
  );
};

export default Drawer;
