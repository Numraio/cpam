import { useRouter } from 'next/router';
import { useMemo } from 'react';
import {
  CubeIcon,
  ChartPieIcon,
  BeakerIcon,
  CalculatorIcon,
  CheckCircleIcon,
  DocumentTextIcon,
  Cog6ToothIcon,
  CircleStackIcon,
  ArrowsRightLeftIcon,
} from '@heroicons/react/24/outline';
import { BreadcrumbItem } from '@/components/navigation/Breadcrumb';

interface RouteConfig {
  label: string;
  icon?: any;
  dynamicLabel?: (id: string) => string;
}

const routeMap: Record<string, RouteConfig> = {
  '/dashboard': { label: 'Dashboard' },
  '/items': { label: 'Items', icon: CubeIcon },
  '/items/new': { label: 'Create Item' },
  '/items/import': { label: 'Import CSV' },
  '/items/[id]': { label: 'Item Details', dynamicLabel: (id) => `Item ${id.slice(0, 8)}` },
  '/items/[id]/edit': { label: 'Edit Item' },
  '/index-series': { label: 'Index Series', icon: ChartPieIcon },
  '/index-series/new': { label: 'Add Series' },
  '/index-series/[id]': { label: 'Series Details', dynamicLabel: (id) => `Series ${id.slice(0, 8)}` },
  '/index-series/[id]/edit': { label: 'Edit Series' },
  '/pams': { label: 'PAMs', icon: CircleStackIcon },
  '/pams/new': { label: 'Create PAM' },
  '/pams/[id]': { label: 'PAM Details', dynamicLabel: (id) => `PAM ${id.slice(0, 8)}` },
  '/pams/[id]/edit': { label: 'Edit PAM' },
  '/scenarios': { label: 'Scenarios', icon: BeakerIcon },
  '/scenarios/new': { label: 'Create Scenario' },
  '/scenarios/[id]': { label: 'Scenario Details', dynamicLabel: (id) => `Scenario ${id.slice(0, 8)}` },
  '/scenarios/compare': { label: 'Compare Scenarios' },
  '/comparator': { label: 'Comparator', icon: ArrowsRightLeftIcon },
  '/calculations': { label: 'Calculations', icon: CalculatorIcon },
  '/calculations/new': { label: 'Run Calculation' },
  '/calculations/history': { label: 'History' },
  '/calculations/[id]': { label: 'Calculation Details', dynamicLabel: (id) => `Calc ${id.slice(0, 8)}` },
  '/approvals': { label: 'Approvals', icon: CheckCircleIcon },
  '/approvals/history': { label: 'History' },
  '/reports': { label: 'Reports', icon: DocumentTextIcon },
  '/reports/generate': { label: 'Generate Report' },
  '/reports/analytics': { label: 'Analytics' },
  '/settings': { label: 'Settings', icon: Cog6ToothIcon },
  '/settings/providers': { label: 'Data Providers' },
  '/settings/units': { label: 'Unit Conversions' },
  '/settings/notifications': { label: 'Notifications' },
  '/settings/integrations': { label: 'Integrations' },
};

export function useBreadcrumb(): BreadcrumbItem[] {
  const router = useRouter();

  return useMemo(() => {
    const { pathname, query } = router;

    // Skip breadcrumbs for dashboard
    if (pathname === '/dashboard') {
      return [];
    }

    const items: BreadcrumbItem[] = [];
    const segments = pathname.split('/').filter(Boolean);

    // Build breadcrumb path
    let currentPath = '';
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      currentPath += `/${segment}`;

      // Check if this is a dynamic segment (e.g., [id])
      const isDynamic = segment.startsWith('[') && segment.endsWith(']');
      const paramName = isDynamic ? segment.slice(1, -1) : null;
      const paramValue = paramName ? (query[paramName] as string) : null;

      // Build the pattern path (e.g., /items/[id])
      const patternPath = currentPath;
      const config = routeMap[patternPath];

      if (config) {
        const isLast = i === segments.length - 1;
        let label = config.label;

        // Use dynamic label if available and we have a param value
        if (config.dynamicLabel && paramValue) {
          label = config.dynamicLabel(paramValue);
        }

        items.push({
          label,
          href: isLast ? undefined : currentPath.replace(`[${paramName}]`, paramValue || ''),
          icon: config.icon,
        });
      } else {
        // Fallback: use segment name with capitalization
        const label = segment
          .replace(/[[\]]/g, '')
          .split('-')
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');

        items.push({
          label,
          href: undefined,
        });
      }
    }

    return items;
  }, [router.pathname, router.query]);
}
