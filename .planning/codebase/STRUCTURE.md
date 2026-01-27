# Codebase Structure

**Analysis Date:** 2026-01-27

## Directory Layout

```
role-map-app/
├── src/
│   ├── components/          # Reusable UI components and canvas
│   ├── hooks/               # Custom React hooks (state management)
│   ├── types/               # TypeScript type definitions
│   ├── utils/               # Utility functions (layout, export)
│   ├── data/                # Static data and fixtures
│   ├── assets/              # Images, icons, static files
│   ├── App.tsx              # Root application component
│   ├── main.tsx             # Entry point
│   ├── App.css              # Application styles
│   └── index.css            # Global styles
├── public/                  # Static HTML and public assets
├── dist/                    # Build output (generated)
├── node_modules/            # Dependencies (generated)
├── package.json             # Project metadata and dependencies
├── tsconfig.json            # TypeScript configuration
├── tsconfig.app.json        # TypeScript app-specific config
├── vite.config.ts           # Vite build configuration
└── eslint.config.mjs        # ESLint linting rules
```

## Directory Purposes

**src/components:**
- Purpose: React components for UI rendering and user interaction
- Contains: Presentational components, canvas integration, modals, UI elements
- Key files: `RoleMapCanvas.tsx`, `RoleNode.tsx`, `EditModal.tsx`, `Toolbar.tsx`

**src/hooks:**
- Purpose: Custom React hooks for state management and logic
- Contains: useRoleMap hook with all state mutations and persistence
- Key files: `useRoleMap.ts`

**src/types:**
- Purpose: TypeScript interface definitions for domain models
- Contains: RoleGroup, Section, RoleMap, AppState interfaces
- Key files: `index.ts`

**src/utils:**
- Purpose: Utility functions for graph layout and data export
- Contains: Dagre layout engine, node grouping helpers
- Key files: `layout.ts`

**src/data:**
- Purpose: Initial data and example role maps
- Contains: Sample maps used for bootstrapping application
- Key files: `simpleStarterMap.ts`, `primarySchoolMap.ts`

**src/assets:**
- Purpose: Image and icon files
- Contains: Static images (currently empty or minimal)
- Generated: No

**public/**
- Purpose: Static HTML and files served as-is
- Contains: index.html, favicon, etc.
- Committed: Yes

**dist/**
- Purpose: Production build output
- Generated: Yes (by `vite build`)
- Committed: No

## Key File Locations

**Entry Points:**
- `src/main.tsx`: React app entry point, mounts App to DOM
- `src/App.tsx`: Root application component, page layout and modal orchestration

**Configuration:**
- `vite.config.ts`: Build and dev server configuration
- `tsconfig.json`: TypeScript compiler options
- `package.json`: Dependencies, scripts, project metadata

**Core Logic:**
- `src/hooks/useRoleMap.ts`: State management, all data mutations
- `src/components/RoleMapCanvas.tsx`: Graph visualization and interaction
- `src/types/index.ts`: Domain model definitions

**Testing:**
- No test files currently present; no testing framework configured

## Naming Conventions

**Files:**
- Components: PascalCase with .tsx extension (e.g., `EditModal.tsx`)
- Hooks: camelCase starting with 'use' and .ts extension (e.g., `useRoleMap.ts`)
- Utilities: camelCase with .ts extension (e.g., `layout.ts`)
- Types: Single index.ts file in types directory
- Data: camelCase with .ts extension (e.g., `simpleStarterMap.ts`)

**Directories:**
- Component directories: lowercase (e.g., `components`, `hooks`, `utils`)
- Meaningful naming reflecting contents

**Variables & Functions:**
- State mutations: camelCase verbs (e.g., `updateGroup`, `deleteSection`, `toggleSecondaryRoles`)
- Event handlers: `handle` prefix + action (e.g., `handleNodeSelect`, `handleEditNode`)
- Constants: UPPERCASE_SNAKE_CASE (e.g., `STORAGE_KEY`)
- Props: camelCase with descriptive names (e.g., `showSecondaryRoles`, `onNodePositionChange`)

## Where to Add New Code

**New Feature:**
- Primary code: Create component in `src/components/` if UI-related; add state mutation in `src/hooks/useRoleMap.ts` if data-related
- Tests: Not yet applicable (no test framework configured)

**New Component/Module:**
- Implementation: `src/components/[ComponentName].tsx` for UI components
- Utilities: `src/utils/[utilName].ts` for helper functions
- Import in parent component or App.tsx

**New Data/Fixtures:**
- Shared helpers: `src/utils/` directory
- Domain types: Extend interfaces in `src/types/index.ts`
- Sample data: Add to `src/data/` directory

**Styling:**
- Global styles: `src/index.css`
- Component-specific: `src/App.css` or create [ComponentName].css alongside component
- External: @xyflow/react styles imported in `RoleMapCanvas.tsx`

**Type Definitions:**
- All in `src/types/index.ts`
- Export interfaces from single location for centralized management

## Special Directories

**src/data/:**
- Purpose: Contains initial data and example maps for seeding application
- Generated: No (manually created JSON/TS objects)
- Committed: Yes

**dist/:**
- Purpose: Production build output from Vite
- Generated: Yes (by `vite build` command)
- Committed: No (in .gitignore)

**node_modules/:**
- Purpose: npm dependencies
- Generated: Yes (by `npm install` or package manager)
- Committed: No (in .gitignore)

## Import Organization

**Pattern:**
1. React imports
2. Third-party library imports (@xyflow/react, html2canvas, jsPDF, uuid)
3. Internal type imports (import type from '../types')
4. Internal component imports
5. Internal hook imports
6. CSS imports

**Example from RoleMapCanvas.tsx:**
```typescript
import { useCallback, useMemo, useRef, useEffect, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  // ... other xyflow imports
} from '@xyflow/react';
import type { Node, Edge, NodeChange, Connection, OnReconnect } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

import RoleNode from './RoleNode';
import RootNode from './RootNode';
import SectionContainer from './SectionContainer';
import CustomEdge from './CustomEdge';
import { ContextMenu } from './ContextMenu';
import { getLayoutedElements } from '../utils/layout';
import type { RoleMap, Section } from '../types';
```

**No path aliases configured** - imports use relative paths (../../, ./), navigate by directory proximity

---

*Structure analysis: 2026-01-27*
