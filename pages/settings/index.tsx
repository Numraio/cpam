import type { ReactElement } from 'react';
import type { NextPageWithLayout } from 'types';
import { AccountLayout } from '@/components/layouts';
import { Button } from 'react-daisyui';
import {
  Cog6ToothIcon,
  BellIcon,
  CubeIcon,
  LinkIcon,
} from '@heroicons/react/24/outline';
import { useRouter } from 'next/router';

const SettingsPage: NextPageWithLayout = () => {
  const router = useRouter();

  const settingsSections = [
    {
      title: 'Data Providers',
      description: 'Configure data provider connections and credentials',
      icon: LinkIcon,
      color: 'primary' as const,
      href: '/settings/providers',
      status: 'Coming Soon',
    },
    {
      title: 'Unit Conversions',
      description: 'Manage unit of measure conversions',
      icon: CubeIcon,
      color: 'secondary' as const,
      href: '/settings/units',
      status: 'Coming Soon',
    },
    {
      title: 'Notifications',
      description: 'Configure email and Slack notification preferences',
      icon: BellIcon,
      color: 'accent' as const,
      href: '/settings/notifications',
      status: 'Coming Soon',
    },
    {
      title: 'Team Settings',
      description: 'Default calculation settings and preferences',
      icon: Cog6ToothIcon,
      color: 'info' as const,
      href: '/settings/team',
      status: 'Coming Soon',
    },
  ];

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-gray-600 mt-1">
          Configure your CPAM application settings and preferences
        </p>
      </div>

      {/* Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {settingsSections.map((section) => (
          <div key={section.title} className="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow">
            <div className="card-body">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`p-3 bg-${section.color} bg-opacity-10 rounded-lg`}>
                    <section.icon className="h-8 w-8 text-${section.color}" />
                  </div>
                  <div>
                    <h2 className="card-title">{section.title}</h2>
                    {section.status && (
                      <span className="badge badge-warning badge-sm">{section.status}</span>
                    )}
                  </div>
                </div>
              </div>
              <p className="text-gray-600">{section.description}</p>
              <div className="card-actions justify-end mt-4">
                <Button
                  size="sm"
                  color={section.color}
                  onClick={() => router.push(section.href)}
                  disabled={section.status === 'Coming Soon'}
                >
                  Configure
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Info Alert */}
      <div className="alert alert-info mt-6">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
        <div>
          <h3 className="font-bold">Settings Configuration</h3>
          <div className="text-sm">
            Settings pages are currently in development. The following features will be available soon:
            <ul className="list-disc list-inside ml-4 mt-2">
              <li>Data provider configuration (Oanda, Platts, etc.)</li>
              <li>Unit of measure conversions</li>
              <li>Email and Slack notifications</li>
              <li>Team-wide defaults and preferences</li>
              <li>Integration management</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

SettingsPage.getLayout = function getLayout(page: ReactElement) {
  return <AccountLayout>{page}</AccountLayout>;
};

export default SettingsPage;
