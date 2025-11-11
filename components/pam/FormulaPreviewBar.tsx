import { useState } from 'react';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';

interface PAMGraph {
  nodes: any[];
  edges: any[];
  output: string;
  metadata?: {
    description?: string;
    baseCurrency?: string;
    baseUnit?: string;
  };
}

interface FormulaPreviewBarProps {
  graph: PAMGraph;
  formulaType: 'additive' | 'multiplicative';
  onFormulaTypeChange: (type: 'additive' | 'multiplicative') => void;
}

export default function FormulaPreviewBar({
  graph,
  formulaType,
  onFormulaTypeChange,
}: FormulaPreviewBarProps) {
  const [showMathNotation, setShowMathNotation] = useState(false);

  // Generate plain-language preview from graph
  const generatePlainLanguagePreview = (): string => {
    if (!graph.nodes || graph.nodes.length === 0) {
      return 'No formula configured yet. Add components to build your formula.';
    }

    const outputNode = graph.nodes.find((n) => n.id === graph.output);
    if (!outputNode) {
      return 'Select an output node to complete your formula.';
    }

    // Find all Factor nodes (inputs)
    const factorNodes = graph.nodes.filter((n) => n.type === 'Factor');
    const combineNodes = graph.nodes.filter((n) => n.type === 'Combine');

    if (factorNodes.length === 0) {
      return 'Add factor nodes to define price inputs.';
    }

    const operation = formulaType === 'additive' ? 'Adding' : 'Multiplying';
    const components = factorNodes
      .map((node) => {
        const label = node.label || node.type;
        const config = node.config || {};

        // Check if it's a weighted component
        if (config.weight !== undefined) {
          return `(${config.weight}% ${label})`;
        }

        // Check if it's a series reference
        if (config.series) {
          return label;
        }

        // Check if it's a constant
        if (config.value !== undefined) {
          return `${config.value}`;
        }

        return label;
      })
      .join(' + ');

    const basePrice = 'Original Price';

    if (formulaType === 'additive') {
      return `New Price is calculated by taking the ${basePrice} and ${operation} the change from ${components}`;
    } else {
      return `New Price is calculated by ${operation} the ${basePrice} by the ratio of ${components}`;
    }
  };

  // Generate mathematical notation
  const generateMathNotation = (): string => {
    if (!graph.nodes || graph.nodes.length === 0) {
      return 'Pn = ?';
    }

    const factorNodes = graph.nodes.filter((n) => n.type === 'Factor');

    if (factorNodes.length === 0) {
      return 'Pn = P0';
    }

    const terms = factorNodes
      .map((node, idx) => {
        const config = node.config || {};
        if (config.weight !== undefined) {
          return `(${config.weight/100} × F${idx + 1})`;
        }
        return `F${idx + 1}`;
      })
      .join(' + ');

    if (formulaType === 'additive') {
      return `Pn = P0 + [ ${terms} ]`;
    } else {
      return `Pn = P0 × [ ${terms} ]`;
    }
  };

  const plainLanguage = generatePlainLanguagePreview();
  const mathNotation = generateMathNotation();

  return (
    <div className="bg-base-100 border-b border-base-300 p-4">
      <div className="flex items-center gap-4">
        {/* Formula Type Toggle */}
        <div className="flex-shrink-0">
          <div className="btn-group">
            <button
              className={`btn btn-sm ${formulaType === 'additive' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => onFormulaTypeChange('additive')}
            >
              <span className="text-xs">Pn = P0 + ΔP</span>
            </button>
            <button
              className={`btn btn-sm ${formulaType === 'multiplicative' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => onFormulaTypeChange('multiplicative')}
            >
              <span className="text-xs">Pn = P0 × Ratio</span>
            </button>
          </div>
        </div>

        {/* Plain Language Preview */}
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-700 truncate" title={plainLanguage}>
            {plainLanguage}
          </p>
        </div>

        {/* Math Notation Toggle */}
        <div className="flex-shrink-0">
          <button
            className="btn btn-sm btn-ghost gap-1"
            onClick={() => setShowMathNotation(!showMathNotation)}
          >
            <span className="text-xs">View Math Notation</span>
            {showMathNotation ? (
              <ChevronUpIcon className="h-3 w-3" />
            ) : (
              <ChevronDownIcon className="h-3 w-3" />
            )}
          </button>
        </div>
      </div>

      {/* Collapsible Math Notation */}
      {showMathNotation && (
        <div className="mt-3 p-3 bg-base-200 rounded-lg border border-base-300">
          <div className="font-mono text-sm text-center">
            {mathNotation}
          </div>
          <div className="mt-2 text-xs text-gray-500 text-center">
            Pn = New Price | P0 = Base Price | F = Factor
          </div>
        </div>
      )}
    </div>
  );
}
