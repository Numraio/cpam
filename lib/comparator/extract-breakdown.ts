interface GraphNode {
  id: string;
  type: string;
  config: any;
  label?: string;
}

interface PAMGraph {
  nodes: GraphNode[];
  edges: any[];
  output: string;
  metadata?: any;
}

interface PAM {
  id: string;
  name: string;
  graph: PAMGraph;
}

export interface BreakdownRow {
  detail: string;
  mechanismA: string | number;
  mechanismB: string | number;
  isDifferent: boolean;
}

export function extractComponentBreakdown(pamA: PAM, pamB: PAM): BreakdownRow[] {
  const graphA = pamA.graph as PAMGraph;
  const graphB = pamB.graph as PAMGraph;

  const rows: BreakdownRow[] = [];

  // Extract Factor nodes (index series)
  const factorsA = graphA.nodes?.filter((n) => n.type === 'Factor') || [];
  const factorsB = graphB.nodes?.filter((n) => n.type === 'Factor') || [];

  // Total number of components
  const componentCountA = factorsA.length;
  const componentCountB = factorsB.length;
  rows.push({
    detail: 'Total Components',
    mechanismA: componentCountA,
    mechanismB: componentCountB,
    isDifferent: componentCountA !== componentCountB,
  });

  // List all index series used
  const seriesA = factorsA
    .filter((n) => n.config?.series)
    .map((n) => n.config.series)
    .join(', ');
  const seriesB = factorsB
    .filter((n) => n.config?.series)
    .map((n) => n.config.series)
    .join(', ');
  rows.push({
    detail: 'Index Series Used',
    mechanismA: seriesA || 'None',
    mechanismB: seriesB || 'None',
    isDifferent: seriesA !== seriesB,
  });

  // Averaging operation
  const avgOperationA = factorsA[0]?.config?.operation || 'value';
  const avgOperationB = factorsB[0]?.config?.operation || 'value';
  rows.push({
    detail: 'Averaging Operation',
    mechanismA: formatOperation(avgOperationA),
    mechanismB: formatOperation(avgOperationB),
    isDifferent: avgOperationA !== avgOperationB,
  });

  // Lag period
  const lagA = factorsA[0]?.config?.lagDays || 0;
  const lagB = factorsB[0]?.config?.lagDays || 0;
  rows.push({
    detail: 'Lag Period (days)',
    mechanismA: lagA,
    mechanismB: lagB,
    isDifferent: lagA !== lagB,
  });

  // Transforms
  const transformsA = graphA.nodes?.filter((n) => n.type === 'Transform') || [];
  const transformsB = graphB.nodes?.filter((n) => n.type === 'Transform') || [];
  const transformCountA = transformsA.length;
  const transformCountB = transformsB.length;
  rows.push({
    detail: 'Transform Operations',
    mechanismA: transformCountA,
    mechanismB: transformCountB,
    isDifferent: transformCountA !== transformCountB,
  });

  // Conversions
  const conversionsA = graphA.nodes?.filter((n) => n.type === 'Convert') || [];
  const conversionsB = graphB.nodes?.filter((n) => n.type === 'Convert') || [];
  const conversionCountA = conversionsA.length;
  const conversionCountB = conversionsB.length;
  rows.push({
    detail: 'Conversion Operations',
    mechanismA: conversionCountA,
    mechanismB: conversionCountB,
    isDifferent: conversionCountA !== conversionCountB,
  });

  // Controls (caps/floors)
  const controlsA = graphA.nodes?.filter((n) => n.type === 'Controls') || [];
  const controlsB = graphB.nodes?.filter((n) => n.type === 'Controls') || [];
  const hasControlsA = controlsA.length > 0;
  const hasControlsB = controlsB.length > 0;
  rows.push({
    detail: 'Price Controls (Caps/Floors)',
    mechanismA: hasControlsA ? 'Yes' : 'No',
    mechanismB: hasControlsB ? 'Yes' : 'No',
    isDifferent: hasControlsA !== hasControlsB,
  });

  // Total graph complexity
  const totalNodesA = graphA.nodes?.length || 0;
  const totalNodesB = graphB.nodes?.length || 0;
  rows.push({
    detail: 'Total Formula Complexity (nodes)',
    mechanismA: totalNodesA,
    mechanismB: totalNodesB,
    isDifferent: totalNodesA !== totalNodesB,
  });

  return rows;
}

function formatOperation(op: string): string {
  switch (op) {
    case 'value':
      return 'Last Value';
    case 'avg_3m':
      return 'Avg 3M';
    case 'avg_6m':
      return 'Avg 6M';
    case 'avg_12m':
      return 'Avg 12M';
    case 'min':
      return 'Minimum';
    case 'max':
      return 'Maximum';
    default:
      return op;
  }
}
