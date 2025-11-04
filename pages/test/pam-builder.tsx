/**
 * PAM Builder Test Page
 *
 * Simple test page to verify the PAM Builder component works.
 */

'use client';

import React, { useState } from 'react';
import PAMBuilder from '@/components/pam/PAMBuilder';
import type { PAMGraph } from '@/lib/pam/graph-types';

export default function PAMBuilderTestPage() {
  const [savedGraph, setSavedGraph] = useState<PAMGraph | null>(null);
  const [validationState, setValidationState] = useState<{
    valid: boolean;
    errors: string[];
  } | null>(null);

  // Example initial graph (optional)
  const exampleGraph: PAMGraph = {
    nodes: [
      {
        id: 'brent_factor',
        type: 'Factor',
        config: {
          series: 'BRENT',
          lagDays: 30,
          operation: 'avg_3m',
        },
      },
      {
        id: 'transform_1',
        type: 'Transform',
        config: {
          function: 'round',
          params: {
            decimals: 2,
          },
        },
      },
      {
        id: 'controls_1',
        type: 'Controls',
        config: {
          cap: 100,
          floor: 50,
        },
      },
    ],
    edges: [
      { from: 'brent_factor', to: 'transform_1' },
      { from: 'transform_1', to: 'controls_1' },
    ],
    output: 'controls_1',
  };

  const handleSave = (graph: PAMGraph) => {
    setSavedGraph(graph);
    console.log('Saved graph:', graph);
    alert('Graph saved! Check console for details.');
  };

  const handleValidate = (valid: boolean, errors: string[]) => {
    setValidationState({ valid, errors });
    console.log('Validation:', { valid, errors });
  };

  return (
    <div className="min-h-screen bg-base-100">
      <PAMBuilder
        initialGraph={exampleGraph}
        onSave={handleSave}
        onValidate={handleValidate}
        readOnly={false}
      />

      {/* Debug Info */}
      {savedGraph && (
        <div className="fixed bottom-4 right-4 bg-base-200 p-4 rounded-lg shadow-lg max-w-sm">
          <div className="text-sm font-bold mb-2">Last Saved Graph</div>
          <div className="text-xs">
            <div>Nodes: {savedGraph.nodes.length}</div>
            <div>Edges: {savedGraph.edges.length}</div>
            <div>Output: {savedGraph.output}</div>
          </div>
        </div>
      )}
    </div>
  );
}
