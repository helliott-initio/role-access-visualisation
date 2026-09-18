# Recommendation: from drawing tool to Google-backed role management

**Date:** 2026-09-18
**Scope:** How to make the map reflect Google Workspace continuously, how to use it to
roll out role-based access across schools, and what to do about the React Flow layer.
**Status:** Proposal — supersedes the sequencing in `ROADMAP-V2.md`, not its API research.

---

## 1. The core problem with the current design

The app's source of truth is a **hand-drawn diagram**. `RoleMap` holds `sections`,
`groups`, `connections` and `position`s; Google is a *downstream export target*
(`exportTsv.ts` produces the Workspace Migrate spreadsheet). Nothing in `src/` talks
to a Google API — I checked.

That shape can never satisfy "accurately reflect what is in Google all of the time",
because reality flows the wrong way. Every fix in that direction ends up as a heuristic
that guesses Google semantics from diagram geometry. The repo already shows the symptom:

- `exportTsv.ts` derives **"Member Of" from which way an arrow points**, with a chain of
  fallbacks (explicit connection → parent section → section email → blank).
- `RoleGroup.parentId` is **semantically inverted**. `reparentGroup(childId, newParentId)`
  sets `child.parentId = parent`, the edge is drawn `source=parentId → target=id`, but
  `findGroupMemberOf` resolves membership as `groups.find(g => g.parentId === us)` — i.e.
  the arrow means "the *source* is a member of the target". One field is being read as
  "my parent" in the canvas and "my member" in the export.
- Git history records the cost: `9ef0cdb`, `c80c297`, `1b68639`, `4c8177c` ("revert
  incorrect findGroupMemberOf change") — four commits flip-flopping on this one question.

**Recommendation: invert the model.** Google becomes the source of truth. The diagram
becomes a *view* over it, plus a small layer of presentation overrides.

---

## 2. Target architecture: three layers

Split today's single `RoleMap` blob into three independently-owned layers.

### Layer 1 — Directory snapshot (observed, read-only)
A versioned, timestamped snapshot of what Google actually contains: groups, memberships,
OUs, users, role assignments, group settings. **Keyed on Google's immutable IDs**, never
on email — group emails get renamed and that silently orphans everything downstream.

### Layer 2 — Intent / role model (designed, authored by you)
The role-based access model you *want*: role templates, the naming convention, which
roles nest inside which, per-school parameters (prefix, domain). This is the layer that
answers "what should Chalfont House School's access look like?"

### Layer 3 — Presentation (cosmetic)
Positions, colours, section grouping, annotations, collapse state. Keyed by Google ID,
tolerant of IDs it has never seen (new group → auto-placed; deleted group → override
garbage-collected). This is all that survives of today's `RoleMap`.

The canvas renders `snapshot ⋈ presentation`. Membership is read from the snapshot, never
inferred from edge direction — which deletes the entire class of bug above.

### The feature this unlocks: drift
With intent and observation as separate layers, you can diff them. That is the thing that
turns this from documentation into an operations tool:

| Drift class | Meaning |
|---|---|
| **Unmanaged** | In Google, not in your role model — undocumented group, needs adopting or deleting |
| **Missing** | In your role model, not in Google — school not fully provisioned |
| **Divergent** | Exists both sides, membership/settings differ — someone edited in Admin console |
| **Orphaned** | Group with no members, or no owner, or nested into nothing |

A per-school drift report is, on its own, worth more than the current diagram.

---

## 3. Making it reflect Google "all of the time"

### Recommended: server-side scheduled sync with a service account
For *always-current read*, do **not** start with the interactive OAuth app that
`ROADMAP-V2.md` Phase 5 describes. It is a lot of security-critical work before anyone
sees value, and it makes freshness depend on somebody having the tab open.

Start instead with a **scheduled job**:

```
Cloud Scheduler ──▶ Cloud Run job ──▶ Admin SDK (service account,
                          │            domain-wide delegation)
                          ▼
                   snapshot store (Firestore or GCS JSON)
                          ▲
                    SPA reads snapshot
```

- Service account + domain-wide delegation, impersonating one admin, read-only scopes.
- Runs on a schedule (nightly full; see incremental below). Freshness is independent of
  who is looking.
- No client secret in the browser, no token custody problem, no consent UX.
- Viewers get a fast, always-current map with **zero Google permissions of their own** —
  which matters, because most staff who should read this documentation are not admins.

Add interactive Google sign-in later, and only where it is actually required:
**write operations**, so that changes are attributed to and authorised as a real admin
rather than a shared service account. That is the right security boundary anyway.

### Incremental freshness
A nightly full sync plus **Reports API `activities.list`** (`applicationName=admin`)
polled every few minutes gives near-real-time change detection *and* attribution — you
learn not just that a group changed, but who changed it, which is exactly what a change
log for an IT team needs. Fall back to full reconciliation nightly so missed events
self-heal.

### Scale and quota
Membership is the expensive part: `members.list` is one call per group. For a trust with
multiple school domains this dominates. Mitigations, in order of value: request only the
fields you need, page at `maxResults=200`, drive incremental member refreshes off the
audit events above rather than re-walking every group, exponential backoff on 403/429,
and stagger schools across the schedule.

### APIs worth choosing deliberately
`ROADMAP-V2.md` assumes Directory API throughout. Two additions are worth evaluating:

- **Cloud Identity Groups API** over Directory API for membership. It exposes
  `searchTransitiveMemberships` / `checkTransitiveMembership` — "what does this person
  *effectively* get, through all nesting" — which is the actual RBAC question and which
  you would otherwise have to reimplement (badly, and with cycle bugs).
- **Dynamic groups** (Cloud Identity), where membership is a query over user attributes
  rather than a list. For schools this is the highest-leverage feature available: a role
  group that auto-populates from OU or a custom `role`/`year` attribute never drifts,
  because there is nothing to drift. Licence-gated (Enterprise / Education Plus tiers) —
  **confirm the trust's licensing before designing around it.**

> Verify all API specifics against current Google documentation at implementation time;
> Admin SDK and Cloud Identity surfaces move, and some of the above is from memory.

---

## 4. Role-based access for the schools

This is where the tool earns its keep, and the data already hints at the design:
`RoleMap.prefix` ("School acronym prefix, e.g. CHS"), `domain`, and `Section.type`
(`primary` / `secondary` / `support` / `department`).

**Make the template a first-class object, not a copied map.**

1. **Template** — one role model for the trust: sections, roles, nesting, group type
   (security vs mailing), settings, naming pattern (e.g. `{prefix}-{role}@{domain}`).
2. **Instance** — template + school parameters (prefix, domain, which optional roles
   apply). Instantiating is deterministic, so a new school is *parameters*, not redrawing.
3. **Plan** — diff instance against the live snapshot. Produces an ordered, reviewable
   list: create these groups, nest these, fix these settings, remove these strays.
4. **Apply** — execute the plan through the API, with preview, per-item confirmation,
   destructive-op guards, and an audit trail. Today's TSV export stays as one possible
   apply target for anything that still goes through Workspace Migrate.
5. **Verify** — the next sync re-diffs. A school is "green" when its plan is empty.

The payoff: changing the trust's role model once and seeing the plan for all schools at
the same time. That is the difference between a diagram of a policy and an enforced one.

**Prerequisite that is cheap now and expensive later:** move off `Date.now()` IDs
(`EditModal.tsx`, `SectionModal.tsx`) and off email-as-key, onto stable IDs, with a
`googleId` field on every node. Every later phase depends on identity being stable.

---

## 5. React Flow: the once-over

`RoleMapCanvas.tsx` is 2011 lines. `npx eslint .` currently reports **19 errors,
6 warnings**; `tsc -b` and `npm run build` pass. The errors are not style — they are the
React anti-patterns that produce the bugs you are seeing.

### Confirmed logic bugs

1. **Cycle detection is inverted, so it never fires** — `wouldCreateCycle(childId, parentId)`
   walks up from `parentId`, but both call sites pass `(source, target)` while
   `onReparent(target, source)` makes the *target* the child. Given `A→B→C`, connecting
   `C→A` walks up from `A`, finds no parent, returns false, and the cycle is created.
   *Fixed in this change.*
2. **Dropping a reconnected edge on empty canvas corrupts unrelated data** —
   `onReconnectEnd` unconditionally calls `onReparent(edge.target, null)`. For a
   standalone `conn-` edge that wipes the target group's real parent, *and* never removes
   the connection from `map.connections`, so the edge reappears on the next sync.
   `handleEdgesDelete` already branches correctly on edge kind; `onReconnectEnd` now
   routes through it. *Fixed in this change.*
3. **Undo/redo button state is stale** — `useUndoRedo` returns `canUndo`/`canRedo` as
   functions reading a ref, so history changes never trigger a re-render.
   *Fixed in this change* (ref + version state).

### Structural problems (the real source of "many bugs")

4. **Two sources of truth for edges.** The sync effect keys off a `JSON.stringify`
   "mapKey" built from node IDs, edge IDs, and selected group/section fields. Edge
   labels, edge styles, and `sourceHandle`/`targetHandle` are **not** in that key — so
   data-model edge changes cannot re-sync, which is why `handleUpdateEdgeStyle`,
   `handleReverseEdge` and `onConnect` each hand-patch React Flow state with their own
   `setEdges`. Those two copies drift. **Fix: derive edges from the data model only, and
   diff structurally instead of by string key.**
5. **Section→child dragging is hand-rolled.** ~120 lines in `handleNodesChange` capture
   per-child offsets into `sectionChildOffsetsRef` and reposition children each frame,
   including a `setNodes` call used purely as a state *getter* (returning `currentNodes`
   unchanged). React Flow already does this natively via `parentId` + `extent: 'parent'`
   — the code uses it for department sections but not for role nodes. **Adopting it for
   role nodes deletes this whole mechanism and the drift bugs with it**, and makes
   "which section is this in" structural rather than a `sectionId` string that can
   disagree with where the node visibly sits.
6. **Refs written during render** (`RoleMapCanvas.tsx:276,307,534,535`,
   `useRoleMap.ts:59`, `useFileHandle.ts:36`). Works today, breaks unpredictably under
   StrictMode/concurrent rendering. 6 of the 19 errors.
7. **`setState` inside effects** (`Combobox`, `CommandPalette`, `EditModal`,
   `SectionModal`, `Tooltip`) — cascading renders, 7 of the 19 errors.
8. **Dagre runs on every render.** `getInitialNodes()` is passed as the argument to
   `useNodesState`, so it is evaluated on every render even though only the first result
   is used; it is guarded by a ref but the layout work still happens.
9. **Inline callbacks inside node `data`** (`onResizeGuideLines`, `onResizeSnap`) are new
   objects on every memo run, defeating node memoisation.
10. **`isUndoingRef` is cleared by `setTimeout(..., 100)`** — a race, not a guarantee.
11. **No schema validation on import.** `JSON.parse` straight into state
    (`useRoleMap.ts:666`); malformed or hostile files land in localStorage.
12. **No tests at all.** Zero test files, no test runner. The position-sync and
    membership-derivation logic is exactly the kind that needs them.

---

## 6. Suggested sequencing

I would reorder `ROADMAP-V2.md`. It puts editor polish (Phases 2–4) ahead of all Google
work, which delays the thing you actually asked for behind features that the Google work
will partly invalidate — there is no point perfecting hand-drawn section dragging if
sections become OU-derived.

| # | Phase | Why here |
|---|---|---|
| **0** | **Canvas stabilisation** — items 4, 5, 6 above; stable IDs; a test runner + tests for membership/position logic | Everything later renders on this canvas. Item 5 alone removes a large bug surface. Stable IDs are a prerequisite for *all* sync work. |
| **1** | **Read-only sync spike** — service account, scheduled job, snapshot store, one school | Proves the hard part (auth, quota, mapping) with the smallest possible surface. Delivers "accurately reflects Google" for real. |
| **2** | **Snapshot-backed canvas** — three-layer model; render from snapshot + presentation overrides | The map becomes live. Membership stops being inferred from arrows. |
| **3** | **Drift report** — intent layer + diff + per-school status | First genuinely new capability; useful before any write access exists. |
| **4** | **Templates & plan** — template/instance/plan, TSV as one apply target | Role-based access rollout, still with zero write scopes. |
| **5** | **Interactive auth + apply** — Google sign-in, write scopes, audit trail, guardrails | Only now is write access worth its security cost, and there is a reviewed plan to apply. |
| **6** | **School-specific** — Classroom noise filtering, dynamic groups, delegated admin view | As per `ROADMAP-V2.md` Phase 9, which is good and can stand. |

Editor polish (old Phases 2–4) folds into Phase 0 where it overlaps and is otherwise
deferred — much of it stops mattering once maps are generated rather than drawn.

---

## 7. Decisions needed before Phase 1

1. **Where can this run?** A scheduled sync needs somewhere to run and somewhere to store
   snapshots. Google Cloud Run + Firestore is the natural fit next to Workspace. If there
   is no appetite for hosting, the ceiling is "refresh when someone opens the tab", and
   the architecture changes.
2. **Can we get domain-wide delegation?** A super admin must grant it. If not, the fallback
   is interactive OAuth per admin — doable, but freshness becomes session-bound.
3. **One domain or many?** Do the schools sit in one Workspace with OU separation, or
   separate domains/tenants? This changes the snapshot key, the template instance model,
   and the quota maths.
4. **Licence tier?** Dynamic groups and some Cloud Identity features are gated to
   Enterprise / Education Plus.
5. **Is data sensitivity a constraint?** The snapshot contains staff email addresses and
   org structure. Determines where it may be stored and whether the read-only share link
   in `ROADMAP-V2.md` Phase 7 is acceptable.

---

## 8. What I would do first

Phase 0, item 5 — parent role nodes to their section containers with React Flow's native
`parentId`/`extent`. It is self-contained, deletes more code than it adds, fixes a whole
family of drag/drift bugs, and makes section membership structural, which is the same
shape the Google-backed model needs.
