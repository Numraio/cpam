import { useState } from 'react';
import {
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

interface SeriesData {
  seriesCode: string;
  seriesName: string;
  values: Array<{
    date: string;
    actualValue: number;
    normalizedValue: number;
  }>;
}

interface HistoricalPerformanceChartProps {
  componentData: SeriesData[];
  mechanismData: Array<{
    date: string;
    actualValue: number;
    normalizedValue: number;
  }>;
  viewMode: 'component' | 'mechanism';
}

const COLORS = [
  '#3b82f6', // blue
  '#ef4444', // red
  '#10b981', // green
  '#f59e0b', // amber
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#14b8a6', // teal
  '#f97316', // orange
];

export default function HistoricalPerformanceChart({
  componentData,
  mechanismData,
  viewMode,
}: HistoricalPerformanceChartProps) {
  const [hiddenSeries, setHiddenSeries] = useState<Set<string>>(new Set());

  // Transform data for Recharts format
  const chartData = viewMode === 'mechanism' ? transformMechanismData(mechanismData) : transformComponentData(componentData, hiddenSeries);

  // Calculate max and min values for labels
  const allValues = chartData.flatMap((d) =>
    Object.keys(d)
      .filter((key) => key !== 'date' && key !== 'formattedDate')
      .map((key) => d[key] as number)
  );
  const maxValue = Math.max(...allValues);
  const minValue = Math.min(...allValues);

  const toggleSeries = (seriesCode: string) => {
    const newHidden = new Set(hiddenSeries);
    if (newHidden.has(seriesCode)) {
      newHidden.delete(seriesCode);
    } else {
      newHidden.add(seriesCode);
    }
    setHiddenSeries(newHidden);
  };

  return (
    <div className="bg-base-100 rounded-lg shadow-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-lg">
          {viewMode === 'mechanism'
            ? 'Mechanism Performance Over Time'
            : 'Component Movement Over Time'}
        </h3>
        {chartData.length > 0 && (
          <div className="text-sm text-gray-600">
            <span className="font-semibold">Max:</span> {maxValue.toFixed(2)} |{' '}
            <span className="font-semibold">Min:</span> {minValue.toFixed(2)}
          </div>
        )}
      </div>

      {chartData.length === 0 ? (
        <div className="alert alert-warning">
          <span>No historical data available for the selected date range.</span>
        </div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData}>
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
                  value: 'Normalized Index Value',
                  angle: -90,
                  position: 'insideLeft',
                  style: { fontSize: 12 },
                }}
                tick={{ fontSize: 12 }}
              />
              <Tooltip
                content={<CustomTooltip />}
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc' }}
              />
              <Legend
                onClick={(e) => {
                  if (viewMode === 'component') {
                    toggleSeries(e.dataKey as string);
                  }
                }}
                wrapperStyle={{ cursor: viewMode === 'component' ? 'pointer' : 'default' }}
              />
              <ReferenceLine
                y={100}
                stroke="#9ca3af"
                strokeDasharray="3 3"
                label={{ value: 'Baseline (100)', position: 'right', fontSize: 10 }}
              />
              {viewMode === 'mechanism' ? (
                <Line
                  type="monotone"
                  dataKey="mechanismValue"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  name="Mechanism Performance"
                  dot={false}
                  activeDot={{ r: 6 }}
                />
              ) : (
                componentData.map((series, index) =>
                  !hiddenSeries.has(series.seriesCode) ? (
                    <Line
                      key={series.seriesCode}
                      type="monotone"
                      dataKey={series.seriesCode}
                      stroke={COLORS[index % COLORS.length]}
                      strokeWidth={2}
                      name={series.seriesName}
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                  ) : null
                )
              )}
            </LineChart>
          </ResponsiveContainer>

          {viewMode === 'component' && (
            <div className="mt-4">
              <p className="text-xs text-gray-600">
                💡 <strong>Tip:</strong> Click legend items to show/hide individual components
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function transformMechanismData(
  mechanismData: Array<{
    date: string;
    actualValue: number;
    normalizedValue: number;
  }>
) {
  return mechanismData.map((d) => ({
    date: d.date,
    formattedDate: format(new Date(d.date), 'MMM yyyy'),
    mechanismValue: d.normalizedValue,
    actualValue: d.actualValue,
  }));
}

function transformComponentData(
  componentData: SeriesData[],
  hiddenSeries: Set<string>
) {
  if (componentData.length === 0) return [];

  // Get all unique dates
  const allDates = new Set<string>();
  componentData.forEach((series) => {
    series.values.forEach((v) => allDates.add(v.date));
  });

  const sortedDates = Array.from(allDates).sort();

  return sortedDates.map((date) => {
    const point: any = {
      date,
      formattedDate: format(new Date(date), 'MMM yyyy'),
    };

    componentData.forEach((series) => {
      if (!hiddenSeries.has(series.seriesCode)) {
        const value = series.values.find((v) => v.date === date);
        if (value) {
          point[series.seriesCode] = value.normalizedValue;
          point[`${series.seriesCode}_actual`] = value.actualValue;
        }
      }
    });

    return point;
  });
}

function CustomTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-gray-300 rounded shadow-lg">
        <p className="font-semibold mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="text-sm" style={{ color: entry.color }}>
            <span className="font-medium">{entry.name}:</span>{' '}
            <span className="font-semibold">{entry.value?.toFixed(2)}</span>
            {entry.payload[`${entry.dataKey}_actual`] && (
              <span className="text-gray-600 text-xs ml-1">
                (${entry.payload[`${entry.dataKey}_actual`].toFixed(2)})
              </span>
            )}
          </div>
        ))}
      </div>
    );
  }

  return null;
}
