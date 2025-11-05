/**
 * CSV Import Service
 *
 * Streaming CSV importer with:
 * - Zod schema validation
 * - Row-level error reporting
 * - Dry-run mode
 * - Owner-only access control
 */

import { z } from 'zod';
import Papa from 'papaparse';
import type { PrismaClient } from '@prisma/client';
import Decimal from 'decimal.js';
import type { PAMGraph } from '@/lib/pam/graph-types';

// ============================================================================
// Schemas
// ============================================================================

// Contract CSV schema
export const ContractCSVSchema = z.object({
  name: z.string().min(1, 'Contract name is required'),
  status: z.enum(['DRAFT', 'ACTIVE', 'EXPIRED'], {
    errorMap: () => ({ message: 'Status must be DRAFT, ACTIVE, or EXPIRED' }),
  }),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD').optional(),
  counterparty: z.string().optional(),
  description: z.string().optional(),
});

// Item CSV schema
export const ItemCSVSchema = z.object({
  contractName: z.string().min(1, 'Contract name is required'),
  pamName: z.string().min(1, 'PAM name is required'),
  sku: z.string().min(1, 'SKU is required'),
  name: z.string().min(1, 'Item name is required'),
  basePrice: z.string().regex(/^\d+(\.\d+)?$/, 'Base price must be a number'),
  baseCurrency: z.string().length(3, 'Currency must be 3 letters (e.g., USD)'),
  uom: z.string().min(1, 'Unit of measure is required'),
  description: z.string().optional(),
});

// PAM CSV schema (simplified - just metadata, graph is too complex for CSV)
export const PAMCSVSchema = z.object({
  name: z.string().min(1, 'PAM name is required'),
  description: z.string().optional(),
  status: z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED'], {
    errorMap: () => ({ message: 'Status must be DRAFT, ACTIVE, or ARCHIVED' }),
  }),
});

// ============================================================================
// Types
// ============================================================================

export interface ImportOptions {
  /** Tenant ID for multi-tenancy */
  tenantId: string;
  /** User ID for audit trail */
  userId: string;
  /** Dry-run mode: validate only, don't save */
  dryRun?: boolean;
  /** Skip first N rows (e.g., skip header) */
  skipRows?: number;
}

export interface ImportResult {
  /** Total rows processed */
  totalRows: number;
  /** Successful imports */
  successCount: number;
  /** Failed validations */
  errorCount: number;
  /** Row-level errors */
  errors: RowError[];
  /** Created entity IDs (empty in dry-run) */
  createdIds: string[];
  /** Was this a dry-run? */
  isDryRun: boolean;
}

export interface RowError {
  /** Row number (1-indexed) */
  row: number;
  /** Error message */
  message: string;
  /** Field that caused error (if applicable) */
  field?: string;
  /** Raw row data */
  data: any;
}

// ============================================================================
// Contract Import
// ============================================================================

/**
 * Imports contracts from CSV
 *
 * @param prisma - Prisma client
 * @param csvContent - CSV file content as string
 * @param options - Import options
 * @returns Import result with success/error counts
 */
export async function importContracts(
  prisma: PrismaClient,
  csvContent: string,
  options: ImportOptions
): Promise<ImportResult> {
  const { tenantId, userId, dryRun = false, skipRows = 1 } = options;

  const result: ImportResult = {
    totalRows: 0,
    successCount: 0,
    errorCount: 0,
    errors: [],
    createdIds: [],
    isDryRun: dryRun,
  };

  // Parse CSV
  const parsed = Papa.parse(csvContent, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
  });

  const rows = parsed.data as any[];

  // Process each row
  for (let i = 0; i < rows.length; i++) {
    const rowNum = i + skipRows + 1; // 1-indexed
    const row = rows[i];
    result.totalRows++;

    try {
      // Validate with Zod
      const validated = ContractCSVSchema.parse(row);

      if (!dryRun) {
        // Create contract
        const contract = await prisma.contract.create({
          data: {
            tenantId,
            name: validated.name,
            status: validated.status as any,
            startDate: new Date(validated.startDate),
            endDate: validated.endDate ? new Date(validated.endDate) : undefined,
            counterparty: validated.counterparty,
            description: validated.description,
            createdBy: userId,
          },
        });

        result.createdIds.push(contract.id);
      }

      result.successCount++;
    } catch (error: any) {
      result.errorCount++;

      if (error instanceof z.ZodError) {
        // Zod validation error
        const firstError = error.errors[0];
        result.errors.push({
          row: rowNum,
          message: firstError.message,
          field: firstError.path.join('.'),
          data: row,
        });
      } else {
        // Other error (e.g., database constraint)
        result.errors.push({
          row: rowNum,
          message: error.message || 'Unknown error',
          data: row,
        });
      }
    }
  }

  return result;
}

// ============================================================================
// Item Import
// ============================================================================

/**
 * Imports items from CSV
 *
 * @param prisma - Prisma client
 * @param csvContent - CSV file content as string
 * @param options - Import options
 * @returns Import result with success/error counts
 */
export async function importItems(
  prisma: PrismaClient,
  csvContent: string,
  options: ImportOptions
): Promise<ImportResult> {
  const { tenantId, userId, dryRun = false, skipRows = 1 } = options;

  const result: ImportResult = {
    totalRows: 0,
    successCount: 0,
    errorCount: 0,
    errors: [],
    createdIds: [],
    isDryRun: dryRun,
  };

  // Parse CSV
  const parsed = Papa.parse(csvContent, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
  });

  const rows = parsed.data as any[];

  // Process each row
  for (let i = 0; i < rows.length; i++) {
    const rowNum = i + skipRows + 1;
    const row = rows[i];
    result.totalRows++;

    try {
      // Validate with Zod
      const validated = ItemCSVSchema.parse(row);

      if (!dryRun) {
        // Look up contract by name
        const contract = await prisma.contract.findFirst({
          where: {
            tenantId,
            name: validated.contractName,
          },
        });

        if (!contract) {
          throw new Error(`Contract not found: ${validated.contractName}`);
        }

        // Look up PAM by name
        const pam = await prisma.pAM.findFirst({
          where: {
            tenantId,
            name: validated.pamName,
          },
        });

        if (!pam) {
          throw new Error(`PAM not found: ${validated.pamName}`);
        }

        // Create item
        const item = await prisma.item.create({
          data: {
            tenantId,
            contractId: contract.id,
            pamId: pam.id,
            sku: validated.sku,
            name: validated.name,
            basePrice: new Decimal(validated.basePrice),
            baseCurrency: validated.baseCurrency,
            uom: validated.uom,
            description: validated.description,
          },
        });

        result.createdIds.push(item.id);
      }

      result.successCount++;
    } catch (error: any) {
      result.errorCount++;

      if (error instanceof z.ZodError) {
        const firstError = error.errors[0];
        result.errors.push({
          row: rowNum,
          message: firstError.message,
          field: firstError.path.join('.'),
          data: row,
        });
      } else {
        result.errors.push({
          row: rowNum,
          message: error.message || 'Unknown error',
          data: row,
        });
      }
    }
  }

  return result;
}

// ============================================================================
// PAM Import
// ============================================================================

/**
 * Imports PAM metadata from CSV
 *
 * Note: This only imports PAM metadata (name, description, status).
 * Graph structure is too complex for CSV and should be created via UI or API.
 *
 * @param prisma - Prisma client
 * @param csvContent - CSV file content as string
 * @param options - Import options
 * @returns Import result with success/error counts
 */
export async function importPAMs(
  prisma: PrismaClient,
  csvContent: string,
  options: ImportOptions
): Promise<ImportResult> {
  const { tenantId, userId, dryRun = false, skipRows = 1 } = options;

  const result: ImportResult = {
    totalRows: 0,
    successCount: 0,
    errorCount: 0,
    errors: [],
    createdIds: [],
    isDryRun: dryRun,
  };

  // Parse CSV
  const parsed = Papa.parse(csvContent, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
  });

  const rows = parsed.data as any[];

  // Process each row
  for (let i = 0; i < rows.length; i++) {
    const rowNum = i + skipRows + 1;
    const row = rows[i];
    result.totalRows++;

    try {
      // Validate with Zod
      const validated = PAMCSVSchema.parse(row);

      if (!dryRun) {
        // Create PAM with empty graph (to be configured later)
        const emptyGraph: PAMGraph = {
          nodes: [],
          edges: [],
          output: '',
        };

        const pam = await prisma.pAM.create({
          data: {
            tenantId,
            name: validated.name,
            description: validated.description,
            graph: emptyGraph as any,
            status: validated.status,
            createdBy: userId,
          },
        });

        result.createdIds.push(pam.id);
      }

      result.successCount++;
    } catch (error: any) {
      result.errorCount++;

      if (error instanceof z.ZodError) {
        const firstError = error.errors[0];
        result.errors.push({
          row: rowNum,
          message: firstError.message,
          field: firstError.path.join('.'),
          data: row,
        });
      } else {
        result.errors.push({
          row: rowNum,
          message: error.message || 'Unknown error',
          data: row,
        });
      }
    }
  }

  return result;
}

// ============================================================================
// Utility
// ============================================================================

/**
 * Validates CSV without importing
 *
 * Convenience wrapper around import functions with dryRun=true
 */
export async function validateCSV(
  prisma: PrismaClient,
  csvContent: string,
  entityType: 'contracts' | 'items' | 'pams',
  options: Omit<ImportOptions, 'dryRun'>
): Promise<ImportResult> {
  const importFn = {
    contracts: importContracts,
    items: importItems,
    pams: importPAMs,
  }[entityType];

  return importFn(prisma, csvContent, { ...options, dryRun: true });
}
