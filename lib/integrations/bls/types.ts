/**
 * BLS (Bureau of Labor Statistics) API Types
 * API Documentation: https://www.bls.gov/developers/
 */

/**
 * BLS API Request
 */
export interface BLSApiRequest {
  seriesid: string[];
  startyear: string;
  endyear: string;
  registrationkey?: string;
  catalog?: boolean;
  calculations?: boolean;
  annualaverage?: boolean;
}

/**
 * BLS API Response
 */
export interface BLSApiResponse {
  status: 'REQUEST_SUCCEEDED' | 'REQUEST_NOT_PROCESSED';
  responseTime: number;
  message?: string[];
  Results: {
    series: BLSSeries[];
  };
}

/**
 * BLS Series Data
 */
export interface BLSSeries {
  seriesID: string;
  data: BLSDataPoint[];
  catalog?: {
    series_title: string;
    series_id: string;
    seasonally_adjusted: string;
    survey_name: string;
    survey_abbreviation: string;
    measure_data_type: string;
    area: string;
    item_name: string;
  };
}

/**
 * BLS Data Point
 */
export interface BLSDataPoint {
  year: string;
  period: string; // e.g., "M01", "M02", ..., "M12", "Q01", "A01"
  periodName: string; // e.g., "January", "February", "Annual"
  value: string;
  footnotes?: Array<{
    code?: string;
    text?: string;
  }>;
}

/**
 * BLS Series Configuration
 */
export interface BLSSeriesConfig {
  seriesId: string;
  title: string;
  description: string;
  category: 'CPI' | 'PPI' | 'ECI' | 'IMPORT_EXPORT' | 'OTHER';
  frequency: 'MONTHLY' | 'QUARTERLY' | 'ANNUAL';
  seasonalAdjustment: 'SEASONALLY_ADJUSTED' | 'NOT_SEASONALLY_ADJUSTED';
  baseYear?: string;
  area?: string; // e.g., "US", "Northeast", "Los Angeles"
  item?: string; // e.g., "All items", "Energy", "Food"
}

/**
 * Common BLS Series IDs
 */
export enum BLSSeriesId {
  // CPI - All Urban Consumers (CPI-U)
  CPI_ALL_ITEMS_SA = 'CUUR0000SA0', // All items, seasonally adjusted
  CPI_ALL_ITEMS_NSA = 'CUUR0000AA0', // All items, not seasonally adjusted
  CPI_ENERGY_SA = 'CUUR0000SA0E', // Energy, seasonally adjusted
  CPI_FOOD_SA = 'CUUR0000SAF1', // Food and beverages, seasonally adjusted
  CPI_CORE_SA = 'CUUR0000SA0L1E', // All items less food and energy, seasonally adjusted

  // PPI - Producer Price Index
  PPI_FINISHED_GOODS = 'WPUFD49207', // Finished goods
  PPI_INTERMEDIATE_GOODS = 'WPUID49207', // Intermediate goods
  PPI_CRUDE_MATERIALS = 'WPUFD49207', // Crude materials

  // Employment Cost Index
  ECI_TOTAL_COMP = 'CIU2010000000000A', // Total compensation, all workers
  ECI_WAGES = 'CIU2010000000000I', // Wages and salaries, all workers

  // Import/Export Price Indexes
  IMPORT_ALL = 'EIUIR', // All imports
  EXPORT_ALL = 'EIUIQ', // All exports
}

/**
 * BLS Period Format
 * M01-M12 = January-December
 * Q01-Q04 = Quarter 1-4
 * A01 = Annual
 */
export type BLSPeriod =
  | 'M01' | 'M02' | 'M03' | 'M04' | 'M05' | 'M06'
  | 'M07' | 'M08' | 'M09' | 'M10' | 'M11' | 'M12'
  | 'Q01' | 'Q02' | 'Q03' | 'Q04'
  | 'A01';

/**
 * BLS Error Response
 */
export interface BLSErrorResponse {
  status: 'REQUEST_NOT_PROCESSED';
  message: string[];
  responseTime: number;
}

/**
 * BLS Rate Limit Info
 */
export interface BLSRateLimitInfo {
  dailyLimit: number; // 500 for free, 1000 for registered
  requestsToday: number;
  resetTime: Date;
}

/**
 * Parsed BLS Data Point (mapped to our internal format)
 */
export interface ParsedBLSDataPoint {
  date: Date;
  value: number;
  period: string;
  year: string;
  footnotes?: string;
}
