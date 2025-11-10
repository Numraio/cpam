import NavigationItems from './NavigationItems';
import { NavigationProps, MenuItem } from './NavigationItems';
import {
  ChartBarIcon,
  CubeIcon,
  ChartPieIcon,
  BeakerIcon,
  CalculatorIcon,
  CheckCircleIcon,
  DocumentTextIcon,
  Cog6ToothIcon,
  CircleStackIcon,
} from '@heroicons/react/24/outline';

const ProductNavigation = ({ activePathname }: NavigationProps) => {
  if (!activePathname) {
    return null;
  }

  const menus: MenuItem[] = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: ChartBarIcon,
      active: activePathname === '/dashboard',
    },
    {
      name: 'Items',
      href: '/items',
      icon: CubeIcon,
      active: activePathname.startsWith('/items'),
      items: [
        {
          name: 'All Items',
          href: '/items',
          active: activePathname === '/items',
        },
        {
          name: 'Import CSV',
          href: '/items/import',
          active: activePathname === '/items/import',
        },
      ],
    },
    {
      name: 'Index Series',
      href: '/index-series',
      icon: ChartPieIcon,
      active: activePathname.startsWith('/index-series'),
      items: [
        {
          name: 'All Series',
          href: '/index-series',
          active: activePathname === '/index-series',
        },
        {
          name: 'Add Series',
          href: '/index-series/new',
          active: activePathname === '/index-series/new',
        },
      ],
    },
    {
      name: 'PAMs',
      href: '/pams',
      icon: CircleStackIcon,
      active: activePathname.startsWith('/pams'),
      items: [
        {
          name: 'All PAMs',
          href: '/pams',
          active: activePathname === '/pams',
        },
        {
          name: 'Create PAM',
          href: '/pams/new',
          active: activePathname === '/pams/new',
        },
      ],
    },
    {
      name: 'Scenarios',
      href: '/scenarios',
      icon: BeakerIcon,
      active: activePathname.startsWith('/scenarios'),
      items: [
        {
          name: 'All Scenarios',
          href: '/scenarios',
          active: activePathname === '/scenarios',
        },
        {
          name: 'Create Scenario',
          href: '/scenarios/new',
          active: activePathname === '/scenarios/new',
        },
        {
          name: 'Compare',
          href: '/scenarios/compare',
          active: activePathname === '/scenarios/compare',
        },
      ],
    },
    {
      name: 'Calculations',
      href: '/calculations',
      icon: CalculatorIcon,
      active: activePathname.startsWith('/calculations'),
      items: [
        {
          name: 'Dashboard',
          href: '/calculations',
          active: activePathname === '/calculations',
        },
        {
          name: 'Run Calculation',
          href: '/calculations/new',
          active: activePathname === '/calculations/new',
        },
        {
          name: 'History',
          href: '/calculations/history',
          active: activePathname === '/calculations/history',
        },
      ],
    },
    {
      name: 'Approvals',
      href: '/approvals',
      icon: CheckCircleIcon,
      active: activePathname.startsWith('/approvals'),
      items: [
        {
          name: 'Pending',
          href: '/approvals',
          active: activePathname === '/approvals',
        },
        {
          name: 'History',
          href: '/approvals/history',
          active: activePathname === '/approvals/history',
        },
      ],
    },
    {
      name: 'Reports',
      href: '/reports',
      icon: DocumentTextIcon,
      active: activePathname.startsWith('/reports'),
      items: [
        {
          name: 'All Reports',
          href: '/reports',
          active: activePathname === '/reports',
        },
        {
          name: 'Generate Report',
          href: '/reports/generate',
          active: activePathname === '/reports/generate',
        },
        {
          name: 'Analytics',
          href: '/reports/analytics',
          active: activePathname === '/reports/analytics',
        },
      ],
    },
    {
      name: 'Settings',
      href: '/settings',
      icon: Cog6ToothIcon,
      active: activePathname.startsWith('/settings'),
      items: [
        {
          name: 'Providers',
          href: '/settings/providers',
          active: activePathname === '/settings/providers',
        },
        {
          name: 'Units',
          href: '/settings/units',
          active: activePathname === '/settings/units',
        },
        {
          name: 'Notifications',
          href: '/settings/notifications',
          active: activePathname === '/settings/notifications',
        },
        {
          name: 'Integrations',
          href: '/settings/integrations',
          active: activePathname === '/settings/integrations',
        },
      ],
    },
  ];

  return <NavigationItems menus={menus} />;
};

export default ProductNavigation;
