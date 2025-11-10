import {
  RectangleStackIcon,
  ShieldCheckIcon,
  UserCircleIcon,
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
import { useTranslation } from 'next-i18next';
import NavigationItems from './NavigationItems';
import { MenuItem, NavigationProps } from './NavigationItems';

const UserNavigation = ({ activePathname }: NavigationProps) => {
  const { t } = useTranslation('common');

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
      active: activePathname?.startsWith('/items'),
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
      active: activePathname?.startsWith('/index-series'),
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
      active: activePathname?.startsWith('/pams'),
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
      active: activePathname?.startsWith('/scenarios'),
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
      ],
    },
    {
      name: 'Calculations',
      href: '/calculations',
      icon: CalculatorIcon,
      active: activePathname?.startsWith('/calculations'),
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
      ],
    },
    {
      name: 'Approvals',
      href: '/approvals',
      icon: CheckCircleIcon,
      active: activePathname?.startsWith('/approvals'),
    },
    {
      name: 'Reports',
      href: '/reports',
      icon: DocumentTextIcon,
      active: activePathname?.startsWith('/reports'),
    },
    {
      name: t('all-teams'),
      href: '/teams',
      icon: RectangleStackIcon,
      active: activePathname === '/teams',
    },
    {
      name: t('account'),
      href: '/settings/account',
      icon: UserCircleIcon,
      active: activePathname === '/settings/account',
    },
    {
      name: t('security'),
      href: '/settings/security',
      icon: ShieldCheckIcon,
      active: activePathname === '/settings/security',
    },
  ];

  return <NavigationItems menus={menus} />;
};

export default UserNavigation;
