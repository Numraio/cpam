import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { Command } from 'cmdk';
import {
  MagnifyingGlassIcon,
  HomeIcon,
  CubeIcon,
  ChartPieIcon,
  BeakerIcon,
  CalculatorIcon,
  CheckCircleIcon,
  DocumentTextIcon,
  Cog6ToothIcon,
  CircleStackIcon,
  ArrowsRightLeftIcon,
  PlusIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import classNames from 'classnames';

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface CommandItem {
  id: string;
  label: string;
  shortcut?: string;
  icon: any;
  onSelect: () => void;
  group: 'pages' | 'actions' | 'recent';
}

const RECENT_PAGES_KEY = 'cpam-recent-pages';
const MAX_RECENT_PAGES = 5;

export default function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [recentPages, setRecentPages] = useState<Array<{ url: string; label: string; icon: any }>>([]);

  // Load recent pages from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_PAGES_KEY);
      if (stored) {
        setRecentPages(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to load recent pages', e);
    }
  }, []);

  // Track current page visit
  useEffect(() => {
    if (router.pathname && open) {
      const pageInfo = getPageInfo(router.pathname);
      if (pageInfo) {
        const newRecent = [
          pageInfo,
          ...recentPages.filter((p) => p.url !== pageInfo.url),
        ].slice(0, MAX_RECENT_PAGES);

        setRecentPages(newRecent);
        try {
          localStorage.setItem(RECENT_PAGES_KEY, JSON.stringify(newRecent));
        } catch (e) {
          console.error('Failed to save recent pages', e);
        }
      }
    }
  }, [router.pathname, open]);

  const navigate = (url: string) => {
    router.push(url);
    onOpenChange(false);
    setSearch('');
  };

  const getPageInfo = (pathname: string): { url: string; label: string; icon: any } | null => {
    const pages: Record<string, { label: string; icon: any }> = {
      '/dashboard': { label: 'Dashboard', icon: HomeIcon },
      '/items': { label: 'Items', icon: CubeIcon },
      '/index-series': { label: 'Index Series', icon: ChartPieIcon },
      '/pams': { label: 'PAMs', icon: CircleStackIcon },
      '/scenarios': { label: 'Scenarios', icon: BeakerIcon },
      '/comparator': { label: 'Comparator', icon: ArrowsRightLeftIcon },
      '/calculations': { label: 'Calculations', icon: CalculatorIcon },
      '/approvals': { label: 'Approvals', icon: CheckCircleIcon },
      '/reports': { label: 'Reports', icon: DocumentTextIcon },
      '/settings': { label: 'Settings', icon: Cog6ToothIcon },
    };

    const match = Object.keys(pages).find((path) => pathname.startsWith(path));
    if (match) {
      return { url: match, ...pages[match] };
    }
    return null;
  };

  const pageCommands: CommandItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      shortcut: 'G D',
      icon: HomeIcon,
      onSelect: () => navigate('/dashboard'),
      group: 'pages',
    },
    {
      id: 'items',
      label: 'Items',
      shortcut: 'G I',
      icon: CubeIcon,
      onSelect: () => navigate('/items'),
      group: 'pages',
    },
    {
      id: 'index-series',
      label: 'Index Series',
      shortcut: 'G S',
      icon: ChartPieIcon,
      onSelect: () => navigate('/index-series'),
      group: 'pages',
    },
    {
      id: 'pams',
      label: 'PAMs',
      shortcut: 'G P',
      icon: CircleStackIcon,
      onSelect: () => navigate('/pams'),
      group: 'pages',
    },
    {
      id: 'scenarios',
      label: 'Scenarios',
      shortcut: 'G E',
      icon: BeakerIcon,
      onSelect: () => navigate('/scenarios'),
      group: 'pages',
    },
    {
      id: 'comparator',
      label: 'Comparator',
      shortcut: 'G C',
      icon: ArrowsRightLeftIcon,
      onSelect: () => navigate('/comparator'),
      group: 'pages',
    },
    {
      id: 'calculations',
      label: 'Calculations',
      shortcut: 'G A',
      icon: CalculatorIcon,
      onSelect: () => navigate('/calculations'),
      group: 'pages',
    },
    {
      id: 'approvals',
      label: 'Approvals',
      shortcut: 'G V',
      icon: CheckCircleIcon,
      onSelect: () => navigate('/approvals'),
      group: 'pages',
    },
    {
      id: 'reports',
      label: 'Reports',
      shortcut: 'G R',
      icon: DocumentTextIcon,
      onSelect: () => navigate('/reports'),
      group: 'pages',
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Cog6ToothIcon,
      onSelect: () => navigate('/settings'),
      group: 'pages',
    },
  ];

  const actionCommands: CommandItem[] = [
    {
      id: 'create-item',
      label: 'Create Item',
      shortcut: '⌘ N',
      icon: PlusIcon,
      onSelect: () => navigate('/items/new'),
      group: 'actions',
    },
    {
      id: 'create-pam',
      label: 'Create PAM',
      icon: PlusIcon,
      onSelect: () => navigate('/pams/new'),
      group: 'actions',
    },
    {
      id: 'create-scenario',
      label: 'Create Scenario',
      icon: PlusIcon,
      onSelect: () => navigate('/scenarios/new'),
      group: 'actions',
    },
    {
      id: 'run-calculation',
      label: 'Run Calculation',
      icon: CalculatorIcon,
      onSelect: () => navigate('/calculations/new'),
      group: 'actions',
    },
    {
      id: 'add-index-series',
      label: 'Add Index Series',
      icon: PlusIcon,
      onSelect: () => navigate('/index-series/new'),
      group: 'actions',
    },
  ];

  const recentCommands: CommandItem[] = recentPages.map((page) => ({
    id: `recent-${page.url}`,
    label: page.label,
    icon: page.icon,
    onSelect: () => navigate(page.url),
    group: 'recent' as const,
  }));

  const allCommands = [...pageCommands, ...actionCommands];
  const filteredCommands = search
    ? allCommands.filter((cmd) =>
        cmd.label.toLowerCase().includes(search.toLowerCase())
      )
    : allCommands;

  return (
    <Command.Dialog
      open={open}
      onOpenChange={onOpenChange}
      label="Global Command Menu"
      className="fixed inset-0 z-50"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />

      {/* Command Palette */}
      <div className="fixed left-1/2 top-[20%] -translate-x-1/2 w-full max-w-2xl">
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          {/* Search Input */}
          <div className="flex items-center border-b border-gray-200 dark:border-gray-800 px-4">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 mr-3" />
            <Command.Input
              value={search}
              onValueChange={setSearch}
              placeholder="Type a command or search..."
              className="flex-1 bg-transparent py-4 text-base text-gray-900 dark:text-gray-100 placeholder-gray-400 outline-none"
            />
            <kbd className="hidden sm:inline-block px-2 py-1 text-xs font-semibold text-gray-500 bg-gray-100 dark:bg-gray-800 dark:text-gray-400 rounded">
              ESC
            </kbd>
          </div>

          {/* Command List */}
          <Command.List className="max-h-96 overflow-y-auto p-2">
            <Command.Empty className="py-6 text-center text-sm text-gray-500">
              No results found.
            </Command.Empty>

            {/* Recent Pages */}
            {!search && recentCommands.length > 0 && (
              <Command.Group
                heading="Recent"
                className="mb-2"
              >
                <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Recent
                </div>
                {recentCommands.map((cmd) => (
                  <CommandItem key={cmd.id} command={cmd} />
                ))}
              </Command.Group>
            )}

            {/* Pages */}
            {filteredCommands.some((cmd) => cmd.group === 'pages') && (
              <Command.Group heading="Pages" className="mb-2">
                <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Pages
                </div>
                {filteredCommands
                  .filter((cmd) => cmd.group === 'pages')
                  .map((cmd) => (
                    <CommandItem key={cmd.id} command={cmd} />
                  ))}
              </Command.Group>
            )}

            {/* Actions */}
            {filteredCommands.some((cmd) => cmd.group === 'actions') && (
              <Command.Group heading="Actions">
                <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Actions
                </div>
                {filteredCommands
                  .filter((cmd) => cmd.group === 'actions')
                  .map((cmd) => (
                    <CommandItem key={cmd.id} command={cmd} />
                  ))}
              </Command.Group>
            )}
          </Command.List>

          {/* Footer */}
          <div className="border-t border-gray-200 dark:border-gray-800 px-4 py-3 text-xs text-gray-500 dark:text-gray-400 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">↑↓</kbd>
                Navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">↵</kbd>
                Select
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">ESC</kbd>
                Close
              </span>
            </div>
          </div>
        </div>
      </div>
    </Command.Dialog>
  );
}

function CommandItem({ command }: { command: CommandItem }) {
  return (
    <Command.Item
      value={command.label}
      onSelect={command.onSelect}
      className={classNames(
        'flex items-center gap-3 px-3 py-2.5 rounded-md cursor-pointer transition-colors',
        'text-gray-700 dark:text-gray-300',
        'hover:bg-primary-50 hover:text-primary-700 dark:hover:bg-primary-900/20 dark:hover:text-primary-400',
        'data-[selected=true]:bg-primary-50 data-[selected=true]:text-primary-700',
        'dark:data-[selected=true]:bg-primary-900/20 dark:data-[selected=true]:text-primary-400'
      )}
    >
      <command.icon className="h-5 w-5 shrink-0" />
      <span className="flex-1 text-sm font-medium">{command.label}</span>
      {command.shortcut && (
        <kbd className="hidden sm:inline-block px-2 py-1 text-xs font-semibold text-gray-500 bg-gray-100 dark:bg-gray-800 dark:text-gray-400 rounded">
          {command.shortcut}
        </kbd>
      )}
    </Command.Item>
  );
}
