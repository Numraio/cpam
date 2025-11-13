/**
 * BLS Series Catalog
 * Common BLS series for quick selection
 */

import type { BLSSeriesConfig } from './types';

/**
 * Catalog of commonly used BLS series
 */
export const BLS_SERIES_CATALOG: BLSSeriesConfig[] = [
  // =========================
  // CPI (Consumer Price Index)
  // =========================
  {
    seriesId: 'CUUR0000SA0',
    title: 'CPI-U: All Items',
    description: 'Consumer Price Index for All Urban Consumers (CPI-U), All Items, Seasonally Adjusted',
    category: 'CPI',
    frequency: 'MONTHLY',
    seasonalAdjustment: 'SEASONALLY_ADJUSTED',
    baseYear: '1982-84=100',
    area: 'US City Average',
    item: 'All items',
  },
  {
    seriesId: 'CUUR0000AA0',
    title: 'CPI-U: All Items (NSA)',
    description: 'Consumer Price Index for All Urban Consumers (CPI-U), All Items, Not Seasonally Adjusted',
    category: 'CPI',
    frequency: 'MONTHLY',
    seasonalAdjustment: 'NOT_SEASONALLY_ADJUSTED',
    baseYear: '1982-84=100',
    area: 'US City Average',
    item: 'All items',
  },
  {
    seriesId: 'CUUR0000SA0L1E',
    title: 'CPI-U: Core (All Items Less Food & Energy)',
    description: 'CPI-U All Items Less Food and Energy (Core CPI), Seasonally Adjusted',
    category: 'CPI',
    frequency: 'MONTHLY',
    seasonalAdjustment: 'SEASONALLY_ADJUSTED',
    baseYear: '1982-84=100',
    area: 'US City Average',
    item: 'All items less food and energy',
  },
  {
    seriesId: 'CUUR0000SA0E',
    title: 'CPI-U: Energy',
    description: 'CPI-U Energy, Seasonally Adjusted',
    category: 'CPI',
    frequency: 'MONTHLY',
    seasonalAdjustment: 'SEASONALLY_ADJUSTED',
    baseYear: '1982-84=100',
    area: 'US City Average',
    item: 'Energy',
  },
  {
    seriesId: 'CUUR0000SAF1',
    title: 'CPI-U: Food and Beverages',
    description: 'CPI-U Food and Beverages, Seasonally Adjusted',
    category: 'CPI',
    frequency: 'MONTHLY',
    seasonalAdjustment: 'SEASONALLY_ADJUSTED',
    baseYear: '1982-84=100',
    area: 'US City Average',
    item: 'Food and beverages',
  },
  {
    seriesId: 'CUUR0000SETB01',
    title: 'CPI-U: Gasoline (All Types)',
    description: 'CPI-U Gasoline (All Types), Seasonally Adjusted',
    category: 'CPI',
    frequency: 'MONTHLY',
    seasonalAdjustment: 'SEASONALLY_ADJUSTED',
    baseYear: '1982-84=100',
    area: 'US City Average',
    item: 'Gasoline (all types)',
  },
  {
    seriesId: 'CUUR0000SEHE',
    title: 'CPI-U: Electricity',
    description: 'CPI-U Electricity, Seasonally Adjusted',
    category: 'CPI',
    frequency: 'MONTHLY',
    seasonalAdjustment: 'SEASONALLY_ADJUSTED',
    baseYear: '1982-84=100',
    area: 'US City Average',
    item: 'Electricity',
  },
  {
    seriesId: 'CUUR0000SEHF',
    title: 'CPI-U: Utility (Piped) Gas Service',
    description: 'CPI-U Utility (Piped) Gas Service, Seasonally Adjusted',
    category: 'CPI',
    frequency: 'MONTHLY',
    seasonalAdjustment: 'SEASONALLY_ADJUSTED',
    baseYear: '1982-84=100',
    area: 'US City Average',
    item: 'Utility (piped) gas service',
  },

  // =========================
  // PPI (Producer Price Index)
  // =========================
  {
    seriesId: 'WPUFD49207',
    title: 'PPI: Finished Goods',
    description: 'Producer Price Index for Finished Goods',
    category: 'PPI',
    frequency: 'MONTHLY',
    seasonalAdjustment: 'NOT_SEASONALLY_ADJUSTED',
    baseYear: '1982=100',
    item: 'Finished goods',
  },
  {
    seriesId: 'WPUFD4131',
    title: 'PPI: Finished Energy Goods',
    description: 'Producer Price Index for Finished Energy Goods',
    category: 'PPI',
    frequency: 'MONTHLY',
    seasonalAdjustment: 'NOT_SEASONALLY_ADJUSTED',
    baseYear: '1982=100',
    item: 'Finished energy goods',
  },
  {
    seriesId: 'WPU0561',
    title: 'PPI: Crude Petroleum',
    description: 'Producer Price Index for Crude Petroleum (Domestic Production)',
    category: 'PPI',
    frequency: 'MONTHLY',
    seasonalAdjustment: 'NOT_SEASONALLY_ADJUSTED',
    item: 'Crude petroleum',
  },
  {
    seriesId: 'WPU0531',
    title: 'PPI: Natural Gas',
    description: 'Producer Price Index for Natural Gas',
    category: 'PPI',
    frequency: 'MONTHLY',
    seasonalAdjustment: 'NOT_SEASONALLY_ADJUSTED',
    item: 'Natural gas',
  },
  {
    seriesId: 'WPUFD49116',
    title: 'PPI: Gasoline',
    description: 'Producer Price Index for Gasoline',
    category: 'PPI',
    frequency: 'MONTHLY',
    seasonalAdjustment: 'NOT_SEASONALLY_ADJUSTED',
    item: 'Gasoline',
  },

  // =========================
  // ECI (Employment Cost Index)
  // =========================
  {
    seriesId: 'CIU2010000000000A',
    title: 'ECI: Total Compensation',
    description: 'Employment Cost Index - Total Compensation, All Workers',
    category: 'ECI',
    frequency: 'QUARTERLY',
    seasonalAdjustment: 'NOT_SEASONALLY_ADJUSTED',
    baseYear: 'June 1989=100',
    item: 'Total compensation',
  },
  {
    seriesId: 'CIU2010000000000I',
    title: 'ECI: Wages and Salaries',
    description: 'Employment Cost Index - Wages and Salaries, All Workers',
    category: 'ECI',
    frequency: 'QUARTERLY',
    seasonalAdjustment: 'NOT_SEASONALLY_ADJUSTED',
    baseYear: 'June 1989=100',
    item: 'Wages and salaries',
  },

  // =========================
  // Import/Export Price Indexes
  // =========================
  {
    seriesId: 'EIUIR',
    title: 'Import Price Index: All Imports',
    description: 'U.S. Import Price Index, All Imports',
    category: 'IMPORT_EXPORT',
    frequency: 'MONTHLY',
    seasonalAdjustment: 'NOT_SEASONALLY_ADJUSTED',
    baseYear: '2000=100',
    item: 'All imports',
  },
  {
    seriesId: 'EIUIQ',
    title: 'Export Price Index: All Exports',
    description: 'U.S. Export Price Index, All Exports',
    category: 'IMPORT_EXPORT',
    frequency: 'MONTHLY',
    seasonalAdjustment: 'NOT_SEASONALLY_ADJUSTED',
    baseYear: '2000=100',
    item: 'All exports',
  },
];

/**
 * Get series by category
 */
export function getSeriesByCategory(
  category: 'CPI' | 'PPI' | 'ECI' | 'IMPORT_EXPORT' | 'OTHER'
): BLSSeriesConfig[] {
  return BLS_SERIES_CATALOG.filter((s) => s.category === category);
}

/**
 * Get series by ID
 */
export function getSeriesById(seriesId: string): BLSSeriesConfig | undefined {
  return BLS_SERIES_CATALOG.find((s) => s.seriesId === seriesId);
}

/**
 * Search series by keyword
 */
export function searchSeries(keyword: string): BLSSeriesConfig[] {
  const lowerKeyword = keyword.toLowerCase();
  return BLS_SERIES_CATALOG.filter(
    (s) =>
      s.title.toLowerCase().includes(lowerKeyword) ||
      s.description.toLowerCase().includes(lowerKeyword) ||
      s.item?.toLowerCase().includes(lowerKeyword)
  );
}

/**
 * Get all CPI series
 */
export function getCPISeries(): BLSSeriesConfig[] {
  return getSeriesByCategory('CPI');
}

/**
 * Get all PPI series
 */
export function getPPISeries(): BLSSeriesConfig[] {
  return getSeriesByCategory('PPI');
}

/**
 * Get all ECI series
 */
export function getECISeries(): BLSSeriesConfig[] {
  return getSeriesByCategory('ECI');
}

/**
 * Get all Import/Export series
 */
export function getImportExportSeries(): BLSSeriesConfig[] {
  return getSeriesByCategory('IMPORT_EXPORT');
}

/**
 * Format series for display in UI
 */
export function formatSeriesForUI(series: BLSSeriesConfig): {
  value: string;
  label: string;
  description: string;
  category: string;
} {
  return {
    value: series.seriesId,
    label: series.title,
    description: series.description,
    category: series.category,
  };
}

/**
 * Get all series formatted for UI dropdown
 */
export function getAllSeriesForUI() {
  return BLS_SERIES_CATALOG.map(formatSeriesForUI);
}
