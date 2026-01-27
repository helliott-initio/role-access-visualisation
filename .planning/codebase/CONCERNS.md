# Codebase Concerns

**Analysis Date:** 2026-01-27

## Tech Debt

**ID Collision Risk:**
- Issue: Groups created via `Date.now()` in `EditModal.tsx` and `SectionModal.tsx` could collide if created in rapid succession (same millisecond)
- Files: `role-map-app/src/components/EditModal.tsx:41`, `role-map-app/src/components/SectionModal.tsx:46`
- Impact: Could cause data loss or duplicate IDs in the map, breaking graph traversal and edge connections
- Fix approach: Use UUID library (already in dependencies) instead of `Date.now()` for guaranteed uniqueness

**Hardcoded Section ID Magic String:**
- Issue: 'secondary-roles' is hardcoded in multiple places rather than defined as a constant
- Files: `role-map-app/src/hooks/useRoleMap.ts:101`, `role-map-app/src/data/simpleStarterMap.ts:18`, `role-map-app/src/components/RoleMapCanvas.tsx:110`, `role-map-app/src/components/EditModal.tsx:71`
- Impact: Fragile to refactoring - changing one requires finding all instances; inconsistency risk
- Fix approach: Define `const SECONDARY_ROLES_SECTION_ID = 'secondary-roles'` in a constants file

**Root Section ID Also Hardcoded:**
- Issue: 'root' section ID referenced but not defined in simpleStarterMap sections
- Files: `role-map-app/src/components/RoleMapCanvas.tsx:139`, `role-map-app/src/data/simpleStarterMap.ts` (missing 'root' section definition)
- Impact: Sections data may be incomplete; can cause bugs when filtering collapsed nodes
- Fix approach: Explicitly define root section in all map data structures

## Known Bugs

**Circular Dependency Prevention Missing:**
- Issue: No validation prevents creating circular parent-child relationships (A→B→A)
- Files: `role-map-app/src/components/EditModal.tsx:136-150`, `role-map-app/src/hooks/useRoleMap.ts:186-211`
- Trigger: User can manually drag edges to create cycles, or select a descendant as parent
- Impact: Graph layout fails, infinite loops possible in traversal operations
- Workaround: Delete problematic edges immediately if detected

**Browser Back/Forward Breaks State:**
- Issue: Navigation history not managed; browser back button loses all data because localStorage is only loaded on component mount
- Files: `role-map-app/src/hooks/useRoleMap.ts:15-25`
- Trigger: User edits map, then presses browser back button
- Impact: Data is lost since there's no session restore mechanism
- Workaround: Manual save/load with JSON export

**Self-Loop Prevention Absent:**
- Issue: No check prevents setting a node as its own parent
- Files: `role-map-app/src/components/EditModal.tsx:141-146`
- Trigger: Selecting current group as parent in modal (caught by UI filtering but not validated)
- Impact: Could corrupt graph if validation is bypassed
- Workaround: Relies on frontend filtering in `primaryGroups` array

## Security Considerations

**localStorage Injection Risk:**
- Risk: User-provided JSON imported via file upload is parsed without sanitization or schema validation
- Files: `role-map-app/src/hooks/useRoleMap.ts:263-275`, `role-map-app/src/components/Toolbar.tsx:32-51`
- Current mitigation: Basic try-catch around JSON.parse; no schema validation
- Recommendations:
  - Add schema validation using Zod (already in node_modules) to enforce RoleMap structure
  - Sanitize imported data to remove unexpected properties
  - Warn users about file origin before importing

**Browser Dialog Vulnerabilities:**
- Risk: Using native `confirm()`, `alert()`, and `prompt()` is unreliable; can be spoofed/blocked
- Files: `role-map-app/src/App.tsx:69,99`, `role-map-app/src/components/Toolbar.tsx:44,74`, `role-map-app/src/components/EditModal.tsx:196`, `role-map-app/src/components/RoleMapCanvas.tsx:807,877`, `role-map-app/src/components/SectionModal.tsx:168`
- Current mitigation: None - using raw browser APIs
- Recommendations:
  - Replace with custom modal components for destructive operations (delete)
  - Use toast notifications for alerts instead of alert()
  - Replace `prompt()` for edge labels with dedicated modal

**Email Domain Assumption:**
- Risk: Hardcoded domain suffix applied without validation; assumes all users belong to one domain
- Files: `role-map-app/src/components/EditModal.tsx:54-56`
- Impact: Cannot represent users from multiple domains; email format not validated
- Recommendations:
  - Store full email in validation
  - Consider multi-domain scenarios in data model

## Performance Bottlenecks

**Large Graph Layout Recalculation:**
- Problem: Dagre layout recalculates on every node/edge change even for tiny modifications
- Files: `role-map-app/src/components/RoleMapCanvas.tsx:217-229`
- Cause: `getInitialNodes()` callback dependency on `builtNodes` and `builtEdges` triggers layout
- Improvement path:
  - Memoize layout calculation separately from node/edge generation
  - Only trigger layout for structural changes (add/remove), not position updates
  - Use position cache to preserve manual layouts

**Position Cache Not Shared Across Sections:**
- Problem: When dragging a section, groups follow but cache doesn't get updated, causing drift
- Files: `role-map-app/src/components/RoleMapCanvas.tsx:276-346`
- Cause: `positionCacheRef` updated inside loop but may not sync with React state
- Improvement path: Batch position updates before calling `setNodes`

**localStorage Serialization on Every State Change:**
- Problem: Entire map structure JSON.stringified to localStorage on every state update
- Files: `role-map-app/src/hooks/useRoleMap.ts:28-30`
- Cause: useEffect with `[state]` dependency triggers on all mutations
- Improvement path:
  - Debounce localStorage writes (500ms)
  - Only persist when user performs save action (explicit save button)
  - Implement undo/redo history instead of immediate persistence

**MultiCombobox Renders Full List on Every Change:**
- Problem: No virtualization for large role lists in secondary role supplements picker
- Files: `role-map-app/src/components/Combobox.tsx:123-212`
- Cause: Renders all options in DOM even if off-screen
- Improvement path: Add virtualization (react-window) if > 100 roles

## Fragile Areas

**RoleMapCanvas Complexity:**
- Files: `role-map-app/src/components/RoleMapCanvas.tsx` (879 lines)
- Why fragile:
  - Multiple ref-based caches (positionCacheRef, sectionPositionsRef, edgeReconnectSuccessful)
  - Complex interdependencies between position tracking, section dragging, and edge reconnection
  - 20+ callbacks with overlapping concerns
- Safe modification:
  - Refactor into smaller sub-components (SectionDragHandler, EdgeManager, PositionManager)
  - Extract position logic to custom hook
  - Add integration tests for section drag + group follow behavior
- Test coverage: No tests exist for position synchronization logic

**useRoleMap State Management:**
- Files: `role-map-app/src/hooks/useRoleMap.ts` (305 lines)
- Why fragile:
  - Single setState call rebuilds entire maps array on every change
  - Orphan group handling scattered (deleteGroup, deleteSection)
  - No validation of relationships (circular deps, missing parents)
- Safe modification:
  - Add relationship validation functions before mutations
  - Extract cascading delete logic to separate function with unit tests
  - Consider using immer for immutable updates
- Test coverage: No tests; orphan handling never validated

**EditModal/SectionModal ID Generation:**
- Files: `role-map-app/src/components/EditModal.tsx:41`, `role-map-app/src/components/SectionModal.tsx:46`
- Why fragile:
  - Timing-dependent ID collision possible
  - IDs cannot be regenerated; breaking change if format changes
- Safe modification:
  - Unit test to verify IDs are unique across concurrent creates
  - Add migration logic if ID format must change
  - Document ID format assumptions

**SectionContainer Store Dependency:**
- Files: `role-map-app/src/components/SectionContainer.tsx:21-23`
- Why fragile:
  - Direct access to ReactFlow store internals (nodeLookup)
  - If ReactFlow updates store API, will break
  - Measured dimensions not guaranteed to be set
- Safe modification:
  - Add fallback dimensions with warnings
  - Consider passing dimensions as props from parent instead
  - Test with ReactFlow updates

## Scaling Limits

**Single Browser Tab Limitation:**
- Current capacity: All data in localStorage (typically 5-10MB limit), single React component tree
- Limit: Cannot scale beyond 1000+ groups due to graph rendering performance
- Scaling path:
  - Implement virtual scrolling for large sections
  - Move to indexedDB for better size limits
  - Add pagination or lazy-load sections
  - Server-side sync for multi-user scenarios

**Hardcoded Responsive Breakpoints Missing:**
- Current capacity: Works on desktop, untested on mobile/tablet
- Scaling path: Add responsive canvas dimensions, mobile-friendly modals, touch-friendly context menus

## Dependencies at Risk

**@xyflow/react API Changes:**
- Risk: Framework recently updated from react-flow-renderer; API surface is large
- Impact: Section resize, custom edges, handle positioning could break on minor version updates
- Migration plan:
  - Pin to specific version (currently ^12.10.0)
  - Add integration tests for core flow operations
  - Monitor @xyflow/react GitHub for breaking changes
  - Keep custom edge/node types isolated for easier migration

**html2canvas Export Reliability:**
- Risk: html2canvas rendering quality depends on CSS support; PDF export can fail silently
- Impact: Users unable to export maps if rendering fails
- Recommendations:
  - Add progress indicator and error state for PDF export
  - Provide fallback SVG export option
  - Test export with complex nested sections

## Missing Critical Features

**No Undo/Redo:**
- Problem: Users can't undo accidental deletions or massive reorganizations
- Blocks: Collaborative editing, safe experimentation
- Recommendation: Implement undo/redo stack (consider immer-based solution)

**No Validation on Import:**
- Problem: Corrupted JSON can partially import, leaving orphan groups
- Blocks: Safe data migration, audit trails
- Recommendation: Pre-validate entire structure before applying changes

**No Circular Dependency Prevention:**
- Problem: Users can create invalid graph structures
- Blocks: Algorithms assuming DAG structure, reliable traversals
- Recommendation: Validate parent assignments before saving

**No Keyboard Navigation:**
- Problem: All operations require mouse/touch
- Blocks: Accessibility, power user workflows
- Recommendation: Add keyboard shortcuts (e.g., Tab between nodes, Delete for selected, Ctrl+S for save)

## Test Coverage Gaps

**No Unit Tests:**
- What's not tested:
  - `useRoleMap.ts` state mutations and cascading effects
  - Circular dependency prevention logic (none exists)
  - Email domain handling and format validation
  - ID collision scenarios
- Files: `role-map-app/src/hooks/useRoleMap.ts`, `role-map-app/src/components/EditModal.tsx`
- Risk: Regressions in core data logic go undetected; can corrupt maps
- Priority: **High** - implement tests for state mutations

**No Integration Tests:**
- What's not tested:
  - Section drag updates child group positions
  - Edge reconnection updates data model correctly
  - Position cache survives collapse/expand cycles
  - PDF export handles complex layouts
- Files: `role-map-app/src/components/RoleMapCanvas.tsx`
- Risk: Canvas interactions have subtle bugs (position drift, lost edges)
- Priority: **High** - critical paths need end-to-end coverage

**No E2E Tests:**
- What's not tested:
  - Full create-edit-delete workflows
  - Import/export round-trip data integrity
  - Multi-section reorganization scenarios
- Risk: User-facing workflows untested; bugs discovered in production
- Priority: **Medium** - add Playwright tests for main workflows

---

*Concerns audit: 2026-01-27*
