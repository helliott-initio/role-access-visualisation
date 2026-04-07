import type { RoleMap } from '../types';

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

  // Helper: find the "Member Of" email for a section by looking up the chain.
  // Departments → parent section's email, or the root group in the parent section.
  // Top-level sections → the map's root group (e.g. allstaff@).
  const rootGroup = map.groups.find(g => g.id === map.rootGroupId);
  const findSectionMemberOf = (section: typeof map.sections[0]): string => {
    if (section.parentSectionId) {
      const parentSection = map.sections.find(s => s.id === section.parentSectionId);
      if (parentSection?.email) return parentSection.email;
      const sectionRootGroup = map.groups.find(g => g.sectionId === section.parentSectionId && !g.parentId);
      if (sectionRootGroup?.email) return sectionRootGroup.email;
    }
    // Top-level section → member of the map's root group
    if (rootGroup?.email) return rootGroup.email;
    return '';
  };

  // Helper: find the "Member Of" email for a group.
  // In this app, arrows point upward from child to parent. The data model stores
  // this as target.parentId = source (the node the arrow comes from). So parentId
  // points to the node BELOW, and the node ABOVE is the one whose parentId = our id.
  // "Member Of" = the group this arrow points TO = find(g => g.parentId === myId).
  const findGroupMemberOf = (group: typeof map.groups[0]): string => {
    // Find the group above us (the one this group's arrow points to)
    const groupAbove = map.groups.find(g => g.parentId === group.id);
    if (groupAbove?.email) return groupAbove.email;

    // Fall back to the section's email
    const section = map.sections.find(s => s.id === group.sectionId);
    if (section?.email) return section.email;
    if (section?.parentSectionId) {
      const parentSection = map.sections.find(s => s.id === section.parentSectionId);
      if (parentSection?.email) return parentSection.email;
    }
    return '';
  };

  // Export sections and departments as rows (they represent Google Groups too)
  for (const section of map.sections) {
    if (!section.email) continue; // Skip sections without an email — they're just visual containers
    const prefix = section.email.includes('@') ? section.email.split('@')[0] : section.email;
    const role = section.mailType === 'security' ? 'security' : section.mailType === 'mailing' ? 'mailing' : 'none';
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
    const role = group.mailType === 'security' ? 'security'
      : group.mailType === 'mailing' ? 'mailing' : 'none';
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
