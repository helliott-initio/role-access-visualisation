import type { RoleMap } from '../types';
import { resolveGroupType, resolveSectionType, typeLabel } from './sectionType';

const HEADERS = [
  'Role Name',
  'Role Prefix',
  'Domain',
  'Role',
  'Role Email',
  'Role Alias',
  'Member Of',
  'Role Map',
  'Group Template',
];

/** Escape tabs and newlines in a field value */
function escapeField(value: string): string {
  return value.replace(/[\t\n\r]/g, ' ');
}

/** Export a RoleMap as TSV matching the Google Workspace Migrate spreadsheet format.
 *  Exports sections/departments first (they represent top-level groups),
 *  then role groups underneath. */
export function exportMapToTsv(map: RoleMap): string {
  const rows: string[] = [HEADERS.join('\t')];

  // Helper: find the "Member Of" email for a section.
  // Priority: (1) explicit outgoing MapConnection overrides everything;
  // (2) department sections (parentSectionId set) auto-inherit from their parent
  //     since visual nesting implies membership;
  // (3) top-level sections with no connection → blank.
  const findSectionMemberOf = (section: typeof map.sections[0]): string => {
    const sectionNodeId = `section-${section.id}`;
    // Connections where the section is the source mean "this section is a member
    // of the target". Connections where it is the target are manager→header links.
    const conn = (map.connections || []).find(c => c.source === sectionNodeId);
    if (conn) {
      const otherId = conn.target;
      if (otherId.startsWith('section-')) {
        const otherSection = map.sections.find(s => s.id === otherId.replace('section-', ''));
        if (otherSection?.email) return otherSection.email;
        const otherRootGroup = map.groups.find(g => g.sectionId === otherSection?.id && !g.parentId);
        if (otherRootGroup?.email) return otherRootGroup.email;
      } else {
        const otherGroup = map.groups.find(g => g.id === otherId);
        if (otherGroup?.email) return otherGroup.email;
      }
    }
    // Department sections auto-inherit from their parent section even without an
    // explicit edge — visual nesting inside a parent is sufficient.
    if (section.parentSectionId) {
      const parentSection = map.sections.find(s => s.id === section.parentSectionId);
      if (parentSection?.email) return parentSection.email;
      const parentRootGroup = map.groups.find(g => g.sectionId === section.parentSectionId && !g.parentId);
      if (parentRootGroup?.email) return parentRootGroup.email;
    }
    return '';
  };

  // Helper: find the "Member Of" email for a group.
  // group.parentId stores the parent group's id, so look it up directly.
  const findGroupMemberOf = (group: typeof map.groups[0]): string => {
    const parentGroup = map.groups.find(g => g.id === group.parentId);
    if (parentGroup?.email) return parentGroup.email;

    // Fall back to the section's email
    const section = map.sections.find(s => s.id === group.sectionId);
    if (section?.email) return section.email;
    if (section?.parentSectionId) {
      const parentSection = map.sections.find(s => s.id === section.parentSectionId);
      if (parentSection?.email) return parentSection.email;
    }
    return '';
  };

  const roleFor = (type: ReturnType<typeof resolveSectionType>) => typeLabel(type) || 'None';

  // Export sections and departments as rows (they represent Google Groups too)
  for (const section of map.sections) {
    if (!section.email) continue; // Skip sections without an email — they're just visual containers
    const prefix = section.email.includes('@') ? section.email.split('@')[0] : section.email;
    const role = roleFor(resolveSectionType(section, map.sections));
    const memberOf = findSectionMemberOf(section);

    rows.push([
      escapeField(section.name),
      escapeField(prefix),
      escapeField(map.domain),
      escapeField(role),
      escapeField(section.email),
      escapeField(''),
      escapeField(memberOf),
      escapeField(map.name),
      escapeField(''),
    ].join('\t'));
  }

  // Export role groups
  for (const group of map.groups) {
    const prefix = group.email.includes('@') ? group.email.split('@')[0] : group.email;
    const role = roleFor(resolveGroupType(group, map.rootGroupId, map.sections));
    const memberOf = findGroupMemberOf(group);

    rows.push([
      escapeField(group.label),
      escapeField(prefix),
      escapeField(map.domain),
      escapeField(role),
      escapeField(group.email),
      escapeField(group.alias || ''),
      escapeField(memberOf),
      escapeField(map.name),
      escapeField(group.groupTemplate || ''),
    ].join('\t'));
  }

  return rows.join('\n');
}

/** Download a TSV string as a file */
export function downloadTsv(fileName: string, content: string): void {
  const blob = new Blob([content], { type: 'text/tab-separated-values;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName.endsWith('.tsv') ? fileName : `${fileName}.tsv`;
  link.click();
  URL.revokeObjectURL(url);
}
