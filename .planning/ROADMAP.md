# Roadmap: Role Access Visualisation

## Overview

This roadmap transforms an existing React Flow app from "almost works" to "just works" by fixing the critical connector positioning bug, improving project lifecycle management, adding undo/redo safety, and polishing the UX. Each phase delivers a complete, usable improvement that compounds with the previous work.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3, 4): Planned milestone work

- [ ] **Phase 1: Connector Fix** - Edges snap to actual drag handles and reconnection works
- [ ] **Phase 2: Project Lifecycle** - Launch experience and full tab management
- [ ] **Phase 3: Undo/Redo** - Safe experimentation with reversible actions
- [ ] **Phase 4: UX Polish** - Discoverable workflows and onboarding hints

## Phase Details

### Phase 1: Connector Fix
**Goal**: Edges connect to the exact handle user drags to, with visual feedback during connection.
**Depends on**: Nothing (first phase)
**Requirements**: CANVAS-01, CANVAS-02, CANVAS-03
**Success Criteria** (what must be TRUE):
  1. User drags from bottom handle of node A to top handle of node B → edge connects bottom-to-top (not snap to defaults)
  2. User sees visual highlight on valid target handles while dragging connector
  3. User reconnects existing edge to different handle → edge position updates and persists across reload
  4. Edge positions survive section collapse/expand without snapping to wrong handles
**Plans**: 2 plans

Plans:
- [ ] 01-01-PLAN.md — Fix edge handle persistence (handles connect to exact positions and persist)
- [ ] 01-02-PLAN.md — Add visual feedback during connection (handles highlight when dragging)

### Phase 2: Project Lifecycle
**Goal**: Users start with clean slate and can manage project tabs through their entire lifecycle.
**Depends on**: Phase 1
**Requirements**: PROJ-01, PROJ-02, PROJ-03, PROJ-04
**Success Criteria** (what must be TRUE):
  1. App launches to "New Project" screen instead of demo data
  2. User can create blank project with custom name and settings
  3. User can rename existing project tab from tab interface
  4. User can delete project tab with confirmation dialog (prevents accidental loss)
  5. Last remaining project cannot be deleted (ensures one project always exists)
**Plans**: TBD

Plans:
- [ ] 02-01: [TBD during planning]

### Phase 3: Undo/Redo
**Goal**: Users can safely experiment knowing any action can be reversed.
**Depends on**: Phase 2
**Requirements**: EDIT-01, EDIT-02, EDIT-03
**Success Criteria** (what must be TRUE):
  1. User adds group → clicks undo → group disappears from canvas
  2. User deletes edge → clicks undo → edge reappears with correct handle positions
  3. User moves node → clicks undo → node returns to previous position
  4. User creates edge → deletes group → clicks undo → group reappears with edge intact
  5. User undoes action → clicks redo → action reapplies with identical state
  6. Undo/redo history persists across browser reload (part of localStorage state)
**Plans**: TBD

Plans:
- [ ] 03-01: [TBD during planning]

### Phase 4: UX Polish
**Goal**: New users understand how to use the tool without external guidance.
**Depends on**: Phase 3
**Requirements**: UX-01, UX-02, UX-03
**Success Criteria** (what must be TRUE):
  1. Empty project canvas shows clear hint for how to add first group (e.g., "Click + to add your first role group")
  2. User hovering over node sees visual cue that handles are draggable for connections
  3. Toolbar has clear, labeled affordances for primary actions (add group, add section, connect)
  4. First-time user can create group, connect two groups, and organize into section within 60 seconds without reading docs
**Plans**: TBD

Plans:
- [ ] 04-01: [TBD during planning]

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Connector Fix | 0/2 | Planned | - |
| 2. Project Lifecycle | 0/? | Not started | - |
| 3. Undo/Redo | 0/? | Not started | - |
| 4. UX Polish | 0/? | Not started | - |

---
*Roadmap created: 2026-01-27*
*Last updated: 2026-01-27 (Phase 1 planned)*
