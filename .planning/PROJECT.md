# Role Access Visualisation

## What This Is

A personal tool for creating flexible, customized flowcharts that visualize Google Workspace role hierarchies and access relationships. Built with React, TypeScript, and React Flow, it lets you drag and drop role groups, connect them with styled edges, organize them into sections, and manage multiple projects.

## Core Value

**A flexible flowchart editor that just works** — connectors go where you drag them, projects are easy to manage, and the interface is obvious without explanation.

## Requirements

### Validated

<!-- Shipped and confirmed valuable. -->

- ✓ Create role groups with email, label, and section assignment — existing
- ✓ Connect groups with parent-child relationships via edges — existing
- ✓ Customize edge styling (dashed, animated, arrows, labels) — existing
- ✓ Organize groups into collapsible sections with colors — existing
- ✓ Support secondary roles that supplement primary roles — existing
- ✓ Multiple maps/tabs for different projects — existing
- ✓ Drag and reposition nodes freely on canvas — existing
- ✓ Auto-layout using Dagre for hierarchical positioning — existing
- ✓ Export to JSON for backup/sharing — existing
- ✓ Import JSON to restore projects — existing
- ✓ Export to PDF for documentation — existing
- ✓ Persist all data to localStorage — existing
- ✓ Resize section containers — existing
- ✓ Context menu for quick actions — existing

### Active

<!-- Current scope. Building toward these. -->

- [ ] Connectors snap to the handle you actually drag to (not default to top)
- [ ] Launch to "New Project" screen instead of demo data
- [ ] Create blank projects with name/settings
- [ ] Rename existing project tabs
- [ ] Delete project tabs with confirmation
- [ ] Undo/redo for all editing actions
- [ ] Clear, discoverable workflows (obvious how to add groups, connect, edit)
- [ ] Visual feedback when dragging connectors (show valid targets)

### Out of Scope

<!-- Explicit boundaries. Includes reasoning to prevent re-adding. -->

- Multi-user collaboration — personal tool, complexity not justified
- Cloud storage/authentication — localStorage is sufficient for personal use
- Mobile/touch support — desktop-first editor tool
- Real-time sync — single user, no need

## Context

**Existing Codebase:**
- React 19 + TypeScript 5.9 + Vite 7
- @xyflow/react 12.10.0 for graph visualization
- Dagre for automatic layout
- html2canvas + jsPDF for PDF export
- ~1200 lines in main canvas component (complex, needs care when modifying)

**Known Issues:**
- Edge handles don't preserve `sourceHandle`/`targetHandle` properly — edges snap to wrong positions
- No onboarding — dumps user into demo data
- Tab management incomplete — can add tabs but not rename/delete
- No undo/redo — mistakes require manual reverting
- ID generation uses `Date.now()` which can collide

**React Flow Integration:**
- Custom node types: RoleNode, RootNode, SectionContainer
- Custom edge type with EdgeLabelRenderer
- Handles on all four sides of nodes
- ConnectionMode.Loose enabled for flexible connections

## Constraints

- **Tech stack**: Must stay React + TypeScript + React Flow — codebase already built on this
- **Storage**: localStorage only — no backend infrastructure
- **Browser**: Modern browsers only (ES2022+) — acceptable for personal tool

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Fix React Flow handles before new features | Broken connectors block productive use | — Pending |
| Keep localStorage, no cloud | Personal tool, simplicity over features | — Pending |
| Add undo/redo | Essential for any editor tool | — Pending |

---
*Last updated: 2026-01-27 after initialization*
