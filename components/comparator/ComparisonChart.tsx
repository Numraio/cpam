import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { format } from 'date-fns';

interface ComparisonChartData {
  date: string;
  mechanismA: number;
  mechanismB: number;
  difference: number;
}

interface ComparisonInsights {
  averageDifference: number;
  maxDivergence: {
    date: string;
    value: number;
    mechanismFavored: 'A' | 'B';
  };
}

interface ComparisonChartProps {
  chartData: ComparisonChartData[];
  insights: ComparisonInsights;
  mechanismAName: string;
  mechanismBName: string;
}

export default function ComparisonChart({
  chartData,
  insights,
  mechanismAName,
  mechanismBName,
}: ComparisonChartProps) {
  // Transform data for charting
  const transformedData = chartData.map((d) => ({
    ...d,
    formattedDate: format(new Date(d.date), 'MMM yyyy'),
  }));

  return (
    <div className="bg-base-100 rounded-lg shadow-lg p-6">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="font-bold text-lg">
            Historical Price Index Movement: {mechanismAName} vs. {mechanismBName}
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Normalized to P₀ = 100 | Blue areas show when Mechanism A is higher, Orange when Mechanism B is higher
          </p>
        </div>

        {/* Key Insights Widget */}
        <div className="card bg-base-200 shadow-sm p-4 min-w-[250px]">
          <h4 className="font-semibold text-sm mb-2">Key Insights</h4>
          <div className="space-y-2 text-xs">
            <div>
              <span className="font-medium">Avg Difference:</span>{' '}
              <span
                className={
                  insights.averageDifference > 0 ? 'text-blue-600' : 'text-orange-600'
                }
              >
                {insights.averageDifference > 0 ? '+' : ''}
                {insights.averageDifference.toFixed(2)}%
              </span>
            </div>
            <div>
              <span className="font-medium">Max Divergence:</span>{' '}
              <span
                className={
                  insights.maxDivergence.mechanismFavored === 'A'
                    ? 'text-blue-600'
                    : 'text-orange-600'
                }
              >
                Mechanism {insights.maxDivergence.mechanismFavored} was{' '}
                {insights.maxDivergence.value.toFixed(2)}% higher
              </span>
            </div>
            <div className="text-gray-600">
              on {format(new Date(insights.maxDivergence.date), 'MMM yyyy')}
            </div>
          </div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={400}>
        <AreaChart data={transformedData}>
          <defs>
            {/* Blue shading for when Mechanism A is higher */}
            <linearGradient id="blueShade" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05} />
            </linearGradient>
            {/* Orange shading for when Mechanism B is higher */}
            <linearGradient id="orangeShade" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#f97316" stopOpacity={0.05} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="formattedDate"
            tick={{ fontSize: 12 }}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis
            label={{
              value: 'Normalized Index (P₀ = 100)',
              angle: -90,
              position: 'insideLeft',
              style: { fontSize: 12 },
            }}
            tick={{ fontSize: 12 }}
          />
          <Tooltip content={<CustomTooltip mechanismAName={mechanismAName} mechanismBName={mechanismBName} />} />
          <Legend />

          {/* Baseline reference line */}
          <ReferenceLine
            y={100}
            stroke="#9ca3af"
            strokeDasharray="3 3"
            label={{ value: 'P₀ = 100', position: 'right', fontSize: 10 }}
          />

          {/* Areas for shading between lines */}
          <Area
            type="monotone"
            dataKey="mechanismA"
            stroke="#3b82f6"
            strokeWidth={3}
            fill="url(#blueShade)"
            name={`${mechanismAName} (Solid)`}
            dot={false}
          />
          <Area
            type="monotone"
            dataKey="mechanismB"
            stroke="#f97316"
            strokeWidth={3}
            strokeDasharray="5 5"
            fill="url(#orangeShade)"
            name={`${mechanismBName} (Dashed)`}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>

      <div className="mt-4 text-xs text-gray-600">
        💡 <strong>Tip:</strong> The shaded areas between the lines show which mechanism was more favorable during each period.
        Blue shading indicates Mechanism A was higher, orange indicates Mechanism B was higher.
      </div>
    </div>
  );
}

function CustomTooltip({ active, payload, label, mechanismAName, mechanismBName }: any) {
  if (active && payload && payload.length) {
    const mechanismAValue = payload[0]?.value;
    const mechanismBValue = payload[1]?.value;
    const difference = mechanismAValue - mechanismBValue;

    return (
      <div className="bg-white p-3 border border-gray-300 rounded shadow-lg">
        <p className="font-semibold mb-2">{label}</p>
        <div className="space-y-1 text-sm">
          <div style={{ color: '#3b82f6' }}>
            <span className="font-medium">{mechanismAName}:</span>{' '}
            <span className="font-semibold">{mechanismAValue?.toFixed(2)}</span>
          </div>
          <div style={{ color: '#f97316' }}>
            <span className="font-medium">{mechanismBName}:</span>{' '}
            <span className="font-semibold">{mechanismBValue?.toFixed(2)}</span>
          </div>
          <div className="pt-1 border-t border-gray-200 text-gray-700">
            <span className="font-medium">Difference:</span>{' '}
            <span
              className={`font-semibold ${difference > 0 ? 'text-blue-600' : 'text-orange-600'}`}
            >
              {difference > 0 ? '+' : ''}
              {difference?.toFixed(2)} ({((difference / mechanismBValue) * 100).toFixed(2)}%)
            </span>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
