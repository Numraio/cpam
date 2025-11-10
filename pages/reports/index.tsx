import type { ReactElement } from 'react';
import type { NextPageWithLayout } from 'types';
import { AccountLayout } from '@/components/layouts';
import { Button } from 'react-daisyui';
import {
  ChartBarIcon,
  DocumentChartBarIcon,
  ArrowTrendingUpIcon,
  TableCellsIcon,
} from '@heroicons/react/24/outline';
import { useRouter } from 'next/router';

const ReportsPage: NextPageWithLayout = () => {
  const router = useRouter();

  const reportTypes = [
    {
      title: 'Exposure Analysis',
      description: 'Analyze total exposure by commodity, contract, or time period',
      icon: ChartBarIcon,
      color: 'primary' as const,
      status: 'Coming Soon',
    },
    {
      title: 'Price Trends',
      description: 'Historical price trends and forecasting',
      icon: ArrowTrendingUpIcon,
      color: 'secondary' as const,
      status: 'Coming Soon',
    },
    {
      title: 'Calculation Reports',
      description: 'Detailed reports of calculation results and variances',
      icon: TableCellsIcon,
      color: 'accent' as const,
      status: 'Coming Soon',
    },
    {
      title: 'Compliance Reports',
      description: 'Audit trails and compliance documentation',
      icon: DocumentChartBarIcon,
      color: 'info' as const,
      status: 'Coming Soon',
    },
  ];

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Reports & Analytics</h1>
        <p className="text-gray-600 mt-1">
          Generate insights and reports from your pricing data
        </p>
      </div>

      {/* Report Types Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {reportTypes.map((report) => (
          <div key={report.title} className="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow">
            <div className="card-body">
              <div className="flex items-start gap-3 mb-4">
                <div className={`p-3 bg-${report.color} bg-opacity-10 rounded-lg`}>
                  <report.icon className="h-8 w-8" />
                </div>
                <div>
                  <h2 className="card-title">{report.title}</h2>
                  {report.status && (
                    <span className="badge badge-warning badge-sm">{report.status}</span>
                  )}
                </div>
              </div>
              <p className="text-gray-600">{report.description}</p>
              <div className="card-actions justify-end mt-4">
                <Button
                  size="sm"
                  color={report.color}
                  disabled={report.status === 'Coming Soon'}
                >
                  Generate Report
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Info Alert */}
      <div className="alert alert-info">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
        <div>
          <h3 className="font-bold">Reports & Analytics</h3>
          <div className="text-sm">
            Reporting features are currently in development. The following reports will be available soon:
            <ul className="list-disc list-inside ml-4 mt-2">
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
      </div>
    </div>
  );
};

ReportsPage.getLayout = function getLayout(page: ReactElement) {
  return <AccountLayout>{page}</AccountLayout>;
};

export default ReportsPage;
