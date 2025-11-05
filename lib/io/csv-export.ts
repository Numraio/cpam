/**
 * CSV Export Service
 *
 * Exports approved prices and other data to CSV format
 */

import Papa from 'papaparse';
import type { PrismaClient } from '@prisma/client';
import Decimal from 'decimal.js';

// ============================================================================
// Types
// ============================================================================

export interface ExportOptions {
  /** Tenant ID for multi-tenancy */
  tenantId: string;
  /** Include header row */
  includeHeader?: boolean;
  /** Date format for timestamps */
  dateFormat?: 'iso' | 'short';
}

export interface ApprovedPriceRow {
  // Item identification
  sku: string;
  itemName: string;
  contractName: string;

  // Pricing
  basePrice: string;
  baseCurrency: string;
  adjustedPrice: string;
  adjustedCurrency: string;
  uom: string;

  // Calculation details
  pamName: string;
  effectiveDate: string;
  calculatedAt: string;

  // Approval details
  approvedBy: string;
  approvedAt: string;

  // Override details (if applicable)
  isOverridden: string;
  originalCalculatedPrice?: string;
  overrideReason?: string;
  overriddenBy?: string;
  overriddenAt?: string;
}

// ============================================================================
// Approved Prices Export
// ============================================================================

/**
 * Exports approved prices from a batch to CSV
 *
 * @param prisma - Prisma client
 * @param batchId - Batch ID to export
 * @param options - Export options
 * @returns CSV string
 */
export async function exportApprovedPrices(
  prisma: PrismaClient,
  batchId: string,
  options: ExportOptions
): Promise<string> {
  const { tenantId, includeHeader = true, dateFormat = 'iso' } = options;

  // Verify batch is approved
  const batch = await prisma.calcBatch.findUnique({
    where: { id: batchId },
    include: {
      pam: true,
    },
  });

  if (!batch) {
    throw new Error(`Batch not found: ${batchId}`);
  }

  if (batch.tenantId !== tenantId) {
    throw new Error(`Batch ${batchId} does not belong to tenant ${tenantId}`);
  }

  // Check if batch is approved
  const approval = await prisma.approvalEvent.findFirst({
    where: {
      tenantId,
      entityType: 'CALC_BATCH',
      entityId: batchId,
      status: 'APPROVED',
    },
  });

  if (!approval) {
    throw new Error(`Batch ${batchId} is not approved`);
  }

  // Fetch approved results with item details
  const results = await prisma.calcResult.findMany({
    where: {
      tenantId,
      batchId,
      isApproved: true,
    },
    include: {
      item: {
        include: {
          contract: true,
        },
      },
    },
    orderBy: [
      { item: { contract: { name: 'asc' } } },
      { item: { sku: 'asc' } },
    ],
  });

  // Format rows
  const rows: ApprovedPriceRow[] = results.map((r) => ({
    sku: r.item.sku,
    itemName: r.item.name,
    contractName: r.item.contract.name,
    basePrice: r.item.basePrice.toFixed(2),
    baseCurrency: r.item.baseCurrency,
    adjustedPrice: r.adjustedPrice.toFixed(2),
    adjustedCurrency: r.adjustedCurrency,
    uom: r.item.uom,
    pamName: batch.pam.name,
    effectiveDate: formatDate(r.effectiveDate, dateFormat),
    calculatedAt: formatDate(r.createdAt, dateFormat),
    approvedBy: r.approvedBy || '',
    approvedAt: r.approvedAt ? formatDate(r.approvedAt, dateFormat) : '',
    isOverridden: r.isOverridden ? 'YES' : 'NO',
    originalCalculatedPrice: r.originalCalculatedPrice?.toFixed(2),
    overrideReason: r.overrideReason || undefined,
    overriddenBy: r.overriddenBy || undefined,
    overriddenAt: r.overriddenAt ? formatDate(r.overriddenAt, dateFormat) : undefined,
  }));

  // Convert to CSV
  const csv = Papa.unparse(rows, {
    header: includeHeader,
    columns: [
      'sku',
      'itemName',
      'contractName',
      'basePrice',
      'baseCurrency',
      'adjustedPrice',
      'adjustedCurrency',
      'uom',
      'pamName',
      'effectiveDate',
      'calculatedAt',
      'approvedBy',
      'approvedAt',
      'isOverridden',
      'originalCalculatedPrice',
      'overrideReason',
      'overriddenBy',
      'overriddenAt',
    ],
  });

  return csv;
}

// ============================================================================
// Contract Export
// ============================================================================

export interface ContractRow {
  name: string;
  status: string;
  startDate: string;
  endDate: string;
  counterparty: string;
  description: string;
  itemCount: string;
}

/**
 * Exports contracts to CSV
 *
 * @param prisma - Prisma client
 * @param options - Export options
 * @returns CSV string
 */
export async function exportContracts(
  prisma: PrismaClient,
  options: ExportOptions
): Promise<string> {
  const { tenantId, includeHeader = true, dateFormat = 'iso' } = options;

  const contracts = await prisma.contract.findMany({
    where: { tenantId },
    include: {
      _count: {
        select: { items: true },
      },
    },
    orderBy: { name: 'asc' },
  });

  const rows: ContractRow[] = contracts.map((c) => ({
    name: c.name,
    status: c.status,
    startDate: formatDate(c.startDate, dateFormat),
    endDate: c.endDate ? formatDate(c.endDate, dateFormat) : '',
    counterparty: c.counterparty || '',
    description: c.description || '',
    itemCount: c._count.items.toString(),
  }));

  return Papa.unparse(rows, {
    header: includeHeader,
    columns: ['name', 'status', 'startDate', 'endDate', 'counterparty', 'description', 'itemCount'],
  });
}

// ============================================================================
// Item Export
// ============================================================================

export interface ItemRow {
  contractName: string;
  pamName: string;
  sku: string;
  name: string;
  basePrice: string;
  baseCurrency: string;
  uom: string;
  description: string;
}

/**
 * Exports items to CSV
 *
 * @param prisma - Prisma client
 * @param options - Export options
 * @param contractId - Optional: filter by contract
 * @returns CSV string
 */
export async function exportItems(
  prisma: PrismaClient,
  options: ExportOptions,
  contractId?: string
): Promise<string> {
  const { tenantId, includeHeader = true } = options;

  const items = await prisma.item.findMany({
    where: {
      tenantId,
      ...(contractId && { contractId }),
    },
    include: {
      contract: true,
      pam: true,
    },
    orderBy: [
      { contract: { name: 'asc' } },
      { sku: 'asc' },
    ],
  });

  const rows: ItemRow[] = items.map((i) => ({
    contractName: i.contract.name,
    pamName: i.pam.name,
    sku: i.sku,
    name: i.name,
    basePrice: i.basePrice.toFixed(2),
    baseCurrency: i.baseCurrency,
    uom: i.uom,
    description: i.description || '',
  }));

  return Papa.unparse(rows, {
    header: includeHeader,
    columns: ['contractName', 'pamName', 'sku', 'name', 'basePrice', 'baseCurrency', 'uom', 'description'],
  });
}

// ============================================================================
// PAM Export
// ============================================================================

export interface PAMRow {
  name: string;
  description: string;
  status: string;
  itemCount: string;
}

/**
 * Exports PAM metadata to CSV
 *
 * Note: Graph structure is not exported (too complex for CSV)
 *
 * @param prisma - Prisma client
 * @param options - Export options
 * @returns CSV string
 */
export async function exportPAMs(
  prisma: PrismaClient,
  options: ExportOptions
): Promise<string> {
  const { tenantId, includeHeader = true } = options;

  const pams = await prisma.pAM.findMany({
    where: { tenantId },
    include: {
      _count: {
        select: { items: true },
      },
    },
    orderBy: { name: 'asc' },
  });

  const rows: PAMRow[] = pams.map((p) => ({
    name: p.name,
    description: p.description || '',
    status: p.status,
    itemCount: p._count.items.toString(),
  }));

  return Papa.unparse(rows, {
    header: includeHeader,
    columns: ['name', 'description', 'status', 'itemCount'],
  });
}

// ============================================================================
// Utility
// ============================================================================

/**
 * Formats a date according to the specified format
 */
function formatDate(date: Date, format: 'iso' | 'short'): string {
  if (format === 'iso') {
    return date.toISOString();
  } else {
    // YYYY-MM-DD
    return date.toISOString().split('T')[0];
  }
}

/**
 * Downloads CSV as file (browser only)
 */
export function downloadCSV(csv: string, filename: string): void {
  if (typeof window === 'undefined') {
    throw new Error('downloadCSV only works in browser');
  }

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
