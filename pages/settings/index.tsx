import type { ReactElement } from 'react';
import type { NextPageWithLayout } from 'types';
import { AccountLayout } from '@/components/layouts';
import { Button } from '@/components/ui/Button';
import { Card, CardBody } from '@/components/ui/Card';
import {
  CloudIcon,
  ArrowsRightLeftIcon,
  BellIcon,
  Cog6ToothIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';
import { useRouter } from 'next/router';

const SettingsPage: NextPageWithLayout = () => {
  const router = useRouter();

  const settingSections = [
    {
      title: 'Data Providers',
      description: 'Configure API connections for Platts, Oanda, BLS, and other data sources',
      icon: CloudIcon,
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-700',
      status: 'Coming Soon',
      items: [
        'API key management',
        'Connection testing',
        'Sync schedules',
        'Provider status monitoring',
      ],
    },
    {
      title: 'Unit Conversions',
      description: 'Manage currency, volume, and weight conversion factors',
      icon: ArrowsRightLeftIcon,
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-700',
      status: 'Coming Soon',
      items: [
        'Currency conversions (FX rates)',
        'Volume conversions (MT, kg, lb)',
        'Weight conversions',
        'Custom conversion factors',
      ],
    },
    {
      title: 'Notifications',
      description: 'Configure email alerts and notification preferences',
      icon: BellIcon,
      iconBg: 'bg-success-light/20',
      iconColor: 'text-success',
      status: 'Coming Soon',
      items: [
        'Calculation completion alerts',
        'Approval reminder emails',
        'Data staleness warnings',
        'Daily/weekly summaries',
      ],
    },
    {
      title: 'Team Settings',
      description: 'Manage team members, roles, and permissions',
      icon: Cog6ToothIcon,
      iconBg: 'bg-primary-100',
      iconColor: 'text-primary-700',
      status: 'Coming Soon',
      items: [
        'User roles and permissions',
        'Team member invitations',
        'Access control policies',
        'Audit log retention',
      ],
    },
  ];

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-2">
          Configure system settings and integrations
        </p>
      </div>

      {/* Settings Sections Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {settingSections.map((section) => (
          <Card
            key={section.title}
            variant="elevated"
            className="hover:shadow-lg transition-shadow duration-normal"
          >
            <CardBody>
              <div className="flex items-start gap-4 mb-4">
                <div className={`p-3 ${section.iconBg} rounded-lg`}>
                  <section.icon className={`h-8 w-8 ${section.iconColor}`} />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-semibold text-gray-900">
                    {section.title}
                  </h2>
                  {section.status && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-warning-light/20 text-warning mt-1">
                      {section.status}
                    </span>
                  )}
                </div>
              </div>
              <p className="text-gray-600 mb-3">{section.description}</p>
              <ul className="text-sm text-gray-600 space-y-1 mb-4">
                {section.items.map((item) => (
                  <li key={item} className="flex items-start">
                    <span className="text-gray-400 mr-2">•</span>
                    {item}
                  </li>
                ))}
              </ul>
              <div className="flex justify-end">
                <Button
                  size="sm"
                  variant="primary"
                  disabled={section.status === 'Coming Soon'}
                >
                  Configure
                </Button>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      {/* Info Alert */}
      <Card variant="bordered" className="border-l-4 border-l-blue-500">
        <CardBody className="flex items-start gap-3">
          <InformationCircleIcon className="h-6 w-6 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">
              Settings Configuration
            </h3>
            <div className="text-sm text-gray-700">
              Settings and configuration features are currently in development.
              The following configuration options will be available soon:
              <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                <li>
                  <strong>Data Providers:</strong> Connect to Platts, Oanda,
                  BLS, Eurostat, and custom APIs
                </li>
                <li>
                  <strong>Unit Conversions:</strong> Manage currency (FX),
                  volume, and weight conversions
                </li>
                <li>
                  <strong>Notifications:</strong> Configure email alerts for
                  calculations, approvals, and data issues
                </li>
                <li>
                  <strong>Team Management:</strong> Set up roles, permissions,
                  and access controls
                </li>
                <li>
                  <strong>Integrations:</strong> Connect to SAP S/4, Coupa, and
                  other ERP systems
                </li>
                <li>
                  <strong>Audit & Compliance:</strong> Configure audit log
                  retention and compliance reports
                </li>
              </ul>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
};

SettingsPage.getLayout = function getLayout(page: ReactElement) {
  return <AccountLayout>{page}</AccountLayout>;
};

export default SettingsPage;
