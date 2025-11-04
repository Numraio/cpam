# PAM Builder UI

Visual drag-and-drop graph editor for creating and editing Price Adjustment Mechanism (PAM) graphs using React Flow.

## Overview

The PAM Builder provides a visual interface for:
- Creating PAM graphs with drag-and-drop nodes
- Connecting nodes to define calculation flow
- Configuring node properties
- Validating graph structure
- Testing graph compilation
- Saving/loading PAM graphs

## Components

### PAMBuilder

Main component that orchestrates the entire graph editing experience.

```tsx
import PAMBuilder from '@/components/pam/PAMBuilder';
import type { PAMGraph } from '@/lib/pam/graph-types';

function MyPage() {
  const handleSave = (graph: PAMGraph) => {
    // Save graph to backend
    console.log('Saved:', graph);
  };

  const handleValidate = (valid: boolean, errors: string[]) => {
    console.log('Validation:', { valid, errors });
  };

  return (
    <PAMBuilder
      initialGraph={existingGraph}
      onSave={handleSave}
      onValidate={handleValidate}
      readOnly={false}
    />
  );
}
```

**Props:**
- `initialGraph?: PAMGraph` - Optional initial graph to load
- `onSave?: (graph: PAMGraph) => void` - Called when user clicks Save
- `onValidate?: (valid: boolean, errors: string[]) => void` - Called after validation
- `readOnly?: boolean` - If true, disables editing

### Node Types

The builder supports all 5 PAM node types:

1. **Factor Node** (Blue 📊)
   - Timeseries reference or constant value
   - Configure: series code, lag days, operation (avg_3m, avg_6m, etc.)

2. **Transform Node** (Green 🔧)
   - Mathematical transformations
   - Configure: function (abs, ceil, floor, round, log, exp, sqrt, pow)

3. **Convert Node** (Yellow 🔄)
   - Unit or currency conversion
   - Configure: conversion type, from/to units, conversion factor

4. **Combine Node** (Purple ➕)
   - Combine multiple inputs
   - Configure: operation (add, subtract, multiply, divide, average, weighted_average, min, max)

5. **Controls Node** (Red 🎚️)
   - Apply constraints
   - Configure: cap, floor, spike sharing

### Layout Structure

```
┌─────────────────────────────────────────────────────────────┐
│ Header: [Validate] [Test] [Save]                            │
├─────────┬────────────────────────────────────┬──────────────┤
│         │                                    │              │
│  Node   │      React Flow Canvas            │ Properties   │
│ Palette │                                    │    Panel     │
│         │  - Background grid                 │              │
│  [📊]   │  - MiniMap                         │  Selected:   │
│  [🔧]   │  - Zoom controls                   │  Factor Node │
│  [🔄]   │  - Validation overlay              │              │
│  [➕]   │                                    │  [Config]    │
│  [🎚️]  │                                    │  [Set Output]│
│         │                                    │              │
│  [💡]   │                                    │              │
│  Tip    │                                    │              │
└─────────┴────────────────────────────────────┴──────────────┘
```

## Features

### Creating Nodes

1. Click a node type in the left palette
2. Node appears on canvas at random position
3. Drag node to desired location
4. Click node to open properties panel

### Connecting Nodes

1. Hover over a node's output handle (right side)
2. Drag to another node's input handle (left side)
3. Connection creates smoothstep animated edge
4. Graph auto-validates after connection

### Configuring Nodes

1. Click a node to select it
2. Properties panel opens on right
3. Edit configuration fields
4. Changes apply immediately
5. Graph auto-validates after changes

### Setting Output Node

1. Select a node
2. Check "Set as output node" in properties panel
3. Only one output node allowed per graph

### Validation

- **Real-time**: Graph validates after every change
- **Visual feedback**: Validation panel shows in top-right corner
- **Error types**:
  - Structural errors (cycles, disconnected nodes)
  - Configuration errors (missing required fields)
  - Type errors (incompatible connections)

### Testing

Click "Test" button to:
1. Compile graph to execution plan
2. Verify all nodes are reachable
3. Show execution order
4. Display any compilation errors

### Saving

Click "Save" button to:
1. Run final validation
2. Convert React Flow graph to PAM graph format
3. Call `onSave` callback with PAM graph

## Example Usage

### Creating a Simple PAM

```tsx
// pages/pam/new.tsx
import PAMBuilder from '@/components/pam/PAMBuilder';

export default function NewPAMPage() {
  const handleSave = async (graph: PAMGraph) => {
    const response = await fetch('/api/pam', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'My PAM',
        description: 'Price adjustment based on Brent crude',
        graph,
      }),
    });

    if (response.ok) {
      router.push('/pam');
    }
  };

  return <PAMBuilder onSave={handleSave} />;
}
```

### Editing Existing PAM

```tsx
// pages/pam/[id]/edit.tsx
import PAMBuilder from '@/components/pam/PAMBuilder';

export default function EditPAMPage({ pam }: { pam: PAM }) {
  const handleSave = async (graph: PAMGraph) => {
    await fetch(`/api/pam/${pam.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ graph }),
    });
  };

  return (
    <PAMBuilder
      initialGraph={pam.graph as PAMGraph}
      onSave={handleSave}
    />
  );
}
```

### Read-Only View

```tsx
// pages/pam/[id].tsx
import PAMBuilder from '@/components/pam/PAMBuilder';

export default function ViewPAMPage({ pam }: { pam: PAM }) {
  return (
    <PAMBuilder
      initialGraph={pam.graph as PAMGraph}
      readOnly={true}
    />
  );
}
```

## Graph Format Conversion

The builder automatically converts between:

### React Flow Format (Internal)
```typescript
{
  nodes: [
    {
      id: 'factor_1',
      type: 'Factor',
      position: { x: 100, y: 100 },
      data: {
        config: { series: 'BRENT' },
        label: 'factor_1',
      },
    },
  ],
  edges: [
    {
      id: 'e1-factor_1-transform_1',
      source: 'factor_1',
      target: 'transform_1',
      type: 'smoothstep',
      animated: true,
    },
  ],
}
```

### PAM Graph Format (Saved)
```typescript
{
  nodes: [
    {
      id: 'factor_1',
      type: 'Factor',
      config: { series: 'BRENT' },
    },
  ],
  edges: [
    { from: 'factor_1', to: 'transform_1' },
  ],
  output: 'controls_1',
}
```

## Keyboard Shortcuts

- **Delete**: Delete selected node(s)
- **Escape**: Deselect all
- **Mouse wheel**: Zoom in/out
- **Space + drag**: Pan canvas
- **Click + drag**: Select multiple nodes

## Styling

The builder uses DaisyUI classes for theming:
- `base-100`: Canvas background
- `base-200`: Panel backgrounds
- `base-300`: Borders
- `primary`: Selected state, buttons
- Node colors: `blue-500`, `green-500`, `yellow-500`, `purple-500`, `red-500`

## Testing

Test page available at `/test/pam-builder` shows:
- Example graph with 3 connected nodes
- Save handler logging to console
- Validation feedback
- Debug info panel

## Future Enhancements

Potential improvements:
- [ ] Undo/redo functionality
- [ ] Copy/paste nodes
- [ ] Minimap customization
- [ ] Export as image
- [ ] Keyboard shortcuts panel
- [ ] Node grouping
- [ ] Template library
- [ ] Auto-layout algorithm
- [ ] Collaborative editing
- [ ] Version history

## Dependencies

- `reactflow` (v11.11.4): Core graph library
- `@xyflow/react` (v12.9.2): React Flow v12 compatibility
- DaisyUI: Component styling
- React: UI framework
