import { describe, it, expect } from 'vitest';
import { resolveSectionType, resolveGroupType, typeLabel, typeAbbrev } from './sectionType';
import type { Section, RoleGroup } from '../types';

const section = (id: string, over: Partial<Section> = {}): Section => ({
  id,
  name: id,
  color: '#000',
  bgColor: '#fff',
  collapsed: false,
  ...over,
});

const group = (id: string, sectionId: string): RoleGroup => ({
  id,
  email: `${id}@example.org`,
  label: id,
  parentId: null,
  sectionId,
});

describe('resolveSectionType', () => {
  it('returns an explicitly set type', () => {
    const s = section('teaching', { type: 'primary' });
    expect(resolveSectionType(s, [s])).toBe('primary');
  });

  it('walks up from a department to its parent section', () => {
    const parent = section('support-staff', { type: 'support' });
    const dept = section('finance', { type: 'department', parentSectionId: 'support-staff' });
    expect(resolveSectionType(dept, [parent, dept])).toBe('support');
  });

  it('walks up through nested departments', () => {
    const top = section('top', { type: 'secondary' });
    const mid = section('mid', { type: 'department', parentSectionId: 'top' });
    const leaf = section('leaf', { type: 'department', parentSectionId: 'mid' });
    expect(resolveSectionType(leaf, [top, mid, leaf])).toBe('secondary');
  });

  it('falls back to secondary for the legacy built-in section id', () => {
    const s = section('secondary-roles');
    expect(resolveSectionType(s, [s])).toBe('secondary');
  });

  it('returns undefined for an untyped section', () => {
    const s = section('misc');
    expect(resolveSectionType(s, [s])).toBeUndefined();
  });

  it('returns undefined for a department whose parent is missing', () => {
    const orphan = section('orphan', { type: 'department', parentSectionId: 'gone' });
    expect(resolveSectionType(orphan, [orphan])).toBeUndefined();
  });

  it('returns undefined for a missing section', () => {
    expect(resolveSectionType(undefined, [])).toBeUndefined();
  });
});

describe('resolveGroupType', () => {
  it('inherits from the group section', () => {
    const s = section('teaching', { type: 'primary' });
    expect(resolveGroupType(group('t1', 'teaching'), 'root', [s])).toBe('primary');
  });

  it('defaults the root group to primary when it has no typed section', () => {
    expect(resolveGroupType(group('allstaff', 'root'), 'allstaff', [])).toBe('primary');
  });

  it('returns undefined for a non-root group in an untyped section', () => {
    const s = section('misc');
    expect(resolveGroupType(group('g1', 'misc'), 'allstaff', [s])).toBeUndefined();
  });
});

describe('labels', () => {
  it('maps types to display strings', () => {
    expect(typeLabel('primary')).toBe('Primary');
    expect(typeLabel('support')).toBe('Support');
    expect(typeLabel(undefined)).toBe('');
    expect(typeAbbrev('secondary')).toBe('Sec');
    expect(typeAbbrev(undefined)).toBe('');
  });
});
