import { useState } from 'react';
import { MagnifyingGlassIcon, PlusIcon } from '@heroicons/react/24/outline';
import { useRouter } from 'next/router';
import { subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import usePAMs from '@/hooks/usePAMs';
import useItems from '@/hooks/useItems';

export interface DateRange {
  start: Date;
  end: Date;
}

interface MechanismSelectorProps {
  mechanismA: string | null;
  onMechanismAChange: (id: string | null) => void;
  mechanismB: string | null;
  onMechanismBChange: (id: string | null) => void;
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
  anchorProduct: string | null;
  onAnchorProductChange: (id: string | null) => void;
  currency: string;
  onCurrencyChange: (currency: string) => void;
  onCompare: () => void;
  isComparing: boolean;
}

export default function MechanismSelector({
  mechanismA,
  onMechanismAChange,
  mechanismB,
  onMechanismBChange,
  dateRange,
  onDateRangeChange,
  anchorProduct,
  onAnchorProductChange,
  currency,
  onCurrencyChange,
  onCompare,
  isComparing,
}: MechanismSelectorProps) {
  const router = useRouter();
  const { pams, isLoading: pamsLoading } = usePAMs();
  const { items, isLoading: itemsLoading } = useItems();
  const [showDatePicker, setShowDatePicker] = useState(false);

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'badge-success';
      case 'TEST':
        return 'badge-warning';
      case 'DRAFT':
      default:
        return 'badge-ghost';
    }
  };

  const isReady = mechanismA && mechanismB && anchorProduct;

  return (
    <div className="bg-base-100 rounded-lg shadow-lg p-6 space-y-6">
      <h3 className="font-bold text-lg">Select Mechanisms to Compare</h3>

      {/* Mechanism A Selector */}
      <div>
        <label className="label">
          <span className="label-text font-medium">Mechanism A (Benchmark)</span>
        </label>
        <select
          className="select select-bordered w-full"
          value={mechanismA || ''}
          onChange={(e) => onMechanismAChange(e.target.value || null)}
          disabled={pamsLoading}
        >
          <option value="">Select mechanism...</option>
          {pams?.map((pam: any) => (
            <option key={pam.id} value={pam.id}>
              {pam.name} [{pam.status}]
            </option>
          ))}
        </select>
        {mechanismA && pams && (
          <div className="mt-2">
            <span
              className={`badge badge-sm ${getStatusBadgeClass(
                pams.find((p: any) => p.id === mechanismA)?.status
              )}`}
            >
              {pams.find((p: any) => p.id === mechanismA)?.status}
            </span>
          </div>
        )}
      </div>

      {/* Mechanism B Selector */}
      <div>
        <label className="label">
          <span className="label-text font-medium">Mechanism B (Alternative)</span>
        </label>
        <select
          className="select select-bordered w-full"
          value={mechanismB || ''}
          onChange={(e) => onMechanismBChange(e.target.value || null)}
          disabled={pamsLoading}
        >
          <option value="">Select mechanism...</option>
          {pams?.map((pam: any) => (
            <option key={pam.id} value={pam.id}>
              {pam.name} [{pam.status}]
            </option>
          ))}
        </select>
        {mechanismB && pams && (
          <div className="mt-2">
            <span
              className={`badge badge-sm ${getStatusBadgeClass(
                pams.find((p: any) => p.id === mechanismB)?.status
              )}`}
            >
              {pams.find((p: any) => p.id === mechanismB)?.status}
            </span>
          </div>
        )}
        <button
          className="btn btn-sm btn-ghost w-full mt-2"
          onClick={() => router.push('/pams/new')}
        >
          <PlusIcon className="h-4 w-4 mr-1" />
          Create Test Formula
        </button>
      </div>

      {/* Date Range */}
      <div>
        <label className="label">
          <span className="label-text font-medium">Analysis Period</span>
        </label>
        <button
          className="btn btn-sm btn-outline w-full"
          onClick={() => setShowDatePicker(!showDatePicker)}
        >
          {dateRange.start.toLocaleDateString()} - {dateRange.end.toLocaleDateString()}
        </button>

        {showDatePicker && (
          <div className="mt-4 p-4 bg-base-200 rounded-lg">
            <DayPicker
              mode="range"
              selected={{ from: dateRange.start, to: dateRange.end }}
              onSelect={(range) => {
                if (range?.from && range?.to) {
                  onDateRangeChange({ start: range.from, end: range.to });
                  setShowDatePicker(false);
                }
              }}
              numberOfMonths={2}
            />
          </div>
        )}
      </div>

      {/* Anchor Product */}
      <div>
        <label className="label">
          <span className="label-text font-medium">Anchor Product for P₀ (Base Price)</span>
        </label>
        <select
          className="select select-bordered w-full"
          value={anchorProduct || ''}
          onChange={(e) => onAnchorProductChange(e.target.value || null)}
          disabled={itemsLoading}
        >
          <option value="">Select product...</option>
          {items?.map((item: any) => (
            <option key={item.id} value={item.id}>
              {item.name} ({item.sku}) - ${parseFloat(item.basePrice).toFixed(2)} {item.currency}
            </option>
          ))}
        </select>
      </div>

      {/* Currency */}
      <div>
        <label className="label">
          <span className="label-text font-medium">Compare in</span>
        </label>
        <select
          className="select select-bordered w-full"
          value={currency}
          onChange={(e) => onCurrencyChange(e.target.value)}
        >
          <option value="USD">USD</option>
          <option value="EUR">EUR</option>
          <option value="GBP">GBP</option>
          <option value="Local">Local Currency</option>
        </select>
      </div>

      {/* Compare Button */}
      <button
        className="btn btn-primary w-full"
        onClick={onCompare}
        disabled={!isReady || isComparing}
        loading={isComparing}
      >
        {isComparing ? 'Comparing...' : 'Run Comparison'}
      </button>

      {/* Info */}
      <div className="alert alert-info">
        <div className="text-xs">
          <p className="font-semibold mb-1">How to use:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Select two mechanisms to compare side-by-side</li>
            <li>Choose an anchor product to establish base price (P₀)</li>
            <li>Click "Run Comparison" to generate analysis</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
