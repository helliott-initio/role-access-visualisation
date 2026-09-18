# Spec: verify the role map against Google Workspace

**Date:** 2026-09-18
**Status:** Agreed in interview. Supersedes `ROADMAP-V2.md` phases 5–9 and the earlier
`RECOMMENDATION-GOOGLE-SYNC.md` (deleted — its central premise was wrong, see §1).
**Reference data:** `Secondary Role Map - CHS` (corfehills.net, prefix CHS, 40 sections,
40 groups, 59 connections).

---

## 1. What this actually is

**The app holds the intent. Google gets read to confirm it.**

My first proposal had this backwards — it assumed Google should become the source of
truth and the map a projection of it. The interview established the opposite:

- The map is a **planning tool and documentation**. It describes the structure the IT
  team has *defined*, including where they intend to end up.
- Nothing is provisioned from it. The TSV export goes nowhere today.
- Nothing is currently going wrong. This is not an incident-response tool.
- The job is: **confirm what is and isn't in Google, against the structure defined here.**

So the map represents **target state**, and the difference against Google is the gap —
which doubles as the worklist for closing it. A missing group is a to-do, not a fault.

### Consequences of that, and of "IT team only"

| Earlier assumption | Actual |
|---|---|
| Backend service, scheduled sync | **None.** On-demand check, in the browser |
| Service account + domain-wide delegation | **None.** Each admin signs in as themselves |
| Google as source of truth | App is the source of truth for intent |
| Write-back / provisioning phase | **Out of scope** |
| Public read-only share for non-admin staff | Not needed — IT team only |
| Check user membership | **No.** Groups, nesting and type only |

This collapses the project from "build a synced platform" to "add a read-only check to
the existing static site". It stays a GitHub Pages SPA with no server.

---

## 2. What gets checked

Confirmed in interview: **groups exist**, **nesting is right**, **settings and type**.
Explicitly *not* who the members are — that data is large, churns constantly, and isn't
what the map is for.

Measured against the CHS map:

| | Count |
|---|---|
| Distinct group emails to confirm exist | **79** |
| Intended memberships to confirm | **89** |
| Distinct container groups (drives `members.list` calls) | **36** |
| Estimated API calls for a full school check | **~37** |

A complete pass for a school is a couple of seconds of browser work. Freshness is a
non-problem at this size — hence "on demand is fine".

---

## 3. The structural decision that unblocks all of it

The map currently encodes structure **three different ways, and they disagree**:

1. `connections` — drawn arrows (59)
2. Visual nesting — a box inside a box, via `section.parentSectionId` / `group.sectionId` (28 more)
3. `group.parentId` — a per-group field (2 more)

In the CHS map, `maths@` and `art@` have a drawn arrow to `teachers@`; `english@`,
`science@`, `dt@`, `music@` and eleven others sit in the same box with no arrow. The TSV
exporter hides this behind a fallback chain. A verifier cannot: "not a member in Google"
would be indistinguishable from "you drew it the other way".

**Agreed rule: nesting means membership.** Containment *is* an assertion; arrows are
emphasis. All three encodings collapse to one set of assertions:

> intended memberships = containment ∪ drawn connections ∪ parentId  →  **89 for CHS**

### Direction, stated once

`X.parentId = Y` renders as edge `Y → X` and means **Y is a member of X**. The field name
is the exact inverse of its meaning, which is why `findGroupMemberOf` has been reverted
four times in git history (`9ef0cdb`, `c80c297`, `1b68639`, `4c8177c`). It goes.

Canonical direction from here: **an edge points from member to container.**

### Model change (my call, per "leave that one up to you")

**Merge sections and groups in the data; keep the look on the canvas.**

Sections already *are* Google groups — `CHS Maths Dept` is `maths@corfehills.net`, with an
email and a `mailType`, exactly like a role node. The split is presentational, but it
forces every piece of logic to be written twice (`findSectionMemberOf` vs
`findGroupMemberOf`), and forces `section-` string prefixes into every node id,
connection endpoint and lookup.

```ts
interface Group {
  id: string;                    // stable uuid, never derived from the name
  email: string;                 // the key matched against Google
  label: string;
  containedBy: string | null;    // membership AND visual nesting — one field, one meaning
  roleTier?: 'primary' | 'secondary' | 'support';
  mailType: 'security' | 'mailing' | null;
  display: {
    container?: boolean;         // drawn as a box rather than a node
    position: { x: number; y: number };
    size?: { width: number; height: number };
    collapsed?: boolean;
    color: string;
    bgColor: string;
  };
}

interface Membership {           // a drawn arrow
  id: string;
  member: string;                // group id
  container: string;             // group id
}
```

The canvas renders `display.container` groups as boxes and the rest as nodes, so **it
looks exactly as it does now** — which is the requirement the team actually cares about.
A migration converts existing maps on load, with the CHS file as the test fixture —
**subject to §8**, since it is real school data and this repository is public.

Why `roleTier` and not `phase`: confirmed in interview that `primary | secondary | support`
means **role tier**, not school phase. School phase (primary/secondary) is a separate axis
and needs its own field when phase-grouping arrives — reusing this one would be a trap.

---

## 4. How the check works

```
[Check against Google] ──▶ Google sign-in (the admin's own account, read-only)
                              │
                              ▼
                    1 × groups.list for the school's domain   → existence + ids + names
                    36 × members.list on container groups      → nesting (group members only)
                    n × Cloud Identity groups.get              → security-group label
                              │
                              ▼
                    per-node status badges on the canvas
```

- **Scoping is by domain.** Each school has its own domain (`corfehills.net`), so
  `groups.list?domain=` is the natural boundary. Note that **Google Groups do not live in
  OUs** — the per-school OUs organise users, not groups, so OUs cannot scope this, and
  phase-grouping the OUs will not phase-group anything about the groups.
- **Matching is by email**, which is authored explicitly on every node. No fuzzy matching
  is needed. The convention (`hod<subject>@`, `<role>@`, `<team>team@`) is not strictly
  derivable anyway — `CHS Teaching Staff` is `teachers@`, `CHS Teaching Assistants` is
  `tas@` — so the email stays the authored key rather than something generated.
- Membership fetches keep only members of type `GROUP` and discard users, so no personal
  data is held.

### Scopes

- `admin.directory.group.readonly` — existence and nesting
- `cloud-identity.groups.readonly` — the security-group label, which is what
  `mailType: 'security'` actually corresponds to

> Note: checking deeper group settings (who can post/join) needs
> `apps.groups.settings`, which has **no read-only variant**. Recommend staying off it
> until there's a reason, so the app can honestly claim read-only access.
> Verify all API and scope details against current Google docs at build time.

### Output

**Status badges on the canvas** (the agreed primary output):

| Badge | Meaning |
|---|---|
| ✓ | Group exists, type correct, all its intended memberships present |
| ▲ | Exists, but type differs or a membership is missing |
| ✗ | Does not exist in Google |
| — | Not checked (no email, or check not yet run) |

Edges get their own state, since a membership can be missing while both groups exist.

**Unmapped groups get a separate view** (agreed: "yes, but separately") — groups on the
school's domain with no node on the map. Surfaces legacy and undocumented groups without
drowning the main signal. It is free: the same `groups.list` response already has it.

---

## 5. Prerequisite you own

A Google Cloud OAuth client — confirmed you can set this up:

1. GCP project, **Admin SDK API** and **Cloud Identity API** enabled.
2. OAuth consent screen set to **Internal**.
3. OAuth 2.0 Client ID, type **Web application**.
4. Authorised JavaScript origin: the GitHub Pages origin this deploys to
   (`.github/workflows/deploy.yml` → `https://<org>.github.io`), plus
   `http://localhost:5173` for development.
5. The client ID is public and goes in the app config — that is normal and safe for a
   browser PKCE/token client. There is no client secret, and the app can never read more
   than the signed-in admin's own permissions allow.

---

## 6. Build order

| # | Step | Notes |
|---|---|---|
| **1** | **Unify the model** — merge sections into groups, one `containedBy` field, drop `parentId`, stable uuids, migration for existing maps | Everything downstream depends on there being one unambiguous set of assertions. CHS map is the fixture. |
| **2** | **Canvas stabilisation** — native `parentId`/`extent` nesting, single source of truth for edges, fix refs-during-render | Step 1 makes this much easier: containment is already structural. See §7. |
| **3** | **Derive the assertion set** — pure function: map → `{groups[], memberships[]}` | Testable with no Google involved. Replaces the TSV fallback chain. |
| **4** | **Google read + check** — OAuth, the three API calls, diff against step 3 | The actual feature. |
| **5** | **Badges + unmapped view** | The output. |
| **6** | **Phase grouping** | Once checks are trustworthy, model the target phase structure and let the diff drive the migration. |

Old `ROADMAP-V2.md` phases 2–4 (new-project screen, tab rename/delete, onboarding hints)
are unrelated to this and can be picked up whenever. Phases 5–9 are superseded.

---

## 7. React Flow audit (carried over — still accurate)

`RoleMapCanvas.tsx` is 2011 lines. `npx eslint .` reports **15 errors, 6 warnings** after
the three fixes already pushed; `tsc -b`, `npm run build` and `npm test` pass.

### Fixed already
1. **Cycle detection was inverted, so it never fired.** Both call sites passed
   `(source, target)` to a function taking `(child, parent)`. Given `A→B→C`, connecting
   `C→A` was allowed. Extracted to `utils/graph.ts` and covered by tests.
2. **Dropping a reconnected edge on empty canvas corrupted unrelated data.**
   `onReconnectEnd` cleared the target's `parentId` even for standalone `conn-` edges,
   wiping a real relationship while leaving the connection in the model, so the edge
   returned on the next sync. Now routes through `handleEdgesDelete`.
3. **Undo/redo buttons kept a stale disabled state** — `canUndo`/`canRedo` read a ref, so
   history changes never re-rendered.

### Outstanding
4. **Two sources of truth for edges.** The sync effect keys off a `JSON.stringify` mapKey
   that omits edge labels, styles and handles — so data-model edge changes can't re-sync,
   which is why `handleUpdateEdgeStyle`, `handleReverseEdge` and `onConnect` each
   hand-patch React Flow state separately. Those copies drift. **This is the single
   biggest source of the "many bugs".**
5. **Section→child dragging is hand-rolled** — ~120 lines tracking per-child offsets,
   including a `setNodes` call used purely as a getter. React Flow does this natively with
   `parentId` + `extent: 'parent'`; the code already uses it for departments but not role
   nodes. Step 1 of §6 makes adopting it straightforward. Note it changes child positions
   to parent-relative, so the migration must convert saved coordinates.
6. **Refs written during render** — 6 lint errors. Fine today, breaks under concurrent rendering.
7. **`setState` inside effects** — 7 lint errors across `Combobox`, `CommandPalette`, `EditModal`, `SectionModal`, `Tooltip`.
8. **Dagre runs on every render** — `getInitialNodes()` is the argument to `useNodesState`, so it is evaluated every time though only the first result is used.
9. **Inline callbacks inside node `data`** defeat node memoisation.
10. **`isUndoingRef` cleared by `setTimeout(..., 100)`** — a race.
11. **No schema validation on import** — `JSON.parse` straight into state.
12. **IDs derived from names and never updated** — the CHS map has `hr-b807d4f4` named "CHS Office Team", `id: 'primary-role-map'` on a map called "Secondary Role Map", and a dozen `section-dup-*` ids. Harmless today, but these become the join key. Step 1 moves to uuids.

### Test coverage
`vitest` is now set up (`npm test`), with 21 tests over `utils/graph.ts` and
`utils/sectionType.ts`. The assertion-derivation logic from §6 step 3 is the next thing
that needs covering — with an anonymised CHS map as the fixture, per §8.

---

## 8. This repository is public

`helliott-initio/role-access-visualisation` is a **public** GitHub repository. That has
not mattered so far, because the committed maps are placeholders on `schooldomain.org`.
It starts to matter now:

- The CHS map is a complete internal map of a real school — every team, every role, every
  group address, on a real domain. It should **not** be committed as-is. For the test
  fixture I will use a structurally identical map with substituted names and an
  `example.org` domain, which exercises the same logic.
- Real maps live in browser localStorage and exported JSON files, not in the repo, so
  nothing is currently exposed. Worth keeping it that way deliberately rather than by
  accident — a `.gitignore` entry for exported maps would make that explicit.
- The OAuth client ID is fine to commit (it is public by design). Nothing else about the
  Google setup should be.
- Worth a moment's thought as to whether the repository should be public at all. Nothing
  here needs to be, and a private repo still deploys to GitHub Pages on a paid plan —
  though on a free plan, Pages for a private repo is not available, so this is a real
  trade-off rather than an obvious fix.
