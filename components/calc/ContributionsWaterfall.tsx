/**
 * Contributions Waterfall Component
 *
 * Displays a waterfall chart showing how each factor/node contributes
 * to the final adjusted price. Includes tabular fallback for accessibility.
 */

'use client';

import React, { useState, useMemo } from 'react';
import Decimal from 'decimal.js';

// ============================================================================
// Types
// ============================================================================

export interface WaterfallData {
  /** Base price (starting value) */
  basePrice: number;
  /** Base currency */
  baseCurrency: string;
  /** Final adjusted price */
  adjustedPrice: number;
  /** Final currency */
  adjustedCurrency: string;
  /** Node contributions: nodeId → value */
  contributions: Record<string, number>;
  /** Optional node labels for display */
  nodeLabels?: Record<string, string>;
}

interface WaterfallSegment {
  nodeId: string;
  label: string;
  value: number;
  absoluteValue: number;
  type: 'increase' | 'decrease' | 'base' | 'final';
  cumulativeValue: number;
  percentage: number;
}

interface ContributionsWaterfallProps {
  data: WaterfallData;
  /** Display mode: chart or table */
  mode?: 'chart' | 'table';
  /** Show percentage contributions */
  showPercentages?: boolean;
  /** Decimal places for display */
  decimals?: number;
}

// ============================================================================
// Component
// ============================================================================

export default function ContributionsWaterfall({
  data,
  mode: initialMode = 'chart',
  showPercentages = true,
  decimals = 2,
}: ContributionsWaterfallProps) {
  const [mode, setMode] = useState<'chart' | 'table'>(initialMode);

  // Compute waterfall segments
  const segments = useMemo(
    () => computeWaterfallSegments(data),
    [data]
  );

  const totalDelta = data.adjustedPrice - data.basePrice;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold">Price Contributions</h3>
          <p className="text-sm text-base-content/60">
            {data.baseCurrency} {formatNumber(data.basePrice, decimals)} →{' '}
            {data.adjustedCurrency} {formatNumber(data.adjustedPrice, decimals)}{' '}
            <span
              className={
                totalDelta >= 0 ? 'text-success' : 'text-error'
              }
            >
              ({totalDelta >= 0 ? '+' : ''}
              {formatNumber(totalDelta, decimals)})
            </span>
          </p>
        </div>

        {/* Mode Toggle */}
        <div className="btn-group">
          <button
            className={`btn btn-sm ${mode === 'chart' ? 'btn-active' : ''}`}
            onClick={() => setMode('chart')}
          >
            📊 Chart
          </button>
          <button
            className={`btn btn-sm ${mode === 'table' ? 'btn-active' : ''}`}
            onClick={() => setMode('table')}
          >
            📋 Table
          </button>
        </div>
      </div>

      {/* Content */}
      {mode === 'chart' ? (
        <WaterfallChart
          segments={segments}
          decimals={decimals}
          showPercentages={showPercentages}
          currency={data.adjustedCurrency}
        />
      ) : (
        <WaterfallTable
          segments={segments}
          decimals={decimals}
          showPercentages={showPercentages}
          currency={data.adjustedCurrency}
        />
      )}
    </div>
  );
}

// ============================================================================
// Waterfall Chart
// ============================================================================

function WaterfallChart({
  segments,
  decimals,
  showPercentages,
  currency,
}: {
  segments: WaterfallSegment[];
  decimals: number;
  showPercentages: boolean;
  currency: string;
}) {
  // Find min/max for scaling
  const allValues = segments.map((s) => s.cumulativeValue);
  const min = Math.min(...allValues, 0);
  const max = Math.max(...allValues, 0);
  const range = max - min || 1;

  return (
    <div className="bg-base-200 rounded-lg p-4">
      <div className="space-y-2">
        {segments.map((segment, index) => {
          const isBase = segment.type === 'base';
          const isFinal = segment.type === 'final';
          const isIncrease = segment.type === 'increase';
          const isDecrease = segment.type === 'decrease';

          // Calculate bar position and height
          const prevValue = index > 0 ? segments[index - 1].cumulativeValue : 0;
          const barHeight = Math.abs(segment.value);
          const barHeightPercent = (barHeight / range) * 100;
          const barStartPercent = ((Math.min(prevValue, segment.cumulativeValue) - min) / range) * 100;

          return (
            <div key={segment.nodeId} className="flex items-center gap-3">
              {/* Label */}
              <div className="w-32 text-sm font-medium truncate" title={segment.label}>
                {segment.label}
              </div>

              {/* Bar */}
              <div className="flex-1 relative h-12">
                {/* Background grid */}
                <div className="absolute inset-0 border-l border-base-300" />

                {/* Bar */}
                {!isBase && !isFinal && (
                  <div
                    className={`absolute h-8 rounded ${
                      isIncrease ? 'bg-success' : 'bg-error'
                    } opacity-80`}
                    style={{
                      left: `${barStartPercent}%`,
                      width: `${barHeightPercent}%`,
                    }}
                  />
                )}

                {/* Marker for base/final */}
                {(isBase || isFinal) && (
                  <div
                    className={`absolute h-10 w-1 ${
                      isFinal ? 'bg-primary' : 'bg-base-content'
                    }`}
                    style={{
                      left: `${((segment.cumulativeValue - min) / range) * 100}%`,
                    }}
                  />
                )}
              </div>

              {/* Value */}
              <div className="w-32 text-right">
                <div className="text-sm font-semibold">
                  {!isBase && !isFinal && (segment.value >= 0 ? '+' : '')}
                  {currency} {formatNumber(isBase || isFinal ? segment.cumulativeValue : segment.value, decimals)}
                </div>
                {showPercentages && !isBase && !isFinal && (
                  <div className="text-xs text-base-content/60">
                    {segment.percentage >= 0 ? '+' : ''}
                    {formatNumber(segment.percentage, 1)}%
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// Waterfall Table (Accessible Fallback)
// ============================================================================

function WaterfallTable({
  segments,
  decimals,
  showPercentages,
  currency,
}: {
  segments: WaterfallSegment[];
  decimals: number;
  showPercentages: boolean;
  currency: string;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="table table-zebra table-sm">
        <thead>
          <tr>
            <th>Node</th>
            <th className="text-right">Contribution</th>
            {showPercentages && <th className="text-right">%</th>}
            <th className="text-right">Cumulative</th>
          </tr>
        </thead>
        <tbody>
          {segments.map((segment) => {
            const isBase = segment.type === 'base';
            const isFinal = segment.type === 'final';
            const isIncrease = segment.type === 'increase';

            return (
              <tr key={segment.nodeId}>
                <td className="font-medium">{segment.label}</td>
                <td className="text-right">
                  {!isBase && !isFinal && (
                    <span className={isIncrease ? 'text-success' : 'text-error'}>
                      {segment.value >= 0 ? '+' : ''}
                      {currency} {formatNumber(segment.value, decimals)}
                    </span>
                  )}
                  {(isBase || isFinal) && (
                    <span className="text-base-content/60">—</span>
                  )}
                </td>
                {showPercentages && (
                  <td className="text-right">
                    {!isBase && !isFinal && (
                      <span className={isIncrease ? 'text-success' : 'text-error'}>
                        {segment.percentage >= 0 ? '+' : ''}
                        {formatNumber(segment.percentage, 1)}%
                      </span>
                    )}
                    {(isBase || isFinal) && (
                      <span className="text-base-content/60">—</span>
                    )}
                  </td>
                )}
                <td className="text-right font-semibold">
                  {currency} {formatNumber(segment.cumulativeValue, decimals)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Computes waterfall segments from contribution data
 */
function computeWaterfallSegments(data: WaterfallData): WaterfallSegment[] {
  const segments: WaterfallSegment[] = [];
  const { basePrice, adjustedPrice, contributions, nodeLabels } = data;

  // Base price segment
  segments.push({
    nodeId: '__base__',
    label: 'Base Price',
    value: basePrice,
    absoluteValue: Math.abs(basePrice),
    type: 'base',
    cumulativeValue: basePrice,
    percentage: 0,
  });

  // Sort contributions by execution order (assuming keys are in order)
  const sortedContributions = Object.entries(contributions).sort(
    ([a], [b]) => a.localeCompare(b)
  );

  // Add contribution segments
  let cumulativeValue = basePrice;
  const totalDelta = adjustedPrice - basePrice;

  for (const [nodeId, value] of sortedContributions) {
    cumulativeValue += value;
    const percentage = totalDelta !== 0 ? (value / Math.abs(totalDelta)) * 100 : 0;

    segments.push({
      nodeId,
      label: nodeLabels?.[nodeId] || nodeId,
      value,
      absoluteValue: Math.abs(value),
      type: value >= 0 ? 'increase' : 'decrease',
      cumulativeValue,
      percentage,
    });
  }

  // Final price segment
  segments.push({
    nodeId: '__final__',
    label: 'Adjusted Price',
    value: adjustedPrice,
    absoluteValue: Math.abs(adjustedPrice),
    type: 'final',
    cumulativeValue: adjustedPrice,
    percentage: 100,
  });

  return segments;
}

/**
 * Format number with specified decimal places
 */
function formatNumber(value: number, decimals: number): string {
  return new Decimal(value).toFixed(decimals);
}
