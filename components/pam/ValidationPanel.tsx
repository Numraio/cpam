/**
 * Validation Panel Component
 *
 * Displays validation errors and warnings for the PAM graph.
 */

'use client';

import React from 'react';

// ============================================================================
// Types
// ============================================================================

interface ValidationState {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

interface ValidationPanelProps {
  validation: ValidationState;
}

// ============================================================================
// Component
// ============================================================================

export default function ValidationPanel({ validation }: ValidationPanelProps) {
  const { valid, errors, warnings } = validation;
  const hasErrors = errors.length > 0;
  const hasWarnings = warnings.length > 0;

  if (valid && !hasWarnings) {
    return (
      <div className="bg-success text-success-content px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
        <span className="text-lg">✓</span>
        <span className="font-medium">Valid Graph</span>
      </div>
    );
  }

  return (
    <div className="bg-base-100 rounded-lg shadow-lg max-w-md border-2 border-base-300">
      {/* Header */}
      <div
        className={`px-4 py-2 rounded-t-lg font-semibold ${
          hasErrors
            ? 'bg-error text-error-content'
            : 'bg-warning text-warning-content'
        }`}
      >
        {hasErrors ? '⚠️ Validation Errors' : '⚠️ Warnings'}
      </div>

      {/* Content */}
      <div className="p-4 space-y-3 max-h-80 overflow-y-auto">
        {/* Errors */}
        {hasErrors && (
          <div>
            <div className="text-sm font-semibold mb-2 text-error">
              Errors ({errors.length})
            </div>
            <ul className="space-y-1">
              {errors.map((error, index) => (
                <li key={index} className="text-xs text-base-content/80 pl-4 relative">
                  <span className="absolute left-0 text-error">•</span>
                  {error}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Warnings */}
        {hasWarnings && (
          <div className={hasErrors ? 'pt-2 border-t border-base-300' : ''}>
            <div className="text-sm font-semibold mb-2 text-warning">
              Warnings ({warnings.length})
            </div>
            <ul className="space-y-1">
              {warnings.map((warning, index) => (
                <li key={index} className="text-xs text-base-content/80 pl-4 relative">
                  <span className="absolute left-0 text-warning">•</span>
                  {warning}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
