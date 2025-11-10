import { useRouter } from 'next/router';
import { Button } from 'react-daisyui';
import {
  CalculatorIcon,
  BeakerIcon,
  ArrowUpTrayIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';

export default function QuickActions() {
  const router = useRouter();

  const actions = [
    {
      label: 'Run Calculation',
      icon: CalculatorIcon,
      color: 'primary' as const,
      href: '/calculations/new',
    },
    {
      label: 'Create Scenario',
      icon: BeakerIcon,
      color: 'secondary' as const,
      href: '/scenarios/new',
    },
    {
      label: 'Upload Items',
      icon: ArrowUpTrayIcon,
      color: 'accent' as const,
      href: '/items/import',
    },
    {
      label: 'View Approvals',
      icon: CheckCircleIcon,
      color: 'success' as const,
      href: '/approvals',
    },
  ];

  return (
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body">
        <h2 className="card-title">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
          {actions.map((action) => (
            <Button
              key={action.label}
              color={action.color}
              size="lg"
              className="justify-start"
              startIcon={<action.icon className="h-6 w-6" />}
              onClick={() => router.push(action.href)}
            >
              {action.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
