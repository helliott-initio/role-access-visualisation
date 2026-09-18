import type { RoleGroup } from '../types';

/**
 * Parent/child direction, stated once so it stops being re-derived at each call site.
 *
 * An edge is rendered `source -> target`, and `reparentGroup(childId, newParentId)`
 * sets `child.parentId = parent`. So for any edge the TARGET is the child and the
 * SOURCE is its parent, and walking `group.parentId` walks *upstream* along edges.
 */

/** Index groups by id so ancestor walks don't re-scan the array at every step. */
function byId(groups: RoleGroup[]): Map<string, RoleGroup> {
  return new Map(groups.map((g) => [g.id, g]));
}

/**
 * Would making `parentId` the parent of `childId` close a loop?
 *
 * Walks up the existing parent chain from `parentId`. If that walk reaches
 * `childId`, then `childId` is already an ancestor of `parentId` and the new
 * edge would complete a cycle.
 *
 * Note the argument order: (child, parent), NOT (edge source, edge target).
 */
export function wouldCreateCycle(
  groups: RoleGroup[],
  childId: string,
  parentId: string
): boolean {
  if (childId === parentId) return true;

  const index = byId(groups);
  const visited = new Set<string>();
  let current: string | null | undefined = parentId;

  while (current) {
    // A pre-existing cycle in the data would otherwise spin forever.
    if (visited.has(current)) return true;
    visited.add(current);

    const group = index.get(current);
    if (!group?.parentId) break;
    if (group.parentId === childId) return true;
    current = group.parentId;
  }

  return false;
}

/** Every ancestor of `groupId`, nearest first. Stops safely on a pre-existing cycle. */
export function ancestorsOf(groups: RoleGroup[], groupId: string): RoleGroup[] {
  const index = byId(groups);
  const seen = new Set<string>([groupId]);
  const chain: RoleGroup[] = [];

  let current = index.get(groupId)?.parentId;
  while (current && !seen.has(current)) {
    seen.add(current);
    const group = index.get(current);
    if (!group) break;
    chain.push(group);
    current = group.parentId;
  }

  return chain;
}
