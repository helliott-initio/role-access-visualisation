# Architecture

**Analysis Date:** 2026-01-27

## Pattern Overview

**Overall:** Component-driven React application with hierarchical state management and graph visualization.

**Key Characteristics:**
- Single source of truth in `useRoleMap` hook managing all application state via localStorage
- Declarative data model (RoleMap, RoleGroup, Section) drives visual representation
- React Flow integration for interactive graph visualization and manipulation
- Unidirectional data flow: state → components → callbacks → state updates
- Immutable state updates using object spreading patterns
- Ephemeral UI state (modals, selections) separate from persistent state

## Layers

**Presentation Layer:**
- Purpose: Render UI components and handle user interactions
- Location: `src/components/`
- Contains: React components for canvas, nodes, edges, modals, toolbar
- Depends on: Types, hooks, and utilities
- Used by: App component and other presentations

**State Management Layer:**
- Purpose: Manage application state (maps, groups, sections, selections) and persist to localStorage
- Location: `src/hooks/useRoleMap.ts`
- Contains: State initialization, mutations, selectors, persistence logic
- Depends on: Types and data
- Used by: App component and all state-consuming components

**Data/Types Layer:**
- Purpose: Define domain models and type contracts
- Location: `src/types/index.ts`
- Contains: RoleGroup, Section, RoleMap, AppState interfaces
- Depends on: Nothing (foundational layer)
- Used by: All other layers

**Utility Layer:**
- Purpose: Provide graph layout calculations and export functions
- Location: `src/utils/layout.ts`
- Contains: Dagre-based layout engine, node grouping helpers
- Depends on: Types and @dagrejs/dagre
- Used by: RoleMapCanvas component

**Data/Fixtures Layer:**
- Purpose: Provide initial data and sample role maps
- Location: `src/data/`
- Contains: Default map structures and example data
- Depends on: Types
- Used by: useRoleMap hook initialization

## Data Flow

**Initialization:**

1. App mounts, useRoleMap hook initializes
2. Hook loads from localStorage or uses simpleStarterMap default
3. State set with maps, activeMapId, showSecondaryRoles, selectedNodeId
4. App renders with active map from state

**User Edits Group:**

1. EditModal calls handleSaveGroup callback
2. App calls updateGroup from useRoleMap
3. useRoleMap updates state immutably, sets localStorage
4. Component rerenders with new data
5. RoleMapCanvas detects map change, rebuilds nodes/edges

**User Drags Node:**

1. RoleMapCanvas receives node position change
2. Calls onNodePositionChange callback
3. App calls updateGroupPosition from useRoleMap
4. useRoleMap updates state, localStorage persists change
5. Component state syncs with data model via useEffect

**State Management:**

State shape in localStorage:
```typescript
{
  maps: RoleMap[],
  activeMapId: string,
  showSecondaryRoles: boolean,
  selectedNodeId: string | null
}
```

Each RoleMap contains sections and groups with hierarchical relationships. Groups have optional parentId for tree structure and optional supplementsRoles for secondary role relationships.

## Key Abstractions

**RoleMap:**
- Purpose: Container for an organizational structure with sections and groups
- Examples: `src/data/simpleStarterMap.ts`, `src/data/primarySchoolMap.ts`
- Pattern: Value object with id, name, domain, sections, groups, rootGroupId

**RoleGroup:**
- Purpose: Represents a role/position in the hierarchy with email and visual properties
- Location: Used throughout but defined in `src/types/index.ts`
- Pattern: Tree node with optional parentId, supplementary role relationships, edge styling, and position

**Section:**
- Purpose: Container for grouping related role groups with visual styling and collapse state
- Pattern: Visual container with color, background color, collapsed flag, and optional position/size

**AppState:**
- Purpose: Global application state tracking active map, visibility toggles, and selection
- Pattern: Single immutable object in hook state, persisted to localStorage

**useRoleMap Hook:**
- Purpose: Centralized state management with functional mutation API
- Pattern: Custom hook returning state and mutation callbacks, following React patterns

## Entry Points

**Application Root:**
- Location: `src/main.tsx`
- Triggers: Page load in browser
- Responsibilities: Bootstrap React, render App component

**App Component:**
- Location: `src/App.tsx`
- Triggers: Called by main.tsx, re-renders on state changes
- Responsibilities: Orchestrate page layout (header, toolbar, canvas, modals), manage UI state (modal visibility, editing mode), handle user interactions by calling hook mutations

**RoleMapCanvas:**
- Location: `src/components/RoleMapCanvas.tsx`
- Triggers: Rendered by App with active map
- Responsibilities: Manage React Flow state (nodes/edges), handle drag/drop/reconnection, render context menus, forward position changes to parent, build nodes/edges from map data

**Toolbar:**
- Location: `src/components/Toolbar.tsx`
- Triggers: Rendered by App at top of page
- Responsibilities: Display map tabs, export/import buttons, add group/section buttons, toggle secondary roles visibility

## Error Handling

**Strategy:** Try-catch for JSON parsing, graceful fallbacks for missing data

**Patterns:**
- `useRoleMap` hook catches JSON parse errors on initialization, falls back to initialState
- `importData` tries parsing JSON, returns false on failure with user alert
- PDF export catches html2canvas errors, shows alert to user
- Missing groups/sections handled by defensive checks (?.find())
- Null/undefined properties use optional chaining and default values

## Cross-Cutting Concerns

**Logging:** Browser console.error() for PDF export failures only; otherwise no centralized logging

**Validation:** Runtime validation during import (JSON.parse), visual validation in modals (required fields), type safety via TypeScript

**Authentication:** Not implemented; application is client-side only, no backend integration

**Persistence:** localStorage with key 'role-map-data', automatic sync on every state change via useEffect in useRoleMap

**Undo/Redo:** Not implemented; state mutations are immediate and permanent until next edit

---

*Architecture analysis: 2026-01-27*
