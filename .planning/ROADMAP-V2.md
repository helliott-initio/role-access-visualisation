# Roadmap V2: Role Access Visualisation

## Vision

Evolve from a standalone flowchart editor into a **live Google Workspace role hierarchy viewer and management tool** for school IT administrators. The tool will connect to real Google Admin data, display always-up-to-date organizational structures, and eventually allow managing roles, groups, and permissions directly from the visual interface.

## Strategic Phases

```
Phase 1: Connector Fix .............. [COMPLETE]
Phase 2: Project Lifecycle .......... [Foundational — editor]
Phase 3: Undo/Redo .................. [Foundational — editor]
Phase 4: UX Polish .................. [Foundational — editor]
Phase 5: Architecture Transition .... [Backend + Auth scaffold]
Phase 6: Google Admin Read .......... [Live data import]
Phase 7: Live Documentation Viewer .. [Auto-sync + always-current maps]
Phase 8: Google Admin Management .... [Write-back operations]
Phase 9: School-Specific Features ... [OUs, Classroom, delegated admin]
```

Phases 2-4 remain unchanged from ROADMAP.md. Phases 5-9 are new.

---

## Foundational Phases (Unchanged)

### Phase 2: Project Lifecycle
**Goal**: Users start with a clean slate and can manage project tabs through their entire lifecycle.
**Depends on**: Phase 1
**Requirements**: PROJ-01, PROJ-02, PROJ-03, PROJ-04
**Success Criteria**:
  1. App launches to "New Project" screen instead of demo data
  2. User can create blank project with custom name and settings
  3. User can rename existing project tab from tab interface
  4. User can delete project tab with confirmation dialog
  5. Last remaining project cannot be deleted

### Phase 3: Undo/Redo
**Goal**: Users can safely experiment knowing any action can be reversed.
**Depends on**: Phase 2
**Requirements**: EDIT-01, EDIT-02, EDIT-03
**Success Criteria**:
  1. Undo reverses add, delete, move, and connect operations
  2. Redo restores undone actions with identical state
  3. Undo/redo history persists across browser reload

### Phase 4: UX Polish
**Goal**: New users understand how to use the tool without external guidance.
**Depends on**: Phase 3
**Requirements**: UX-01, UX-02, UX-03
**Success Criteria**:
  1. Empty canvas shows clear onboarding hints
  2. Handles show visual cue that they are draggable
  3. First-time user can create and connect groups within 60 seconds

---

## New Phases

### Phase 5: Architecture Transition
**Goal**: Introduce a backend layer that supports OAuth2 authentication with Google and provides a secure API proxy for Google Admin SDK calls. The frontend remains a React SPA but gains the ability to authenticate users and make authorized API requests.

**Depends on**: Phase 4 (editor must be stable before adding integration complexity)

**Key Decisions**:

| Decision | Options Considered | Recommendation | Rationale |
|----------|-------------------|----------------|-----------|
| Backend approach | Express server, Next.js API routes, Cloudflare Workers, Firebase Functions | **Next.js API routes** or **standalone Express server** | Next.js gives SSR benefits later; Express is simpler if staying SPA. Evaluate during planning. |
| Hosting | Vercel, Cloud Run, self-hosted | **Cloud Run** or **Vercel** | School domains often use Google Cloud; Cloud Run fits naturally. Vercel is simpler for Next.js. |
| Token storage | Session cookies, encrypted localStorage, server-side session store | **Server-side session with httpOnly cookies** | Tokens must never be exposed to client JS. Google refresh tokens are sensitive. |
| Data caching | In-memory, Redis, SQLite | **SQLite** (via better-sqlite3 or Turso) | Lightweight, zero-infrastructure, sufficient for single-school use. Stores cached org data. |

**Architecture Changes**:
- New: Backend server (Express or Next.js API routes)
- New: OAuth2 flow (Google Identity Platform)
- New: Session management (httpOnly cookies, server-side token storage)
- New: SQLite database for caching Google Admin data and storing user preferences
- Change: Frontend gains authenticated API client (fetch wrapper with session cookie)
- Change: localStorage remains for canvas/editor state; backend handles Google data

**Implementation Steps**:

1. **Set up backend project structure**
   - Action: Initialize backend with TypeScript, Express (or Next.js)
   - Add SQLite for session/cache storage
   - Risk: Medium — architectural decision affects all future phases

2. **Implement Google OAuth2 flow**
   - Action: Register Google Cloud project, configure OAuth consent screen
   - Implement authorization code flow with PKCE
   - Store tokens server-side, issue session cookie to client
   - Scopes needed (read-only for now):
     - `https://www.googleapis.com/auth/admin.directory.group.readonly`
     - `https://www.googleapis.com/auth/admin.directory.user.readonly`
     - `https://www.googleapis.com/auth/admin.directory.orgunit.readonly`
     - `https://www.googleapis.com/auth/admin.directory.rolemanagement.readonly`
   - Risk: High — OAuth is security-critical; must handle token refresh, revocation, and error states

3. **Create API proxy layer**
   - Action: Build proxy endpoints that forward authenticated requests to Google Admin SDK
   - Apply rate limiting and error handling
   - Endpoints: `/api/groups`, `/api/users`, `/api/orgunits`, `/api/roles`
   - Risk: Medium — must handle Google API quota limits gracefully

4. **Add authentication state to frontend**
   - Action: Auth context provider, login/logout UI, protected routes
   - Show "Connect Google Workspace" button when not authenticated
   - Show domain info and user identity when authenticated
   - Risk: Low

5. **Environment and deployment configuration**
   - Action: Docker/docker-compose for local dev, deployment config for chosen host
   - Environment variables for Google client ID/secret, session secret
   - Risk: Low

**Google Cloud Project Setup Requirements**:
- Enable Admin SDK API in Google Cloud Console
- Configure OAuth consent screen (internal app for school domain)
- Create OAuth 2.0 Client ID (web application type)
- Add authorized redirect URIs
- Request domain-wide delegation if service account approach is used later
- Note: The school's Google Workspace super admin must grant consent

**Success Criteria**:
  1. User clicks "Connect Google Workspace" and completes OAuth flow
  2. Backend stores tokens securely; frontend never sees access/refresh tokens
  3. Authenticated API calls to Google Admin SDK succeed through the proxy
  4. Session survives browser refresh (cookie-based)
  5. Logout revokes tokens and clears session
  6. Unauthenticated users can still use the manual editor (no Google required)

---

### Phase 6: Google Admin Read Integration
**Goal**: Import real Google Workspace organizational data and display it as a role map. Users can pull their actual groups, members, and organizational units into the visual editor.

**Depends on**: Phase 5

**Google Admin APIs Used**:

| API | Endpoint | Purpose |
|-----|----------|---------|
| Directory API — Groups | `directory.groups.list` | List all Google Groups in the domain |
| Directory API — Group Members | `directory.members.list` | List members of each group |
| Directory API — Users | `directory.users.list` | List users and their org unit paths |
| Directory API — OrgUnits | `directory.orgunits.list` | List organizational unit hierarchy |
| Directory API — Roles | `directory.roles.list` | List admin roles (super admin, delegated admin, etc.) |
| Directory API — Role Assignments | `directory.roleAssignments.list` | List who has which admin role |
| Groups Settings API | `groupsSettings.groups.get` | Get group settings (who can post, join, etc.) |

**Data Mapping — Google Concepts to Role Map Concepts**:

| Google Workspace Concept | Maps To | Notes |
|--------------------------|---------|-------|
| Organizational Unit (OU) | Section | Top-level OUs become sections; nested OUs become sub-sections |
| Google Group | RoleGroup node | email, label from group name, sectionId from member OUs |
| Group membership (nested groups) | Edge (parent-child) | Group A contains Group B = edge from A to B |
| Group membership (users) | Displayed in node details | Not separate nodes; shown in expanded node info |
| Admin Role | RoleGroup with special styling | Super Admin, delegated admin roles shown distinctly |
| Role Assignment | Edge from role to user/group | Connects admin role nodes to assigned entities |
| Group type (security vs mailing) | `mailType` field on RoleGroup | Map from Google Groups Settings |

**Implementation Steps**:

1. **Build Google Admin data fetcher service**
   - Action: Server-side service that calls Google Admin SDK endpoints
   - Fetch groups, members, OUs, roles, and role assignments
   - Handle pagination (Google APIs return pages of 200 items)
   - Cache results in SQLite with TTL (e.g., 15 minutes)
   - Risk: Medium — must handle large domains with thousands of groups

2. **Create data transformation layer**
   - Action: Transform Google Admin API responses into RoleMap data structures
   - Map OUs to Sections, Groups to RoleGroups, nested group membership to edges
   - Resolve group-in-group nesting to parent-child edges
   - Detect security groups vs mailing lists
   - Risk: Medium — complex mapping logic; edge cases with circular group membership

3. **Build "Import from Google" UI flow**
   - Action: New modal/panel that shows available Google data
   - Preview of what will be imported (group count, OU count)
   - Option to import into new project or merge with existing
   - Progress indicator for large domains
   - Risk: Low

4. **Handle import into canvas**
   - Action: Create RoleMap from transformed data
   - Run Dagre auto-layout on imported nodes
   - Assign section colors automatically based on OU hierarchy
   - Preserve any manual positioning if merging with existing map
   - Risk: Medium — layout quality for large graphs

5. **Add domain overview dashboard**
   - Action: Summary view showing domain stats (total groups, users, OUs)
   - Quick health check (orphaned groups, empty groups, large groups)
   - Risk: Low

**Success Criteria**:
  1. User clicks "Import from Google Workspace" and sees their real groups and OUs
  2. Imported data correctly maps nested group membership to parent-child edges
  3. OUs appear as sections with appropriate hierarchy
  4. Admin roles appear as distinct nodes with role assignments shown
  5. Import handles domains with 500+ groups without timeout
  6. Cached data avoids redundant API calls within TTL window
  7. Manual editor still works independently (Google integration is additive)

---

### Phase 7: Live Documentation Viewer
**Goal**: Transform the tool from a one-time import into a **living document** that stays synchronized with Google Workspace. The role map automatically reflects the current state of the domain, making it a reliable documentation resource for school IT teams.

**Depends on**: Phase 6

**Implementation Steps**:

1. **Implement background sync engine**
   - Action: Server-side scheduled job (cron or polling) that periodically fetches Google Admin data
   - Compare fetched data with cached data; compute diff
   - Configurable sync interval (default: every 4 hours; admin can set 1-24 hours)
   - Risk: Medium — must handle API quota (Google Admin SDK has daily limits per domain)

2. **Build change detection and diff system**
   - Action: Compare previous cached state with new fetch
   - Detect: new groups, removed groups, membership changes, OU changes, role assignment changes
   - Store change history (what changed, when)
   - Risk: Medium — diff logic must be accurate to avoid false positives

3. **Add change notification UI**
   - Action: Badge/indicator showing "X changes since last viewed"
   - Change log panel showing recent changes with timestamps
   - Option to "accept" changes (update map layout) or "review" them first
   - Risk: Low

4. **Implement auto-update with layout preservation**
   - Action: When changes are detected, update the data model
   - Preserve manual position overrides where the underlying node still exists
   - Only re-layout new nodes; keep existing node positions stable
   - Highlight new/changed nodes visually (glow, badge, or border)
   - Risk: High — layout stability is critical for usability

5. **Add "last synced" indicator and manual refresh**
   - Action: Show "Last synced: 2 hours ago" in the toolbar
   - "Refresh now" button for on-demand sync
   - Show sync errors clearly (expired token, API quota exceeded)
   - Risk: Low

6. **Implement read-only sharing mode**
   - Action: Generate a shareable URL (or static HTML export) of the current map
   - Viewers see the live map without needing Google auth
   - Useful for sharing documentation with staff who are not admins
   - Risk: Medium — must ensure no sensitive data leaks

**Google API Quota Considerations**:
- Directory API: 600 queries per minute per domain (aggregated across all apps)
- Groups Settings API: 5 queries per second per group
- Strategy: Batch requests, cache aggressively, use exponential backoff
- For large schools (2000+ groups): stagger fetches across multiple sync cycles

**Success Criteria**:
  1. Map automatically reflects group/OU changes within the configured sync interval
  2. Manual layout overrides are preserved when data updates
  3. New/changed nodes are visually highlighted
  4. Change log shows accurate history of what changed and when
  5. Sync errors are displayed clearly with remediation guidance
  6. Shareable read-only view works for non-admin staff
  7. API quota is not exceeded under normal sync schedules

---

### Phase 8: Google Admin Management (Write Operations)
**Goal**: Allow users to perform Google Workspace admin operations directly from the visual interface. The map becomes not just a viewer but a management tool.

**Depends on**: Phase 7

**IMPORTANT: This phase requires elevated OAuth scopes and careful security review.**

**Additional OAuth Scopes Required**:
- `https://www.googleapis.com/auth/admin.directory.group` (read-write)
- `https://www.googleapis.com/auth/admin.directory.user` (read-write for group membership changes)
- `https://www.googleapis.com/auth/admin.directory.orgunit` (read-write)
- `https://www.googleapis.com/auth/admin.directory.rolemanagement` (read-write)

**Google Admin APIs Used (Write)**:

| Operation | API Method | Risk Level |
|-----------|-----------|------------|
| Create group | `directory.groups.insert` | Medium |
| Delete group | `directory.groups.delete` | HIGH |
| Add member to group | `directory.members.insert` | Medium |
| Remove member from group | `directory.members.delete` | HIGH |
| Update group settings | `groupsSettings.groups.update` | Medium |
| Move user to OU | `directory.users.update` (orgUnitPath) | HIGH |
| Create OU | `directory.orgunits.insert` | Medium |
| Assign admin role | `directory.roleAssignments.insert` | CRITICAL |
| Remove admin role | `directory.roleAssignments.delete` | CRITICAL |

**Implementation Steps**:

1. **Implement scope upgrade flow**
   - Action: When user wants to enable management mode, trigger re-authorization with write scopes
   - Show clear warning about what write access means
   - Keep read-only mode as default; management mode is opt-in
   - Risk: Medium — re-consent flow must be seamless

2. **Build confirmation and preview system**
   - Action: Every write operation requires explicit confirmation
   - Show exactly what will change before executing
   - "Dry run" preview for bulk operations
   - Risk: Low — but critical for safety

3. **Implement group management operations**
   - Action: Create group, delete group, rename group from context menu
   - Add/remove members from node detail panel
   - Update group settings (who can post, who can join)
   - Risk: Medium — each operation needs error handling and rollback awareness

4. **Implement OU management operations**
   - Action: Create OU, move users between OUs
   - Visual drag-and-drop to move users between OU sections
   - Risk: High — moving users between OUs affects their policies and apps

5. **Add audit log for all write operations**
   - Action: Log every management action with timestamp, user, operation, target
   - Store locally and optionally export
   - Show recent actions in a sidebar panel
   - Risk: Low — but essential for accountability

6. **Implement role-based access control for the tool itself**
   - Action: Only users with appropriate Google Admin roles can perform write operations
   - Check delegated admin scope before allowing operations
   - Super admin operations (role assignments) require super admin status
   - Risk: High — must correctly enforce permissions

**Safety Rails**:
- All destructive operations require double confirmation
- Bulk operations (more than 5 items) require typing a confirmation phrase
- Rate limiting on write operations (prevent accidental mass changes)
- "Management mode" toggle in the UI (default: off / read-only)
- All operations are logged with full audit trail
- No operations can bypass Google's own permission model

**Success Criteria**:
  1. User can create a new Google Group from the canvas context menu
  2. User can add/remove group members from the node detail panel
  3. Every write operation shows a clear preview before execution
  4. All management operations are logged in the audit trail
  5. Read-only mode is the default; management mode requires explicit opt-in
  6. Users without appropriate admin roles cannot access write operations
  7. Destructive operations require double confirmation
  8. Operations propagate to the live map within one sync cycle

---

### Phase 9: School-Specific Features
**Goal**: Add features tailored to how schools actually use Google Workspace, going beyond generic admin tools.

**Depends on**: Phase 6 (read integration); some features depend on Phase 8 (management)

**Note**: This phase can be partially parallelized with Phases 7 and 8. Features that only require read access can begin after Phase 6.

**School-Specific Google Workspace Concepts**:

| Concept | API/Source | Why It Matters |
|---------|-----------|----------------|
| Organizational Units (staff vs students) | Directory API OrgUnits | Schools separate staff/student OUs for policy enforcement |
| Google Classroom groups | Classroom API (`courses.list`) | Classes auto-generate groups; these clutter admin view |
| Year/grade-level groups | Naming convention detection | Schools often have "Year7@", "Grade5@" patterns |
| Department groups | Naming convention + OU | "Science@", "English@" map to teaching departments |
| SIS-synced groups | GADS/School connector | Groups auto-provisioned from Student Information System |
| Delegated admin roles | Directory API Roles | Schools delegate admin to department heads, IT assistants |
| Shared drives mapping | Drive API (optional) | Which groups own which shared drives |
| Chrome policy groups | Groups used for Chrome management | Important for device policy understanding |

**Additional API Scopes (Optional)**:
- `https://www.googleapis.com/auth/classroom.courses.readonly` (for Classroom integration)
- `https://www.googleapis.com/auth/drive.readonly` (for shared drive mapping, optional)

**Implementation Steps**:

1. **OU hierarchy visualization** (Requires: Phase 6)
   - Action: Render full OU tree as nested sections
   - Distinguish student OUs from staff OUs with visual styling
   - Show OU-level policies summary (if available)
   - Risk: Low

2. **Google Classroom awareness** (Requires: Phase 6 + Classroom API scope)
   - Action: Detect and tag Classroom-generated groups
   - Option to hide/show Classroom groups (they clutter the view)
   - Show class name, teacher, and student count
   - Risk: Low — read-only, well-documented API

3. **Smart group categorization** (Requires: Phase 6)
   - Action: Auto-detect group purpose using naming patterns and membership
   - Categories: Department, Year/Grade, Role, Policy, Distribution, Classroom, System
   - Allow manual override of auto-detected category
   - Color-code and filter by category
   - Risk: Medium — heuristic-based; may misclassify

4. **Delegated admin role visualization** (Requires: Phase 6)
   - Action: Show which users have delegated admin roles
   - Visualize the scope of each delegated role (which OUs, which privileges)
   - Highlight "privilege escalation" risks (e.g., delegated admin who can create other admins)
   - Risk: Medium — privilege scope mapping is complex

5. **Staff role change workflow** (Requires: Phase 8)
   - Action: When a staff member changes role (e.g., teacher becomes department head)
   - Show all groups they are in and suggest which to add/remove
   - Wizard-style flow: "Remove from [Teaching Staff], Add to [Department Heads], Grant [OU admin]"
   - Risk: High — write operations affecting real users

6. **New starter / leaver checklist** (Requires: Phase 8)
   - Action: Template-based workflow for onboarding and offboarding
   - New starter: Add to relevant groups based on role and department
   - Leaver: Remove from all groups, transfer ownership, suspend account
   - Show checklist progress visually on the map
   - Risk: High — write operations; must not accidentally remove wrong users

7. **Group health audit dashboard** (Requires: Phase 6)
   - Action: Identify common issues in school Google Workspace setups
   - Empty groups (no members)
   - Orphaned groups (no owner)
   - Overly permissive groups (anyone can join/post)
   - Duplicate groups (similar name/membership)
   - Groups with external members (data leak risk)
   - Stale groups (no activity in 6+ months)
   - Risk: Low — read-only analysis

**Success Criteria**:
  1. OU hierarchy renders as nested sections with staff/student distinction
  2. Classroom groups are detected and can be filtered out
  3. Groups are auto-categorized with 80%+ accuracy
  4. Delegated admin roles are visualized with scope information
  5. Staff role change wizard correctly suggests group modifications
  6. Group health audit identifies at least 5 issue categories
  7. School IT admin can understand their full domain structure in under 5 minutes

---

## Technical Architecture Summary

### Current Architecture (Phases 1-4)
```
[Browser]
  └─ React SPA (Vite)
       ├─ React Flow (canvas)
       ├─ localStorage (persistence)
       └─ Static hosting (no backend)
```

### Target Architecture (Phases 5-9)
```
[Browser]
  └─ React SPA (Vite or Next.js frontend)
       ├─ React Flow (canvas)
       ├─ localStorage (editor state, layout)
       └─ Authenticated API client (session cookie)
              │
              ▼
[Backend Server] (Express or Next.js API routes)
  ├─ OAuth2 flow handler (Google Identity Platform)
  ├─ Session management (httpOnly cookies)
  ├─ API proxy to Google Admin SDK
  ├─ Data transformation layer (Google → RoleMap)
  ├─ Background sync engine (cron/polling)
  ├─ Audit log
  └─ SQLite database
       ├─ Session store
       ├─ Cached Google Admin data
       ├─ Change history
       └─ Audit trail
              │
              ▼
[Google Admin SDK APIs]
  ├─ Directory API (users, groups, OUs, roles)
  ├─ Groups Settings API
  ├─ Classroom API (optional)
  └─ Drive API (optional)
```

### Key Architectural Principles
1. **Backend handles all Google API communication** — tokens never reach the browser
2. **Offline-capable editor** — manual editing works without Google connection
3. **Additive integration** — Google features layer on top of existing editor; nothing is removed
4. **Cache-first reads** — always show cached data immediately, sync in background
5. **Explicit write operations** — every mutation requires user confirmation

---

## OAuth2 Scopes Summary

| Phase | Scopes | Access Level |
|-------|--------|-------------|
| Phase 5-6 | `admin.directory.group.readonly`, `admin.directory.user.readonly`, `admin.directory.orgunit.readonly`, `admin.directory.rolemanagement.readonly` | Read-only |
| Phase 7 | Same as Phase 5-6 | Read-only |
| Phase 8 | `admin.directory.group`, `admin.directory.user`, `admin.directory.orgunit`, `admin.directory.rolemanagement` | Read-write |
| Phase 9 | Above + `classroom.courses.readonly` (optional), `drive.readonly` (optional) | Mixed |

**Scope upgrade strategy**: Start with minimal read-only scopes. Only request write scopes when the user explicitly enables management mode. This reduces the consent screen friction and follows the principle of least privilege.

---

## Google Workspace Admin Requirements

For this tool to work with a school's Google Workspace:

1. **Google Cloud Project**: Must be created in the school's Google Cloud organization
2. **OAuth Consent Screen**: Configured as "Internal" (only users in the school domain can authorize)
3. **Admin SDK enabled**: The Admin SDK API must be enabled in the Google Cloud project
4. **Admin account**: The user logging in must have a Google Workspace admin role (at minimum a custom role with read permissions for the Directory API)
5. **Domain verification**: For internal apps, the Google Cloud project must be in the same organization as the Workspace domain
6. **Super admin consent**: Initial setup may require a super admin to grant consent for the OAuth scopes

---

## Risk Register

| Risk | Likelihood | Impact | Phase | Mitigation |
|------|-----------|--------|-------|------------|
| Google API quota exceeded | Medium | High | 6-7 | Aggressive caching, staggered sync, exponential backoff |
| OAuth token expiry during long sessions | High | Medium | 5+ | Silent refresh with refresh token; clear error message if refresh fails |
| Large school domains (5000+ groups) overwhelm the UI | Medium | High | 6 | Pagination, filtering, lazy rendering, category-based views |
| Write operation causes unintended changes | Low | CRITICAL | 8 | Double confirmation, dry-run preview, audit log, read-only default |
| Google changes Admin SDK API | Low | Medium | 6+ | Pin API versions, monitor deprecation notices |
| School switches Google Workspace editions | Low | Medium | 6+ | Check available APIs at auth time; degrade gracefully |
| Circular group membership causes infinite loops | Medium | Medium | 6 | Cycle detection in group membership traversal |
| Users confuse cached data with live data | Medium | Medium | 7 | Clear "last synced" indicator, visual staleness warnings |
| OAuth consent screen scares non-technical admins | Medium | Medium | 5 | Clear documentation, in-app explanation of each scope |

---

## Delivery Timeline Estimate

| Phase | Estimated Effort | Can Start After |
|-------|-----------------|-----------------|
| Phase 2: Project Lifecycle | 1-2 weeks | Phase 1 (done) |
| Phase 3: Undo/Redo | 1-2 weeks | Phase 2 |
| Phase 4: UX Polish | 1 week | Phase 3 |
| Phase 5: Architecture Transition | 2-3 weeks | Phase 4 |
| Phase 6: Google Admin Read | 2-3 weeks | Phase 5 |
| Phase 7: Live Documentation Viewer | 2-3 weeks | Phase 6 |
| Phase 8: Google Admin Management | 3-4 weeks | Phase 7 |
| Phase 9: School-Specific Features | 3-4 weeks (incremental) | Phase 6 (partial), Phase 8 (full) |

**Independent deliverability**: Each phase produces a usable product:
- After Phase 4: Polished manual flowchart editor
- After Phase 6: Google-connected role map viewer (one-time import)
- After Phase 7: Live documentation tool (auto-syncing)
- After Phase 8: Full admin management interface
- After Phase 9: School-optimized admin tool

---

## Progress

| Phase | Status | Completed |
|-------|--------|-----------|
| 1. Connector Fix | Complete | 2026-01-27 |
| 2. Project Lifecycle | Not started | - |
| 3. Undo/Redo | Not started | - |
| 4. UX Polish | Not started | - |
| 5. Architecture Transition | Not started | - |
| 6. Google Admin Read | Not started | - |
| 7. Live Documentation Viewer | Not started | - |
| 8. Google Admin Management | Not started | - |
| 9. School-Specific Features | Not started | - |

---
*Roadmap V2 created: 2026-04-02*
*Previous roadmap: ROADMAP.md (Phases 1-4 only)*
*Last updated: 2026-04-02*
