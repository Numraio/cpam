import { useState } from 'react';
import { subMonths, subYears, startOfMonth, endOfMonth } from 'date-fns';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';

export interface DateRange {
  start: Date;
  end: Date;
}

interface HistoricalControlPanelProps {
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
  baselineDate: Date;
  onBaselineDateChange: (date: Date) => void;
  viewMode: 'component' | 'mechanism';
  onViewModeChange: (mode: 'component' | 'mechanism') => void;
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY';
  onFrequencyChange: (freq: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY') => void;
}

export default function HistoricalControlPanel({
  dateRange,
  onDateRangeChange,
  baselineDate,
  onBaselineDateChange,
  viewMode,
  onViewModeChange,
  frequency,
  onFrequencyChange,
}: HistoricalControlPanelProps) {
  const [showDateRangePicker, setShowDateRangePicker] = useState(false);
  const [showBaselinePicker, setShowBaselinePicker] = useState(false);

  const applyPreset = (preset: string) => {
    const end = endOfMonth(new Date());
    let start: Date;

    switch (preset) {
      case '12months':
        start = startOfMonth(subMonths(end, 12));
        break;
      case '3years':
        start = startOfMonth(subYears(end, 3));
        break;
      case '5years':
        start = startOfMonth(subYears(end, 5));
        break;
      default:
        return;
    }

    onDateRangeChange({ start, end });
    setShowDateRangePicker(false);
  };

  return (
    <div className="bg-base-100 rounded-lg shadow-lg p-6 space-y-6">
      <h3 className="font-bold text-lg">Historical Performance Controls</h3>

      {/* Date Range Selector */}
      <div>
        <label className="label">
          <span className="label-text font-medium">Date Range</span>
        </label>
        <div className="flex gap-2">
          <button
            className="btn btn-sm btn-outline"
            onClick={() => setShowDateRangePicker(!showDateRangePicker)}
          >
            {dateRange.start.toLocaleDateString()} - {dateRange.end.toLocaleDateString()}
          </button>
          <div className="flex gap-1">
            <button
              className="btn btn-sm btn-ghost"
              onClick={() => applyPreset('12months')}
            >
              Last 12 Months
            </button>
            <button
              className="btn btn-sm btn-ghost"
              onClick={() => applyPreset('3years')}
            >
              Last 3 Years
            </button>
            <button
              className="btn btn-sm btn-ghost"
              onClick={() => applyPreset('5years')}
            >
              Last 5 Years
            </button>
          </div>
        </div>

        {showDateRangePicker && (
          <div className="mt-4 p-4 bg-base-200 rounded-lg">
            <DayPicker
              mode="range"
              selected={{ from: dateRange.start, to: dateRange.end }}
              onSelect={(range) => {
                if (range?.from && range?.to) {
                  onDateRangeChange({ start: range.from, end: range.to });
                  setShowDateRangePicker(false);
                }
              }}
              numberOfMonths={2}
            />
          </div>
        )}
      </div>

      {/* Baseline Date Picker */}
      <div>
        <label className="label">
          <span className="label-text font-medium">Baseline Start Date</span>
          <span className="label-text-alt">All lines start at 100 on this date</span>
        </label>
        <button
          className="btn btn-sm btn-outline w-full"
          onClick={() => setShowBaselinePicker(!showBaselinePicker)}
        >
          {baselineDate.toLocaleDateString()}
        </button>

        {showBaselinePicker && (
          <div className="mt-4 p-4 bg-base-200 rounded-lg">
            <DayPicker
              mode="single"
              selected={baselineDate}
              onSelect={(date) => {
                if (date) {
                  onBaselineDateChange(date);
                  setShowBaselinePicker(false);
                }
              }}
              disabled={{ after: new Date() }}
            />
          </div>
        )}
      </div>

      {/* View Toggle */}
      <div>
        <label className="label">
          <span className="label-text font-medium">View Mode</span>
        </label>
        <div className="btn-group w-full">
          <button
            className={`btn btn-sm flex-1 ${viewMode === 'component' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => onViewModeChange('component')}
          >
            Component Movement
          </button>
          <button
            className={`btn btn-sm flex-1 ${viewMode === 'mechanism' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => onViewModeChange('mechanism')}
          >
            Mechanism Performance
          </button>
        </div>
        <label className="label">
          <span className="label-text-alt">
            {viewMode === 'component'
              ? 'Shows individual index lines'
              : 'Shows blended formula output'}
          </span>
        </label>
      </div>

      {/* Frequency Selector */}
      <div>
        <label className="label">
          <span className="label-text font-medium">Data Frequency</span>
        </label>
        <select
          className="select select-bordered w-full"
          value={frequency}
          onChange={(e) =>
            onFrequencyChange(
              e.target.value as 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY'
            )
          }
        >
          <option value="QUARTERLY">Quarterly</option>
          <option value="MONTHLY">Monthly</option>
          <option value="WEEKLY">Weekly</option>
          <option value="DAILY">Daily</option>
        </select>
      </div>

      {/* Info Alert */}
      <div className="alert alert-info">
        <div className="text-xs">
          <p className="font-semibold mb-1">How to use:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Change baseline date to compare relative movement from any point</li>
            <li>Toggle view mode to see components or blended mechanism</li>
            <li>Adjust frequency for granular or high-level trends</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
