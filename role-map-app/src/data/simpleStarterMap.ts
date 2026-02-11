import type { RoleMap } from '../types';

// Simple starter map - a minimal structure you can build out
export const simpleStarterMap: RoleMap = {
  id: 'starter-map',
  name: 'Role Map',
  domain: 'yourdomain.org',
  rootGroupId: 'allstaff',
  sections: [
    {
      id: 'section-1',
      name: 'Section 1',
      color: '#2d3e50',
      bgColor: '#e8edf2',
      collapsed: false,
    },
    {
      id: 'secondary-roles',
      name: 'Secondary Roles',
      color: '#9eb8c7',
      bgColor: '#f0f5f8',
      collapsed: false,
      type: 'secondary',
    },
  ],
  groups: [
    // Root node
    {
      id: 'allstaff',
      email: 'allstaff@yourdomain.org',
      label: 'All Staff',
      parentId: null,
      sectionId: 'root',
    },
    // One example group
    {
      id: 'example-group',
      email: 'example@yourdomain.org',
      label: 'Example Group',
      parentId: 'allstaff',
      sectionId: 'section-1',
    },
  ],
};
