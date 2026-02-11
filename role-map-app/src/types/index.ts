export interface RoleGroup {
  id: string;
  email: string;
  label: string;
  parentId: string | null;
  sectionId: string;
  isSecondary?: boolean;
  supplementsRoles?: string[]; // IDs of primary roles this secondary role supplements
  position?: { x: number; y: number }; // Manual position override
  edgeLabel?: string; // Optional label shown on the edge to parent
  description?: string; // Freeform description shown in tooltip
  edgeStyle?: {
    dashed?: boolean;
    animated?: boolean;
    arrowAtStart?: boolean; // If true, arrow at source end; if false/undefined, at target end
    noArrow?: boolean; // If true, no arrow at all
  };
  // Handle IDs for edge connection points
  sourceHandle?: string; // Handle ID on the parent node (e.g., 'top', 'bottom', 'left', 'right')
  targetHandle?: string; // Handle ID on this node
}

export interface Section {
  id: string;
  name: string;
  color: string;
  bgColor: string;
  collapsed: boolean;
  type?: 'primary' | 'secondary' | 'support' | 'department'; // Section category
  parentSectionId?: string | null; // If set, this section is a department inside another section
  email?: string; // Email address for the section (mainly for departments)
  description?: string; // Freeform description shown in tooltip
  position?: { x: number; y: number }; // Section container position
  size?: { width: number; height: number }; // Section container size
}

export interface MapConnection {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  label?: string;
  style?: {
    dashed?: boolean;
    animated?: boolean;
    arrowAtStart?: boolean;
    noArrow?: boolean;
  };
}

export interface RoleMap {
  id: string;
  name: string;
  domain: string;
  sections: Section[];
  groups: RoleGroup[];
  connections?: MapConnection[]; // Standalone edges not tied to parentId
  textAnnotations?: TextAnnotation[];
  rootGroupId: string;
}

export interface TextAnnotation {
  id: string;
  text: string;
  position: { x: number; y: number };
  fontSize?: number;
  color?: string;
}

export interface AppState {
  maps: RoleMap[];
  activeMapId: string;
  showSecondaryRoles: boolean;
  selectedNodeId: string | null;
  isFirstLaunch?: boolean;
}
