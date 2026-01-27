# Coding Conventions

**Analysis Date:** 2026-01-27

## Naming Patterns

**Files:**
- Component files: PascalCase (e.g., `RoleNode.tsx`, `EditModal.tsx`)
- Hook files: camelCase with `use` prefix (e.g., `useRoleMap.ts`)
- Utility files: camelCase (e.g., `layout.ts`)
- Type definition files: lowercase with `index` (e.g., `types/index.ts`)
- Style files: match component names (e.g., `App.css`)

**Functions:**
- React components: PascalCase exported as function
- Hooks: camelCase with `use` prefix (e.g., `useRoleMap()`)
- Callback handlers: camelCase with `handle` prefix (e.g., `handleNodeSelect()`, `handleSaveGroup()`)
- Utility functions: camelCase (e.g., `getLayoutedElements()`, `groupNodesBySection()`)
- Event handlers passed as props: camelCase with `on` prefix (e.g., `onNodeSelect`, `onSaveGroup`)

**Variables:**
- State variables: camelCase (e.g., `formData`, `selectedGroup`, `isOpen`)
- Constants: UPPER_SNAKE_CASE (e.g., `STORAGE_KEY`)
- Type/Interface names: PascalCase (e.g., `RoleGroup`, `Section`, `ContextMenuState`)
- Object properties: camelCase (e.g., `parentId`, `sectionId`, `bgColor`)

**Types:**
- Interfaces: PascalCase with descriptive name (e.g., `RoleGroup`, `EditModalProps`, `LayoutOptions`)
- Props interfaces: Suffix with `Props` (e.g., `EditModalProps`, `ToolbarProps`, `RoleMapCanvasProps`)
- Data interfaces: Suffix with `Data` (e.g., `RoleNodeData`, `SectionContainerData`, `CustomEdgeData`)
- Type definitions use `type` keyword (e.g., `type NodeChange`)
- Interfaces use `interface` keyword (e.g., `interface RoleGroup`)

## Code Style

**Formatting:**
- Prettier is configured but not explicitly listed in package.json
- Line length: Appears to follow no strict limit (lines extend to ~100 characters)
- Indentation: 2 spaces
- Quote style: Single quotes for strings, template literals for interpolation
- Semicolons: Required at end of statements

**Linting:**
- Tool: ESLint with TypeScript support
- Config file: `eslint.config.js` (flat config format)
- Key rules applied:
  - Recommended JavaScript rules via `@eslint/js`
  - TypeScript ESLint recommended rules
  - React Hooks rules (from `eslint-plugin-react-hooks`)
  - React Refresh rules (from `eslint-plugin-react-refresh`)

**Linting Command:**
```bash
npm run lint              # Run ESLint on TypeScript/TSX files
```

## Import Organization

**Order:**
1. React core imports (e.g., `import { useState, useCallback } from 'react'`)
2. External library imports (e.g., `import { ReactFlow, ... } from '@xyflow/react'`)
3. Project-relative imports (e.g., `import { useRoleMap } from '../hooks/useRoleMap'`)
4. Style imports (e.g., `import './App.css'`)

**Path Aliases:**
- No path aliases configured; all imports use relative paths with explicit directory traversal
- Example: `import { useRoleMap } from './hooks/useRoleMap'` (from App.tsx)

**Type Imports:**
- Use `type` keyword for type-only imports to avoid circular dependencies
- Example: `import type { RoleGroup, Section } from '../types'`

## Error Handling

**Patterns:**
- Try-catch blocks used for risky operations (JSON parsing, file I/O)
- Catch blocks often use empty identifier or silent failure: `catch { return initialState }`
- Error messages shown via `alert()` for user-facing errors
- `console.error()` used for logging errors: `console.error('Error exporting PDF:', error)`
- Confirmation dialogs via `confirm()` before destructive actions

**Example from `useRoleMap.ts` (localStorage parsing):**
```typescript
try {
  return JSON.parse(stored);
} catch {
  return initialState;
}
```

**Example from `RoleMapCanvas.tsx` (PDF export):**
```typescript
try {
  // Export logic
} catch (error) {
  console.error('Error exporting PDF:', error);
  alert('Error exporting PDF. Please try again.');
}
```

## Logging

**Framework:** `console` object

**Patterns:**
- `console.error()` used for exceptions and critical failures
- No debug logging observed in production code
- Error logging includes context: `console.error('Error exporting PDF:', error)`
- No structured logging or logging library used

## Comments

**When to Comment:**
- Complex algorithms or non-obvious logic
- Example: `// Cache positions to survive collapse/expand cycles` in `RoleMapCanvas.tsx`
- Example: `// Filter groups based on showSecondaryRoles` explaining filtering logic
- Handle ID documentation: `// Handle ID on the parent node (e.g., 'top', 'bottom', 'left', 'right')`

**JSDoc/TSDoc:**
- Not systematically used throughout codebase
- No function-level documentation strings observed
- Only used for inline TypeScript type definitions

## Function Design

**Size:**
- Small, focused functions preferred
- Handler functions typically 5-15 lines
- Complex logic (e.g., `RoleMapCanvas.tsx`) broken into smaller hooks and callbacks
- Utility functions (e.g., `getLayoutedElements()`) kept under 40 lines

**Parameters:**
- Use object destructuring for component props
- Example: `function EditModal({ group, sections, allGroups, domain, onSave, onDelete, onClose, isNew = false }: EditModalProps)`
- Named parameters preferred over positional
- Default values specified in destructuring when appropriate

**Return Values:**
- React components return JSX
- Hooks return objects with multiple named properties
- Example: `useRoleMap()` returns object with 20+ methods and state variables
- Utility functions return typed data or void

## Module Design

**Exports:**
- Named exports for components: `export function EditModal(...)`
- Default export for wrapped components using memo: `export default memo(RoleNode)`
- Hooks exported as named functions: `export function useRoleMap()`
- Utilities exported as named functions: `export function getLayoutedElements(...)`

**Barrel Files:**
- Not used; components imported directly from component files
- Example: `import { useRoleMap } from './hooks/useRoleMap'` rather than from an index

**Co-location:**
- Components, styles, and types kept separate by directory
- Hooks isolated in `hooks/` directory
- Utilities isolated in `utils/` directory
- Types centralized in `types/index.ts`

## TypeScript Strictness

**Compiler Settings (tsconfig.app.json):**
- `strict: true` - enables all strict type checking
- `noUnusedLocals: true` - warns about unused variables
- `noUnusedParameters: true` - warns about unused function parameters
- `noFallthroughCasesInSwitch: true` - prevents missing break statements
- `noUncheckedSideEffectImports: true` - guards against side effects in imports

**Type Casting:**
- Type assertion used where necessary: `const nodeData = data as unknown as RoleNodeData`
- Unknown types cast through `unknown` first for safety
- Type guards used with optional chaining: `section?.id === sectionId`

---

*Convention analysis: 2026-01-27*
