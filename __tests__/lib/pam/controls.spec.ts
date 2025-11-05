/**
 * Tests for Controls Node
 *
 * Controls apply caps, floors, trigger bands, and spike sharing to price deltas.
 */

import { D } from '@/lib/calc/decimal';
import { executeGraph } from '@/lib/pam/graph-executor';
import type { PAMGraph, ControlsNodeConfig } from '@/lib/pam/types';

describe('Controls Node - Cap', () => {
  it('applies cap to positive delta', () => {
    // Base price: $100
    // Calculated price: $110 (10% increase)
    // Cap: +5%
    // Expected: $105 (base * 1.05)

    const graph: PAMGraph = {
      nodes: [
        {
          id: 'base',
          type: 'factor',
          config: { value: 100 },
        },
        {
          id: 'calculated',
          type: 'factor',
          config: { value: 110 },
        },
        {
          id: 'controls',
          type: 'controls',
          config: {
            cap: 5, // +5% cap
          },
        },
      ],
      edges: [
        { from: 'calculated', to: 'controls' },
        { from: 'base', to: 'controls' },
      ],
      output: 'controls',
    };

    const result = executeGraph(graph, {});

    expect(result.toNumber()).toBe(105);
  });

  it('does not apply cap when delta below cap', () => {
    // Base: $100, Calculated: $103 (3% increase), Cap: +5%
    // Expected: $103 (no capping needed)

    const graph: PAMGraph = {
      nodes: [
        {
          id: 'base',
          type: 'factor',
          config: { value: 100 },
        },
        {
          id: 'calculated',
          type: 'factor',
          config: { value: 103 },
        },
        {
          id: 'controls',
          type: 'controls',
          config: {
            cap: 5,
          },
        },
      ],
      edges: [
        { from: 'calculated', to: 'controls' },
        { from: 'base', to: 'controls' },
      ],
      output: 'controls',
    };

    const result = executeGraph(graph, {});

    expect(result.toNumber()).toBe(103);
  });

  it('applies cap to negative delta (preventing large decreases)', () => {
    // Base: $100, Calculated: $70 (-30% decrease), Cap: -10%
    // Expected: $90 (base * 0.90)

    const graph: PAMGraph = {
      nodes: [
        {
          id: 'base',
          type: 'factor',
          config: { value: 100 },
        },
        {
          id: 'calculated',
          type: 'factor',
          config: { value: 70 },
        },
        {
          id: 'controls',
          type: 'controls',
          config: {
            cap: -10, // Cap at -10% (no more than 10% decrease)
          },
        },
      ],
      edges: [
        { from: 'calculated', to: 'controls' },
        { from: 'base', to: 'controls' },
      ],
      output: 'controls',
    };

    const result = executeGraph(graph, {});

    expect(result.toNumber()).toBe(90);
  });
});

describe('Controls Node - Floor', () => {
  it('applies floor to negative delta', () => {
    // Base: $100, Calculated: $80 (-20% decrease), Floor: -10%
    // Expected: $90 (base * 0.90)

    const graph: PAMGraph = {
      nodes: [
        {
          id: 'base',
          type: 'factor',
          config: { value: 100 },
        },
        {
          id: 'calculated',
          type: 'factor',
          config: { value: 80 },
        },
        {
          id: 'controls',
          type: 'controls',
          config: {
            floor: -10, // Floor at -10% (at least -10% decrease)
          },
        },
      ],
      edges: [
        { from: 'calculated', to: 'controls' },
        { from: 'base', to: 'controls' },
      ],
      output: 'controls',
    };

    const result = executeGraph(graph, {});

    expect(result.toNumber()).toBe(90);
  });

  it('does not apply floor when delta above floor', () => {
    // Base: $100, Calculated: $95 (-5% decrease), Floor: -10%
    // Expected: $95 (no flooring needed)

    const graph: PAMGraph = {
      nodes: [
        {
          id: 'base',
          type: 'factor',
          config: { value: 100 },
        },
        {
          id: 'calculated',
          type: 'factor',
          config: { value: 95 },
        },
        {
          id: 'controls',
          type: 'controls',
          config: {
            floor: -10,
          },
        },
      ],
      edges: [
        { from: 'calculated', to: 'controls' },
        { from: 'base', to: 'controls' },
      ],
      output: 'controls',
    };

    const result = executeGraph(graph, {});

    expect(result.toNumber()).toBe(95);
  });

  it('applies floor to positive delta (preventing small increases)', () => {
    // Base: $100, Calculated: $102 (+2% increase), Floor: +5%
    // Expected: $105 (base * 1.05)

    const graph: PAMGraph = {
      nodes: [
        {
          id: 'base',
          type: 'factor',
          config: { value: 100 },
        },
        {
          id: 'calculated',
          type: 'factor',
          config: { value: 102 },
        },
        {
          id: 'controls',
          type: 'controls',
          config: {
            floor: 5, // Floor at +5% (at least 5% increase)
          },
        },
      ],
      edges: [
        { from: 'calculated', to: 'controls' },
        { from: 'base', to: 'controls' },
      ],
      output: 'controls',
    };

    const result = executeGraph(graph, {});

    expect(result.toNumber()).toBe(105);
  });
});

describe('Controls Node - Collar (Cap + Floor)', () => {
  it('applies both cap and floor (collar)', () => {
    // Collar: -5% to +10%

    const graph: PAMGraph = {
      nodes: [
        {
          id: 'base',
          type: 'factor',
          config: { value: 100 },
        },
        {
          id: 'calculated',
          type: 'factor',
          config: { value: 100 }, // Will be overridden in tests
        },
        {
          id: 'controls',
          type: 'controls',
          config: {
            floor: -5, // -5% floor
            cap: 10, // +10% cap
          },
        },
      ],
      edges: [
        { from: 'calculated', to: 'controls' },
        { from: 'base', to: 'controls' },
      ],
      output: 'controls',
    };

    // Test above cap: $120 (+20%) → $110 (+10%)
    graph.nodes[1].config.value = 120;
    let result = executeGraph(graph, {});
    expect(result.toNumber()).toBe(110);

    // Test below floor: $80 (-20%) → $95 (-5%)
    graph.nodes[1].config.value = 80;
    result = executeGraph(graph, {});
    expect(result.toNumber()).toBe(95);

    // Test within collar: $105 (+5%) → $105 (unchanged)
    graph.nodes[1].config.value = 105;
    result = executeGraph(graph, {});
    expect(result.toNumber()).toBe(105);
  });
});

describe('Controls Node - Trigger Band', () => {
  it('suppresses deltas within trigger band', () => {
    // Trigger band: -3% to +3%
    // Deltas within this range are suppressed to 0

    const graph: PAMGraph = {
      nodes: [
        {
          id: 'base',
          type: 'factor',
          config: { value: 100 },
        },
        {
          id: 'calculated',
          type: 'factor',
          config: { value: 100 },
        },
        {
          id: 'controls',
          type: 'controls',
          config: {
            triggerBand: {
              lower: -3,
              upper: 3,
            },
          },
        },
      ],
      edges: [
        { from: 'calculated', to: 'controls' },
        { from: 'base', to: 'controls' },
      ],
      output: 'controls',
    };

    // Test +2% delta → suppressed to 0 → $100
    graph.nodes[1].config.value = 102;
    let result = executeGraph(graph, {});
    expect(result.toNumber()).toBe(100);

    // Test -2% delta → suppressed to 0 → $100
    graph.nodes[1].config.value = 98;
    result = executeGraph(graph, {});
    expect(result.toNumber()).toBe(100);

    // Test exactly at upper band (+3%) → suppressed → $100
    graph.nodes[1].config.value = 103;
    result = executeGraph(graph, {});
    expect(result.toNumber()).toBe(100);

    // Test exactly at lower band (-3%) → suppressed → $100
    graph.nodes[1].config.value = 97;
    result = executeGraph(graph, {});
    expect(result.toNumber()).toBe(100);
  });

  it('does not suppress deltas outside trigger band', () => {
    // Trigger band: -3% to +3%

    const graph: PAMGraph = {
      nodes: [
        {
          id: 'base',
          type: 'factor',
          config: { value: 100 },
        },
        {
          id: 'calculated',
          type: 'factor',
          config: { value: 100 },
        },
        {
          id: 'controls',
          type: 'controls',
          config: {
            triggerBand: {
              lower: -3,
              upper: 3,
            },
          },
        },
      ],
      edges: [
        { from: 'calculated', to: 'controls' },
        { from: 'base', to: 'controls' },
      ],
      output: 'controls',
    };

    // Test +5% delta → not suppressed → $105
    graph.nodes[1].config.value = 105;
    let result = executeGraph(graph, {});
    expect(result.toNumber()).toBe(105);

    // Test -5% delta → not suppressed → $95
    graph.nodes[1].config.value = 95;
    result = executeGraph(graph, {});
    expect(result.toNumber()).toBe(95);
  });
});

describe('Controls Node - Spike Sharing', () => {
  it('shares portion of spike above upper band', () => {
    // Trigger band: -3% to +3%
    // Spike sharing: 50% of spike above upper band
    // Delta: +8% → spike of 5% above upper band → share 50% → +3% + 2.5% = +5.5%

    const graph: PAMGraph = {
      nodes: [
        {
          id: 'base',
          type: 'factor',
          config: { value: 100 },
        },
        {
          id: 'calculated',
          type: 'factor',
          config: { value: 108 },
        },
        {
          id: 'controls',
          type: 'controls',
          config: {
            triggerBand: {
              lower: -3,
              upper: 3,
            },
            spikeSharing: {
              sharePercent: 50,
              direction: 'above',
            },
          },
        },
      ],
      edges: [
        { from: 'calculated', to: 'controls' },
        { from: 'base', to: 'controls' },
      ],
      output: 'controls',
    };

    const result = executeGraph(graph, {});

    expect(result.toNumber()).toBe(105.5);
  });

  it('shares portion of spike below lower band', () => {
    // Trigger band: -3% to +3%
    // Spike sharing: 50% of spike below lower band
    // Delta: -8% → spike of 5% below lower band → share 50% → -3% - 2.5% = -5.5%

    const graph: PAMGraph = {
      nodes: [
        {
          id: 'base',
          type: 'factor',
          config: { value: 100 },
        },
        {
          id: 'calculated',
          type: 'factor',
          config: { value: 92 },
        },
        {
          id: 'controls',
          type: 'controls',
          config: {
            triggerBand: {
              lower: -3,
              upper: 3,
            },
            spikeSharing: {
              sharePercent: 50,
              direction: 'below',
            },
          },
        },
      ],
      edges: [
        { from: 'calculated', to: 'controls' },
        { from: 'base', to: 'controls' },
      ],
      output: 'controls',
    };

    const result = executeGraph(graph, {});

    expect(result.toNumber()).toBe(94.5);
  });

  it('shares spikes in both directions', () => {
    // Spike sharing: 50% both directions

    const graph: PAMGraph = {
      nodes: [
        {
          id: 'base',
          type: 'factor',
          config: { value: 100 },
        },
        {
          id: 'calculated',
          type: 'factor',
          config: { value: 100 },
        },
        {
          id: 'controls',
          type: 'controls',
          config: {
            triggerBand: {
              lower: -3,
              upper: 3,
            },
            spikeSharing: {
              sharePercent: 50,
              direction: 'both',
            },
          },
        },
      ],
      edges: [
        { from: 'calculated', to: 'controls' },
        { from: 'base', to: 'controls' },
      ],
      output: 'controls',
    };

    // Test spike above: +8% → +5.5%
    graph.nodes[1].config.value = 108;
    let result = executeGraph(graph, {});
    expect(result.toNumber()).toBe(105.5);

    // Test spike below: -8% → -5.5%
    graph.nodes[1].config.value = 92;
    result = executeGraph(graph, {});
    expect(result.toNumber()).toBe(94.5);
  });
});

describe('Controls Node - Combined Controls', () => {
  it('applies trigger band, spike sharing, and cap in order', () => {
    // Trigger band: -3% to +3%
    // Spike sharing: 50% above
    // Cap: +5%
    //
    // Delta: +10%
    // After spike sharing: +3% + (7% * 50%) = +6.5%
    // After cap: +5%
    // Result: $105

    const graph: PAMGraph = {
      nodes: [
        {
          id: 'base',
          type: 'factor',
          config: { value: 100 },
        },
        {
          id: 'calculated',
          type: 'factor',
          config: { value: 110 },
        },
        {
          id: 'controls',
          type: 'controls',
          config: {
            triggerBand: {
              lower: -3,
              upper: 3,
            },
            spikeSharing: {
              sharePercent: 50,
              direction: 'above',
            },
            cap: 5,
          },
        },
      ],
      edges: [
        { from: 'calculated', to: 'controls' },
        { from: 'base', to: 'controls' },
      ],
      output: 'controls',
    };

    const result = executeGraph(graph, {});

    expect(result.toNumber()).toBe(105);
  });

  it('applies full collar with trigger band and spike sharing', () => {
    // Collar: -10% to +10%
    // Trigger band: -3% to +3%
    // Spike sharing: 50% both directions

    const graph: PAMGraph = {
      nodes: [
        {
          id: 'base',
          type: 'factor',
          config: { value: 100 },
        },
        {
          id: 'calculated',
          type: 'factor',
          config: { value: 100 },
        },
        {
          id: 'controls',
          type: 'controls',
          config: {
            floor: -10,
            cap: 10,
            triggerBand: {
              lower: -3,
              upper: 3,
            },
            spikeSharing: {
              sharePercent: 50,
              direction: 'both',
            },
          },
        },
      ],
      edges: [
        { from: 'calculated', to: 'controls' },
        { from: 'base', to: 'controls' },
      ],
      output: 'controls',
    };

    // Test within trigger band: +2% → suppressed → $100
    graph.nodes[1].config.value = 102;
    let result = executeGraph(graph, {});
    expect(result.toNumber()).toBe(100);

    // Test moderate spike: +8% → +5.5% (after spike sharing) → $105.50
    graph.nodes[1].config.value = 108;
    result = executeGraph(graph, {});
    expect(result.toNumber()).toBe(105.5);

    // Test large spike: +25% → +3% + (22% * 50%) = +14% → capped to +10% → $110
    graph.nodes[1].config.value = 125;
    result = executeGraph(graph, {});
    expect(result.toNumber()).toBe(110);
  });
});

describe('Controls Node - Acceptance Tests', () => {
  it('Given a cap at +5%, then computed delta never exceeds +5%', () => {
    // Base: $100, Calculated: $115 (+15%), Cap: +5%
    // Expected: $105 (+5% exactly)

    const graph: PAMGraph = {
      nodes: [
        {
          id: 'base',
          type: 'factor',
          config: { value: 100 },
        },
        {
          id: 'calculated',
          type: 'factor',
          config: { value: 115 },
        },
        {
          id: 'controls',
          type: 'controls',
          config: {
            cap: 5,
          },
        },
      ],
      edges: [
        { from: 'calculated', to: 'controls' },
        { from: 'base', to: 'controls' },
      ],
      output: 'controls',
    };

    const result = executeGraph(graph, {});

    // Delta should be exactly +5%, never exceeding
    const delta = (result.toNumber() - 100) / 100 * 100;
    expect(delta).toBe(5);
    expect(result.toNumber()).toBe(105);
  });

  it('Given trigger band 3%, then deltas within band are suppressed', () => {
    // Base: $100, Calculated: $102 (+2%), Trigger band: -3% to +3%
    // Expected: $100 (delta suppressed to 0)

    const graph: PAMGraph = {
      nodes: [
        {
          id: 'base',
          type: 'factor',
          config: { value: 100 },
        },
        {
          id: 'calculated',
          type: 'factor',
          config: { value: 102 },
        },
        {
          id: 'controls',
          type: 'controls',
          config: {
            triggerBand: {
              lower: -3,
              upper: 3,
            },
          },
        },
      ],
      edges: [
        { from: 'calculated', to: 'controls' },
        { from: 'base', to: 'controls' },
      ],
      output: 'controls',
    };

    const result = executeGraph(graph, {});

    // Delta within band should be suppressed
    expect(result.toNumber()).toBe(100);
  });
});
