import type { NextPageWithLayout } from '@/types';
import { AccountLayout } from '@/components/layouts';
import { useState } from 'react';
import { subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { Loading } from '@/components/shared';
import MechanismSelector from '@/components/comparator/MechanismSelector';
import ComparisonChart from '@/components/comparator/ComparisonChart';
import AnalyticalBreakdownTable from '@/components/comparator/AnalyticalBreakdownTable';
import useComparison from '@/hooks/useComparison';
import usePAMs from '@/hooks/usePAMs';

const ComparatorPage: NextPageWithLayout = () => {
  const { pams } = usePAMs();

  // State for mechanism selection
  const [mechanismA, setMechanismA] = useState<string | null>(null);
  const [mechanismB, setMechanismB] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState({
    start: startOfMonth(subMonths(new Date(), 12)),
    end: endOfMonth(new Date()),
  });
  const [anchorProduct, setAnchorProduct] = useState<string | null>(null);
  const [currency, setCurrency] = useState('USD');
  const [hasCompared, setHasCompared] = useState(false);

  // Trigger comparison
  const [comparisonTrigger, setComparisonTrigger] = useState<{
    mechanismA: string | null;
    mechanismB: string | null;
    dateRange: typeof dateRange;
    anchorProduct: string | null;
    currency: string;
  } | null>(null);

  const { data: comparisonData, isLoading } = useComparison(
    comparisonTrigger?.mechanismA || null,
    comparisonTrigger?.mechanismB || null,
    comparisonTrigger?.dateRange || null,
    comparisonTrigger?.anchorProduct || null,
    comparisonTrigger?.currency || 'USD'
  );

  const handleCompare = () => {
    setComparisonTrigger({
      mechanismA,
      mechanismB,
      dateRange,
      anchorProduct,
      currency,
    });
    setHasCompared(true);
  };

  // Get mechanism names
  const mechanismAName = pams?.find((p: any) => p.id === mechanismA)?.name || 'Mechanism A';
  const mechanismBName = pams?.find((p: any) => p.id === mechanismB)?.name || 'Mechanism B';

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Mechanism Sandbox & Comparator</h1>
        <p className="text-gray-600 mt-1">
          Compare two pricing mechanisms side-by-side to understand differences and divergence
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Sidebar: Mechanism Selector */}
        <div className="lg:col-span-1">
          <MechanismSelector
            mechanismA={mechanismA}
            onMechanismAChange={setMechanismA}
            mechanismB={mechanismB}
            onMechanismBChange={setMechanismB}
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            anchorProduct={anchorProduct}
            onAnchorProductChange={setAnchorProduct}
            currency={currency}
            onCurrencyChange={setCurrency}
            onCompare={handleCompare}
            isComparing={isLoading}
          />
        </div>

        {/* Main Content: Chart and Breakdown */}
        <div className="lg:col-span-3">
          {!hasCompared ? (
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body items-center text-center">
                <h2 className="card-title">Welcome to the Comparator</h2>
                <p className="text-gray-600">
                  Select two mechanisms, an anchor product, and analysis period from the left sidebar, then click "Run Comparison" to see results.
                </p>
                <div className="mt-6 text-left max-w-md">
                  <h3 className="font-semibold mb-2">What you'll see:</h3>
                  <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                    <li>Side-by-side comparison chart with shaded divergence areas</li>
                    <li>Key insights including average difference and max divergence</li>
                    <li>Component-level breakdown of formula differences</li>
                    <li>Export options for CSV and PDF reports</li>
                  </ul>
                </div>
              </div>
            </div>
          ) : isLoading ? (
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body items-center">
                <Loading />
                <p className="text-gray-600 mt-4">Running comparison analysis...</p>
              </div>
            </div>
          ) : comparisonData ? (
            <div className="space-y-6">
              <ComparisonChart
                chartData={comparisonData.chartData}
                insights={comparisonData.insights}
                mechanismAName={mechanismAName}
                mechanismBName={mechanismBName}
              />
              <AnalyticalBreakdownTable
                breakdownData={comparisonData.breakdownData}
                mechanismAName={mechanismAName}
                mechanismBName={mechanismBName}
              />
            </div>
          ) : (
            <div className="alert alert-error">
              <span>Failed to load comparison data. Please try again.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

ComparatorPage.getLayout = function getLayout(page: React.ReactElement) {
  return <AccountLayout>{page}</AccountLayout>;
};

export default ComparatorPage;
