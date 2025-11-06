/**
 * Price Math Report Generator
 *
 * Generates branded PDF and CSV reports showing:
 * - Base prices
 * - Factor contributions
 * - Transform operations
 * - Currency conversions
 * - Controls applied
 * - Final adjusted prices
 * - Approval status
 */

import type { PrismaClient } from '@prisma/client';
import PDFDocument from 'pdfkit';
import Papa from 'papaparse';
import type { Readable } from 'stream';

// ============================================================================
// Types
// ============================================================================

export interface ReportRequest {
  /** Tenant ID */
  tenantId: string;
  /** Batch ID */
  batchId: string;
  /** Optional: Filter to specific item */
  itemId?: string;
  /** Branding options */
  branding?: BrandingOptions;
}

export interface BrandingOptions {
  /** Tenant name */
  tenantName?: string;
  /** Logo URL or data URI */
  logoUrl?: string;
  /** Primary color (hex) */
  primaryColor?: string;
  /** Secondary color (hex) */
  secondaryColor?: string;
}

export interface ReportData {
  batch: {
    id: string;
    pamName: string;
    asOfDate: string;
    status: string;
    approvedBy?: string;
    approvedAt?: Date;
    createdAt: Date;
  };
  items: ReportItem[];
  metadata: {
    totalItems: number;
    generatedAt: Date;
    generatedBy?: string;
  };
}

export interface ReportItem {
  itemId: string;
  sku: string;
  itemName: string;
  contractName: string;
  basePrice: number;
  baseCurrency: string;
  contributions: ContributionDetail[];
  adjustedPrice: number;
  adjustedCurrency: string;
  isApproved: boolean;
  isOverridden: boolean;
  overrideReason?: string;
}

export interface ContributionDetail {
  step: string;
  operation: string;
  input: number | number[];
  output: number;
  description: string;
}

// ============================================================================
// Data Fetching
// ============================================================================

/**
 * Fetches report data from database
 */
export async function fetchReportData(
  prisma: PrismaClient,
  request: ReportRequest
): Promise<ReportData> {
  const { tenantId, batchId, itemId } = request;

  // Fetch batch with results
  const batch = await prisma.calcBatch.findUnique({
    where: { id: batchId },
    include: {
      pam: true,
      results: {
        where: itemId ? { itemId } : undefined,
        include: {
          item: {
            include: {
              contract: true,
            },
          },
        },
        orderBy: {
          item: {
            sku: 'asc',
          },
        },
      },
    },
  });

  if (!batch) {
    throw new Error(`Batch not found: ${batchId}`);
  }

  if (batch.tenantId !== tenantId) {
    throw new Error('Unauthorized: Batch does not belong to tenant');
  }

  // Check for approval
  const approval = await prisma.approvalEvent.findFirst({
    where: {
      tenantId,
      entityType: 'CALC_BATCH',
      entityId: batchId,
      status: 'APPROVED',
    },
  });

  // Transform to report format
  const items: ReportItem[] = batch.results.map((result) => {
    const contributions = (result.contributions as any)?.steps || [];

    return {
      itemId: result.itemId,
      sku: result.item.sku,
      itemName: result.item.name,
      contractName: result.item.contract.name,
      basePrice: result.item.basePrice.toNumber(),
      baseCurrency: result.item.baseCurrency,
      contributions: contributions.map((step: any, index: number) => ({
        step: `Step ${index + 1}`,
        operation: step.operation || step.type || 'unknown',
        input: step.input,
        output: step.output,
        description: step.description || formatOperation(step),
      })),
      adjustedPrice: result.adjustedPrice.toNumber(),
      adjustedCurrency: result.adjustedCurrency,
      isApproved: result.isApproved,
      isOverridden: result.isOverridden,
      overrideReason: result.overrideReason || undefined,
    };
  });

  const metadata = batch.metadata as any;

  return {
    batch: {
      id: batch.id,
      pamName: batch.pam.name,
      asOfDate: metadata?.asOfDate || batch.createdAt.toISOString().split('T')[0],
      status: batch.status,
      approvedBy: approval?.approvedBy,
      approvedAt: approval?.approvedAt || undefined,
      createdAt: batch.createdAt,
    },
    items,
    metadata: {
      totalItems: items.length,
      generatedAt: new Date(),
    },
  };
}

/**
 * Formats operation for display
 */
function formatOperation(step: any): string {
  const { type, operation, value } = step;

  if (type === 'factor') {
    return `Factor: ${value}`;
  }

  if (type === 'transform') {
    return `Transform: ${operation}`;
  }

  if (type === 'convert') {
    return `Currency conversion`;
  }

  if (type === 'combine') {
    return `Combine: ${operation}`;
  }

  if (type === 'controls') {
    return `Apply controls`;
  }

  return type || operation || 'unknown';
}

// ============================================================================
// PDF Generation
// ============================================================================

/**
 * Generates PDF report
 *
 * Returns a readable stream that can be piped to HTTP response or file
 */
export function generatePDF(data: ReportData, branding?: BrandingOptions): Readable {
  const doc = new PDFDocument({
    size: 'LETTER',
    margins: { top: 50, bottom: 50, left: 50, right: 50 },
    info: {
      Title: `Price Math Report - ${data.batch.pamName}`,
      Author: branding?.tenantName || 'CPAM',
      Subject: `Calculation results for batch ${data.batch.id}`,
      CreationDate: data.metadata.generatedAt,
    },
  });

  const primaryColor = branding?.primaryColor || '#2563eb'; // blue-600
  const secondaryColor = branding?.secondaryColor || '#64748b'; // slate-500

  // Header
  addHeader(doc, data, branding, primaryColor);

  // Batch summary
  addBatchSummary(doc, data, secondaryColor);

  // Items
  data.items.forEach((item, index) => {
    if (index > 0) {
      doc.addPage();
    }
    addItemDetail(doc, item, primaryColor, secondaryColor);
  });

  // Footer on each page
  const pages = doc.bufferedPageRange();
  for (let i = 0; i < pages.count; i++) {
    doc.switchToPage(i);
    addFooter(doc, data, i + 1, pages.count);
  }

  doc.end();

  return doc as unknown as Readable;
}

/**
 * Adds header to PDF
 */
function addHeader(
  doc: PDFKit.PDFDocument,
  data: ReportData,
  branding?: BrandingOptions,
  primaryColor?: string
) {
  // Tenant name / logo
  doc
    .fontSize(24)
    .fillColor(primaryColor || '#000')
    .text(branding?.tenantName || 'Price Math Report', 50, 50);

  doc
    .fontSize(10)
    .fillColor('#666')
    .text(`Generated: ${data.metadata.generatedAt.toLocaleString()}`, 50, 80);

  doc.moveDown(2);
}

/**
 * Adds batch summary section
 */
function addBatchSummary(
  doc: PDFKit.PDFDocument,
  data: ReportData,
  secondaryColor: string
) {
  doc.fontSize(16).fillColor('#000').text('Batch Summary', { underline: true });

  doc.moveDown(0.5);

  doc.fontSize(10).fillColor(secondaryColor);

  doc.text(`PAM: ${data.batch.pamName}`);
  doc.text(`As-of Date: ${data.batch.asOfDate}`);
  doc.text(`Status: ${data.batch.status}`);

  if (data.batch.approvedBy) {
    doc.text(`Approved By: ${data.batch.approvedBy}`);
    doc.text(
      `Approved At: ${data.batch.approvedAt?.toLocaleString() || 'N/A'}`
    );
  }

  doc.text(`Total Items: ${data.metadata.totalItems}`);

  doc.moveDown(1);
}

/**
 * Adds item detail section
 */
function addItemDetail(
  doc: PDFKit.PDFDocument,
  item: ReportItem,
  primaryColor: string,
  secondaryColor: string
) {
  // Item header
  doc
    .fontSize(14)
    .fillColor(primaryColor)
    .text(`${item.sku} - ${item.itemName}`, { underline: true });

  doc.moveDown(0.5);

  // Contract
  doc.fontSize(10).fillColor(secondaryColor);
  doc.text(`Contract: ${item.contractName}`);

  doc.moveDown(0.5);

  // Base price
  doc.fontSize(12).fillColor('#000');
  doc.text(
    `Base Price: ${item.baseCurrency} ${item.basePrice.toFixed(2)}`,
    { continued: true }
  );

  doc.moveDown(1);

  // Calculation steps
  doc.fontSize(12).fillColor('#000').text('Calculation Steps:', { underline: true });

  doc.moveDown(0.5);

  doc.fontSize(9).fillColor(secondaryColor);

  item.contributions.forEach((contrib) => {
    doc.text(
      `${contrib.step}: ${contrib.description} → ${typeof contrib.output === 'number' ? contrib.output.toFixed(4) : 'N/A'}`
    );
  });

  doc.moveDown(1);

  // Final price
  doc.fontSize(14).fillColor(primaryColor);
  doc.text(
    `Adjusted Price: ${item.adjustedCurrency} ${item.adjustedPrice.toFixed(2)}`
  );

  // Override indicator
  if (item.isOverridden) {
    doc.moveDown(0.5);
    doc.fontSize(10).fillColor('#dc2626'); // red
    doc.text(`⚠ OVERRIDDEN: ${item.overrideReason || 'Manual adjustment'}`);
  }

  // Approval indicator
  if (item.isApproved) {
    doc.moveDown(0.5);
    doc.fontSize(10).fillColor('#16a34a'); // green
    doc.text('✓ APPROVED');
  }
}

/**
 * Adds footer to page
 */
function addFooter(
  doc: PDFKit.PDFDocument,
  data: ReportData,
  pageNum: number,
  totalPages: number
) {
  doc
    .fontSize(8)
    .fillColor('#999')
    .text(
      `Batch ID: ${data.batch.id} | Page ${pageNum} of ${totalPages}`,
      50,
      doc.page.height - 50,
      { align: 'center' }
    );
}

// ============================================================================
// CSV Generation
// ============================================================================

/**
 * Generates CSV report (mirrors PDF structure)
 */
export function generateCSV(data: ReportData): string {
  const rows: any[] = [];

  data.items.forEach((item) => {
    // Main row
    rows.push({
      sku: item.sku,
      itemName: item.itemName,
      contractName: item.contractName,
      basePrice: item.basePrice,
      baseCurrency: item.baseCurrency,
      adjustedPrice: item.adjustedPrice,
      adjustedCurrency: item.adjustedCurrency,
      isApproved: item.isApproved ? 'YES' : 'NO',
      isOverridden: item.isOverridden ? 'YES' : 'NO',
      overrideReason: item.overrideReason || '',
      calculationSteps: item.contributions.length,
    });
  });

  // Use papaparse to generate CSV
  return Papa.unparse(rows, { header: true });
}

/**
 * Generates detailed CSV with calculation steps
 */
export function generateDetailedCSV(data: ReportData): string {
  const rows: any[] = [];

  data.items.forEach((item) => {
    item.contributions.forEach((contrib, index) => {
      rows.push({
        sku: item.sku,
        itemName: item.itemName,
        contractName: item.contractName,
        step: contrib.step,
        operation: contrib.operation,
        description: contrib.description,
        output: contrib.output,
        basePrice: index === 0 ? item.basePrice : '',
        adjustedPrice:
          index === item.contributions.length - 1 ? item.adjustedPrice : '',
        isApproved: item.isApproved ? 'YES' : 'NO',
        isOverridden: item.isOverridden ? 'YES' : 'NO',
      });
    });
  });

  return Papa.unparse(rows, { header: true });
}
