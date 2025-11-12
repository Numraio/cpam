import { useRouter } from 'next/router';
import { Button } from '@/components/ui';
import { Card, CardHeader, CardBody } from '@/components/ui';
import {
  CalculatorIcon,
  BeakerIcon,
  ArrowUpTrayIcon,
  CheckCircleIcon,
  BoltIcon,
} from '@heroicons/react/24/outline';

export default function QuickActions() {
  const router = useRouter();

  const actions = [
    {
      label: 'Run Calculation',
      icon: CalculatorIcon,
      variant: 'primary' as const,
      href: '/calculations/new',
    },
    {
      label: 'Create Scenario',
      icon: BeakerIcon,
      variant: 'secondary' as const,
      href: '/scenarios/new',
    },
    {
      label: 'Upload Items',
      icon: ArrowUpTrayIcon,
      variant: 'secondary' as const,
      href: '/items/import',
    },
    {
      label: 'View Approvals',
      icon: CheckCircleIcon,
      variant: 'success' as const,
      href: '/approvals',
    },
  ];

  return (
    <Card variant="elevated">
      <CardHeader>
        <div className="flex items-center gap-3">
          <BoltIcon className="h-6 w-6 text-primary-600" />
          <h2 className="text-xl font-semibold text-gray-900">Quick Actions</h2>
        </div>
      </CardHeader>
      <CardBody>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {actions.map((action) => (
            <Button
              key={action.label}
              variant={action.variant}
              size="lg"
              className="w-full justify-start"
              leftIcon={<action.icon className="h-5 w-5" />}
              onClick={() => router.push(action.href)}
            >
              {action.label}
            </Button>
          ))}
        </div>
      </CardBody>
    </Card>
  );
}
