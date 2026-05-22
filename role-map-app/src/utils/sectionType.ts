import type { RoleGroup, Section } from '../types';

export type EffectiveType = 'primary' | 'secondary' | 'support' | undefined;

/** Resolve a section's effective type, walking up the parent chain for departments
 *  and applying the legacy fallback for the built-in "secondary-roles" section. */
export function resolveSectionType(
  section: Section | undefined,
  allSections: Section[]
): EffectiveType {
  if (!section) return undefined;
  const raw = section.type ?? (section.id === 'secondary-roles' ? 'secondary' : undefined);
  if (raw === 'department' && section.parentSectionId) {
    return resolveSectionType(allSections.find(s => s.id === section.parentSectionId), allSections);
  }
  if (raw === 'primary' || raw === 'secondary' || raw === 'support') return raw;
  return undefined;
}

/** Resolve a group's effective type. Non-root groups inherit from their section.
 *  The root group has no section, so it defaults to 'primary'. */
export function resolveGroupType(
  group: RoleGroup,
  rootGroupId: string,
  allSections: Section[]
): EffectiveType {
  const fromSection = resolveSectionType(
    allSections.find(s => s.id === group.sectionId),
    allSections
  );
  if (fromSection) return fromSection;
  if (group.id === rootGroupId) return 'primary';
  return undefined;
}

export function typeLabel(type: EffectiveType): string {
  if (type === 'primary') return 'Primary';
  if (type === 'secondary') return 'Secondary';
  if (type === 'support') return 'Support';
  return '';
}

export function typeAbbrev(type: EffectiveType): string {
  if (type === 'primary') return 'Pri';
  if (type === 'secondary') return 'Sec';
  if (type === 'support') return 'Sup';
  return '';
}
