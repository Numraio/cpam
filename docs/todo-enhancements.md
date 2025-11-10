# TODO: Future Enhancements

## PAM Drag-and-Drop Calculator - Refinements Needed

### Current Status
- ✅ Basic drag-and-drop interface working
- ✅ All 5 node types implemented (Factor, Transform, Convert, Combine, Controls)
- ✅ Node configuration panels
- ✅ Connection workflow (click-to-connect)
- ✅ CRUD operations for PAMs
- ✅ Integration with backend validation

### Enhancements to Implement

#### 1. Visual Graph Rendering
- [ ] Integrate React Flow or D3.js for proper graph visualization
- [ ] Show edges as curved lines between nodes
- [ ] Drag nodes to reposition on canvas
- [ ] Auto-layout algorithm (dagre/elk)
- [ ] Zoom and pan controls
- [ ] Minimap for large graphs

#### 2. User Experience Improvements
- [ ] Drag nodes from palette instead of click-to-add
- [ ] Visual edge drawing (click source, drag to target)
- [ ] Multi-select nodes (Shift+click)
- [ ] Copy/paste nodes (Cmd+C, Cmd+V)
- [ ] Undo/redo functionality
- [ ] Keyboard shortcuts
- [ ] Context menu (right-click on nodes)
- [ ] Snap to grid for alignment
- [ ] Node grouping/containers

#### 3. Validation & Feedback
- [ ] Real-time graph validation (show errors on canvas)
- [ ] Visual indicators for invalid connections
- [ ] Warning badges for incomplete configurations
- [ ] Validation panel showing all errors/warnings
- [ ] Suggest fixes for common issues

#### 4. Formula Testing
- [ ] Test panel with sample inputs
- [ ] Execute formula with test data
- [ ] Show intermediate node values
- [ ] Waterfall chart showing contributions
- [ ] Compare expected vs actual results
- [ ] Save test cases

#### 5. Templates & Library
- [ ] Pre-built PAM templates
  - Basic price adjustment
  - Premium/discount formula
  - Blended pricing
  - FX-adjusted pricing
  - Time-weighted average
- [ ] Save custom templates
- [ ] Template marketplace/sharing
- [ ] Clone existing PAM as template

#### 6. Collaboration Features
- [ ] Version history with diff view
- [ ] Comments on nodes
- [ ] Approval workflow for PAM changes
- [ ] Audit trail (who changed what, when)
- [ ] Lock PAMs in use by calculations

#### 7. Advanced Node Features
- [ ] Custom node types (user-defined formulas)
- [ ] Conditional nodes (if-then-else logic)
- [ ] Loop nodes (for array operations)
- [ ] Lookup tables (CSV import)
- [ ] Date range filtering
- [ ] Aggregation nodes (sum, count, group by)

#### 8. Documentation & Help
- [ ] Interactive tutorial overlay
- [ ] Tooltips on hover (explain node types)
- [ ] Formula documentation generator
- [ ] Export to PDF/Excel with diagrams
- [ ] Video tutorials
- [ ] Best practices guide

#### 9. Performance Optimizations
- [ ] Lazy loading for large graphs
- [ ] Virtual rendering for many nodes
- [ ] Web Worker for graph compilation
- [ ] Debounced validation
- [ ] Incremental graph updates

#### 10. Integration Improvements
- [ ] Link PAMs to Items directly from builder
- [ ] Preview which Items use this PAM
- [ ] Run calculation from PAM detail page
- [ ] Show historical calculation results
- [ ] Alert when PAM changes affect Items

### Priority Order
1. **High Priority**
   - Visual graph rendering (React Flow)
   - Drag-and-drop from palette
   - Real-time validation feedback
   - Formula testing panel

2. **Medium Priority**
   - Templates library
   - Undo/redo
   - Copy/paste nodes
   - Version history

3. **Low Priority**
   - Custom node types
   - Collaboration features
   - Advanced aggregations
   - Marketplace

### Technical Debt to Address
- [ ] GraphBuilder component is large (1000+ lines) - needs refactoring
- [ ] Node configuration editors should be separate components
- [ ] Add unit tests for graph validation logic
- [ ] Add integration tests for PAM CRUD operations
- [ ] Optimize graph state management (consider Zustand/Jotai)
- [ ] Add error boundaries for canvas crashes
- [ ] Implement proper TypeScript discriminated unions for node types

### User Feedback Needed
- [ ] Test with actual users building formulas
- [ ] Gather feedback on node naming conventions
- [ ] Understand most common formula patterns
- [ ] Identify missing node types
- [ ] Validate configuration complexity
