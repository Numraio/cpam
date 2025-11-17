import type { ReactElement } from 'react';
import type { NextPageWithLayout } from 'types';
import { AccountLayout } from '@/components/layouts';
import { Button } from '@/components/ui/Button';
import { Card, CardBody } from '@/components/ui/Card';
import {
  ChartBarIcon,
  DocumentChartBarIcon,
  ArrowTrendingUpIcon,
  TableCellsIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';
import { useRouter } from 'next/router';
import PageHeader from '@/components/navigation/PageHeader';

const ReportsPage: NextPageWithLayout = () => {
  const router = useRouter();

  const reportTypes = [
    {
      title: 'Exposure Analysis',
      description: 'Analyze total exposure by commodity, contract, or time period',
      icon: ChartBarIcon,
      iconBg: 'bg-primary-100',
      iconColor: 'text-primary-700',
      status: 'Coming Soon',
    },
    {
      title: 'Price Trends',
      description: 'Historical price trends and forecasting',
      icon: ArrowTrendingUpIcon,
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-700',
      status: 'Coming Soon',
    },
    {
      title: 'Calculation Reports',
      description: 'Detailed reports of calculation results and variances',
      icon: TableCellsIcon,
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-700',
      status: 'Coming Soon',
    },
    {
      title: 'Compliance Reports',
      description: 'Audit trails and compliance documentation',
      icon: DocumentChartBarIcon,
      iconBg: 'bg-success-light/20',
      iconColor: 'text-success',
      status: 'Coming Soon',
    },
  ];

  return (
    <div className="p-6">
      <PageHeader
        title="Reports & Analytics"
        subtitle="Generate insights and reports from your pricing data"
        sticky
      />

      {/* Report Types Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {reportTypes.map((report) => (
          <Card key={report.title} variant="elevated" className="hover:shadow-lg transition-shadow duration-normal">
            <CardBody>
              <div className="flex items-start gap-4 mb-4">
                <div className={`p-3 ${report.iconBg} rounded-lg`}>
                  <report.icon className={`h-8 w-8 ${report.iconColor}`} />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-semibold text-gray-900">{report.title}</h2>
                  {report.status && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-warning-light/20 text-warning mt-1">
                      {report.status}
                    </span>
                  )}
                </div>
              </div>
              <p className="text-gray-600 mb-4">{report.description}</p>
              <div className="flex justify-end">
                <Button
                  size="sm"
                  variant="primary"
                  disabled={report.status === 'Coming Soon'}
                >
                  Generate Report
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
            <h3 className="font-semibold text-gray-900 mb-2">Reports & Analytics</h3>
            <div className="text-sm text-gray-700">
              Reporting features are currently in development. The following reports will be available soon:
              <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                <li>Exposure analysis by commodity, contract, and time period</li>
                <li>Price trend analysis and forecasting</li>
                <li>Calculation result reports with variance analysis</li>
                <li>Compliance and audit trail reports</li>
                <li>Custom report builder</li>
                <li>Scheduled report delivery via email</li>
                <li>Export to PDF, Excel, and CSV</li>
              </ul>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
};

ReportsPage.getLayout = function getLayout(page: ReactElement) {
  return <AccountLayout>{page}</AccountLayout>;
};

export default ReportsPage;
