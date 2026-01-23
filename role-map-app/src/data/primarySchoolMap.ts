import type { RoleMap } from '../types';

export const primarySchoolMap: RoleMap = {
  id: 'primary-school',
  name: 'Primary School',
  domain: 'schooldomain.org',
  rootGroupId: 'allstaff',
  sections: [
    {
      id: 'teaching-staff',
      name: 'Teaching Staff',
      color: '#2d3e50',
      bgColor: '#e8edf2',
      collapsed: false,
    },
    {
      id: 'lsc',
      name: 'Local School Committee',
      color: '#f5c344',
      bgColor: '#fef9e7',
      collapsed: false,
    },
    {
      id: 'supply',
      name: 'Long & Short Term Supply Users',
      color: '#7ecec0',
      bgColor: '#e6f7f5',
      collapsed: false,
    },
    {
      id: 'teaching-assistants',
      name: 'Teaching Assistants',
      color: '#2e7d32',
      bgColor: '#e8f5e9',
      collapsed: false,
    },
    {
      id: 'support-staff',
      name: 'Support Staff',
      color: '#f08a7a',
      bgColor: '#fef0ee',
      collapsed: false,
    },
    {
      id: 'secondary-roles',
      name: 'Secondary Roles',
      color: '#9eb8c7',
      bgColor: '#f0f5f8',
      collapsed: false,
    },
  ],
  groups: [
    // Root
    {
      id: 'allstaff',
      email: 'allstaff@schooldomain.org',
      label: 'All Staff',
      parentId: null,
      sectionId: 'root',
    },
    // Teaching Staff
    {
      id: 'teachers',
      email: 'teachers@schooldomain.org',
      label: 'Teachers',
      parentId: 'allstaff',
      sectionId: 'teaching-staff',
    },
    {
      id: 'slt',
      email: 'slt@schooldomain.org',
      label: 'Senior Leadership Team',
      parentId: 'teachers',
      sectionId: 'teaching-staff',
    },
    {
      id: 'headteacher',
      email: 'headteacher@schooldomain.org',
      label: 'Headteacher',
      parentId: 'slt',
      sectionId: 'teaching-staff',
    },
    // Local School Committee
    {
      id: 'lsc-group',
      email: 'LSC@schooldomain.org',
      label: 'LSC',
      parentId: 'allstaff',
      sectionId: 'lsc',
    },
    // Supply Users
    {
      id: 'supply-group',
      email: 'supply@schooldomain.org',
      label: 'Supply',
      parentId: 'allstaff',
      sectionId: 'supply',
    },
    // Teaching Assistants
    {
      id: 'tas',
      email: 'TAs@schooldomain.org',
      label: 'Teaching Assistants',
      parentId: 'allstaff',
      sectionId: 'teaching-assistants',
    },
    {
      id: 'senior-tas',
      email: 'SeniorTAs@schooldomain.org',
      label: 'Senior TAs',
      parentId: 'tas',
      sectionId: 'teaching-assistants',
    },
    // Support Staff
    {
      id: 'support-staff-group',
      email: 'SupportStaff@schooldomain.org',
      label: 'Support Staff',
      parentId: 'allstaff',
      sectionId: 'support-staff',
    },
    {
      id: 'lunchtime-staff',
      email: 'lunchtimestaff@schooldomain.org',
      label: 'Lunchtime Staff',
      parentId: 'support-staff-group',
      sectionId: 'support-staff',
    },
    {
      id: 'premises',
      email: 'premises@schooldomain.org',
      label: 'Premises',
      parentId: 'support-staff-group',
      sectionId: 'support-staff',
    },
    {
      id: 'office-team',
      email: 'officeteam@schooldomain.org',
      label: 'Office Team',
      parentId: 'support-staff-group',
      sectionId: 'support-staff',
    },
    {
      id: 'office-manager',
      email: 'officemanager@schooldomain.org',
      label: 'Office Manager',
      parentId: 'office-team',
      sectionId: 'support-staff',
    },
    // Secondary Roles
    {
      id: 'sendteam',
      email: 'sendteam@schooldomain.org',
      label: 'SEND Team',
      parentId: null,
      sectionId: 'secondary-roles',
      isSecondary: true,
      supplementsRoles: ['teachers', 'tas', 'slt'],
    },
    {
      id: 'safeguarding',
      email: 'safeguarding@schooldomain.org',
      label: 'Safeguarding',
      parentId: null,
      sectionId: 'secondary-roles',
      isSecondary: true,
      supplementsRoles: ['teachers', 'slt', 'headteacher', 'office-team'],
    },
  ],
};
