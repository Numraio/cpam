# PAM (Price Adjustment Methodology) UI Guide

## Overview

The PAM UI provides a drag-and-drop visual interface for building formula graphs that calculate adjusted prices for commodities. It integrates with the backend graph execution engine to perform deterministic price calculations.

## Features

### 1. PAM List Page (`/pams`)
- View all Price Adjustment Methodologies
- Summary statistics (total PAMs, total nodes)
- Search and filter capabilities
- Actions: View, Edit, Delete
- Quick access to create new PAM

### 2. PAM Builder (`/pams/new`)
- **Drag-and-Drop Interface**: Visual formula builder
- **Node Palette**: 5 node types available
- **Canvas**: Interactive workspace for building graphs
- **Properties Panel**: Configure each node's settings
- **Validation**: Real-time graph validation

### 3. Node Types

#### Factor (Blue)
- **Purpose**: References index series or constant values
- **Configuration**:
  - Series Code (e.g., "PLATTS_BRENT", "USD_EUR")
  - OR Constant Value
  - Operation: value, avg_3m, avg_6m, avg_12m, min, max
  - Lag Days (optional)
- **Inputs**: None (source node)
- **Use Case**: Starting point for formulas, brings in market data

#### Transform (Green)
- **Purpose**: Applies mathematical transformations
- **Configuration**:
  - Function: abs, ceil, floor, round, log, exp, sqrt, pow, percent_change
  - Parameters (function-specific)
- **Inputs**: 1
- **Use Case**: Mathematical operations on values

#### Convert (Purple)
- **Purpose**: Unit or currency conversion
- **Configuration**:
  - Type: unit or currency
  - From/To units or currencies
  - Conversion factor (for units)
  - FX series or fixed rate (for currencies)
- **Inputs**: 1
- **Use Case**: Converting between units (bbl to MT) or currencies (USD to EUR)

#### Combine (Yellow)
- **Purpose**: Combines multiple inputs
- **Configuration**:
  - Operation: add, subtract, multiply, divide, average, weighted_average, min, max
  - Weights (for weighted_average)
- **Inputs**: 2+ (1+ for min/max)
- **Use Case**: Combining multiple price components

#### Controls (Red)
- **Purpose**: Applies caps, floors, and spike sharing
- **Configuration**:
  - Cap (maximum percentage)
  - Floor (minimum percentage)
  - Trigger Band (optional)
  - Spike Sharing (optional)
- **Inputs**: 1-2
- **Use Case**: Limiting price volatility, applying contractual caps/floors

### 4. Building a Formula

**Workflow:**
1. Click a node type in the palette to add it to the canvas
2. Click on a node to select it and configure in the properties panel
3. Click "Connect" on a node, then click another node to create an edge
4. Set one node as the output (final result)
5. Fill in basic information (name, description)
6. Click "Create PAM" to save

**Example Formula:**
```
Factor (Platts Brent)
  → Convert (USD/bbl to EUR/MT)
  → Combine (+ Premium)
  → Controls (Cap at +10%, Floor at -10%)
  → Output
```

### 5. PAM Detail Page (`/pams/[id]`)
- View complete graph structure
- See all nodes and their configurations
- View connections between nodes
- Export to JSON
- Actions: Edit, Delete

### 6. PAM Edit Page (`/pams/[id]/edit`)
- Same interface as create page
- Pre-populated with existing graph
- Modify nodes, connections, and configuration
- Save changes (increments version)

## Technical Details

### Graph Structure

```typescript
interface PAMGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  output: string; // Node ID that produces final result
  metadata?: {
    description?: string;
    baseCurrency?: string;
    baseUnit?: string;
  };
}
```

### Node Structure

```typescript
interface GraphNode {
  id: string; // Unique identifier
  type: 'Factor' | 'Transform' | 'Convert' | 'Combine' | 'Controls';
  config: NodeConfig; // Type-specific configuration
  label?: string; // Display name
  description?: string;
  position?: { x: number; y: number }; // Canvas position
}
```

### API Endpoints

- `GET /api/teams/:slug/pams` - List all PAMs
- `POST /api/teams/:slug/pams` - Create new PAM
- `GET /api/teams/:slug/pams/:pamId` - Get PAM details
- `PATCH /api/teams/:slug/pams/:pamId` - Update PAM
- `DELETE /api/teams/:slug/pams/:pamId` - Delete PAM

### Data Flow

1. **User Builds Graph** → GraphBuilder component
2. **Graph Validated** → `validateGraphSchema()` (Zod schemas)
3. **Graph Saved** → Prisma PAM table (JSON field)
4. **Graph Compiled** → `compileGraph()` (topological sort)
5. **Graph Executed** → `executeGraph()` (with decimal precision)
6. **Results Stored** → CalcResult table

## Integration Points

### With Items
- PAMs can be associated with Items
- Each Item references a PAM for price calculation
- When items are created, a PAM must be selected

### With Calculations
- PAMs are executed as part of CalcBatch
- Each calculation references a PAM ID
- Results show which PAM was used

### With Scenarios
- Scenarios can override PAM inputs
- Index price overrides affect Factor nodes
- Item overrides can bypass PAM calculation

## Graph Validation

The system validates:
- **Acyclicity**: Graph must be a DAG (Directed Acyclic Graph)
- **Connectivity**: All nodes must be reachable from output
- **Type Constraints**: Each node type has specific input requirements
- **Unit/Currency Consistency**: Combine nodes require matching units/currencies
- **Configuration Completeness**: All required config fields must be present

## Best Practices

1. **Start with Factor nodes**: Every formula needs at least one data source
2. **Use descriptive labels**: Makes graphs easier to understand
3. **Test with simple graphs first**: Build complexity gradually
4. **Document assumptions**: Use description fields liberally
5. **Version control**: Don't delete old PAMs, create new versions
6. **Monitor execution**: Check CalcBatch results for errors

## Common Formulas

### Basic Price Adjustment
```
Factor (Index) → Convert (Unit) → Controls (Cap/Floor) → Output
```

### Premium/Discount Formula
```
Factor (Base Index) → Combine (+ Fixed Premium) → Controls → Output
```

### Blended Pricing
```
Factor (Index 1) ┐
                  ├→ Combine (Weighted Average) → Output
Factor (Index 2) ┘
```

### FX-Adjusted Pricing
```
Factor (Index USD) → Convert (USD to EUR) → Combine (+ Premium) → Output
```

## Troubleshooting

### "Graph must have at least one node"
- Add at least one node from the palette before saving

### "Output node must be set"
- Click "Set Output" button on the final node in your formula

### "Cyclic graph detected"
- Check connections for loops (A → B → C → A)
- Remove circular dependencies

### "Unit mismatch in Combine node"
- Add Convert nodes before Combine to align units
- Ensure all inputs have the same unit

### "Currency mismatch in Combine node"
- Add Convert nodes to convert all inputs to same currency

## Future Enhancements

- [ ] Visual graph rendering (D3.js or React Flow)
- [ ] Drag nodes to reposition on canvas
- [ ] Copy/paste nodes
- [ ] Undo/redo functionality
- [ ] PAM templates library
- [ ] Formula testing with sample data
- [ ] Real-time graph execution preview
- [ ] Version comparison view
- [ ] Export to Excel/PDF
