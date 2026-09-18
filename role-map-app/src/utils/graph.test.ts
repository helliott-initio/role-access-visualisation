import { describe, it, expect } from 'vitest';
import { wouldCreateCycle, ancestorsOf } from './graph';
import type { RoleGroup } from '../types';

/** Build a chain A -> B -> C, i.e. C.parentId = B, B.parentId = A. */
function chain(): RoleGroup[] {
  const g = (id: string, parentId: string | null): RoleGroup => ({
    id,
    email: `${id}@example.org`,
    label: id.toUpperCase(),
    parentId,
    sectionId: 'staff',
  });
  return [g('a', null), g('b', 'a'), g('c', 'b')];
}

describe('wouldCreateCycle', () => {
  it('rejects a node becoming its own parent', () => {
    expect(wouldCreateCycle(chain(), 'b', 'b')).toBe(true);
  });

  it('detects the back-edge that closes a chain', () => {
    // A -> B -> C already exists. Drawing C -> A makes A the child of C,
    // and A is an ancestor of C, so this closes the loop.
    expect(wouldCreateCycle(chain(), 'a', 'c')).toBe(true);
  });

  it('detects a one-step back-edge', () => {
    expect(wouldCreateCycle(chain(), 'a', 'b')).toBe(true);
  });

  it('allows an edge that only deepens the tree', () => {
    const groups = [
      ...chain(),
      { id: 'd', email: 'd@example.org', label: 'D', parentId: null, sectionId: 'staff' },
    ];
    // D becomes a child of C — no loop.
    expect(wouldCreateCycle(groups, 'd', 'c')).toBe(false);
  });

  it('allows re-parenting across unrelated branches', () => {
    const groups: RoleGroup[] = [
      { id: 'root', email: 'r@example.org', label: 'R', parentId: null, sectionId: 's' },
      { id: 'x', email: 'x@example.org', label: 'X', parentId: 'root', sectionId: 's' },
      { id: 'y', email: 'y@example.org', label: 'Y', parentId: 'root', sectionId: 's' },
    ];
    expect(wouldCreateCycle(groups, 'y', 'x')).toBe(false);
  });

  it('terminates on data that already contains a cycle', () => {
    const groups: RoleGroup[] = [
      { id: 'p', email: 'p@example.org', label: 'P', parentId: 'q', sectionId: 's' },
      { id: 'q', email: 'q@example.org', label: 'Q', parentId: 'p', sectionId: 's' },
    ];
    expect(wouldCreateCycle(groups, 'new', 'p')).toBe(true);
  });

  it('is safe when the proposed parent is not in the data', () => {
    expect(wouldCreateCycle(chain(), 'c', 'missing')).toBe(false);
  });
});

describe('ancestorsOf', () => {
  it('returns the chain nearest-first', () => {
    expect(ancestorsOf(chain(), 'c').map((g) => g.id)).toEqual(['b', 'a']);
  });

  it('returns nothing for a root', () => {
    expect(ancestorsOf(chain(), 'a')).toEqual([]);
  });

  it('terminates on a pre-existing cycle', () => {
    const groups: RoleGroup[] = [
      { id: 'p', email: 'p@example.org', label: 'P', parentId: 'q', sectionId: 's' },
      { id: 'q', email: 'q@example.org', label: 'Q', parentId: 'p', sectionId: 's' },
    ];
    expect(ancestorsOf(groups, 'p').map((g) => g.id)).toEqual(['q']);
  });
});
