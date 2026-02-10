import { useCallback, useMemo, useRef, useEffect, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
  Panel,
  reconnectEdge,
  addEdge,
  ConnectionMode,
  useStore,
} from '@xyflow/react';
import type { Node, Edge, NodeChange, Connection, OnReconnect } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

import RoleNode from './RoleNode';
import RootNode from './RootNode';
import SectionContainer from './SectionContainer';
import CustomEdge from './CustomEdge';
import { ContextMenu } from './ContextMenu';
import { getLayoutedElements } from '../utils/layout';
import type { RoleMap, RoleGroup, Section, MapConnection } from '../types';
import { findAlignments, type GuideLine } from '../utils/snapAlignment';

const nodeTypes = {
  roleNode: RoleNode,
  rootNode: RootNode,
  sectionContainer: SectionContainer,
};

const edgeTypes = {
  custom: CustomEdge,
};

// Renders alignment guide lines over the canvas
function AlignmentGuides({ guideLines }: { guideLines: GuideLine[] }) {
  // Reactive viewport from the store — re-renders when zoom/pan changes
  const transform = useStore((s) => s.transform);
  const [vx, vy, zoom] = transform;

  // Convert flow coordinate to screen pixel relative to the container
  const flowToScreenX = (x: number) => x * zoom + vx;
  const flowToScreenY = (y: number) => y * zoom + vy;

  return (
    <svg
      className="alignment-guides"
      width="100%"
      height="100%"
      style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none', zIndex: 1001 }}
    >
      {guideLines.map((line, i) =>
        line.orientation === 'vertical' ? (
          <line
            key={`v-${i}`}
            x1={flowToScreenX(line.position)}
            y1={0}
            x2={flowToScreenX(line.position)}
            y2={9999}
            className="alignment-guide-line"
          />
        ) : (
          <line
            key={`h-${i}`}
            x1={0}
            y1={flowToScreenY(line.position)}
            x2={9999}
            y2={flowToScreenY(line.position)}
            className="alignment-guide-line"
          />
        )
      )}
    </svg>
  );
}

interface ContextMenuState {
  show: boolean;
  x: number;
  y: number;
  nodeId: string | null;
  nodeType: 'role' | 'section' | 'pane' | 'edge';
  edgeData?: { label?: string; dashed?: boolean; animated?: boolean; hasArrow?: boolean; arrowAtStart?: boolean };
}

interface RoleMapCanvasProps {
  map: RoleMap;
  showSecondaryRoles: boolean;
  onNodeSelect: (nodeId: string | null) => void;
  onNodePositionChange: (nodeId: string, position: { x: number; y: number }) => void;
  onSectionPositionChange: (sectionId: string, position: { x: number; y: number }, size?: { width: number; height: number }) => void;
  onEdgeStyleChange: (groupId: string, edgeLabel?: string, edgeStyle?: { dashed?: boolean; animated?: boolean; arrowAtStart?: boolean; noArrow?: boolean }) => void;
  onToggleSectionCollapse: (sectionId: string) => void;
  onReparent: (childId: string, newParentId: string | null, sourceHandle?: string, targetHandle?: string) => void;
  onAddConnection: (connection: MapConnection) => void;
  onRemoveConnection: (connectionId: string) => void;
  onUpdateConnectionStyle: (connectionId: string, label?: string, style?: MapConnection['style']) => void;
  onUpdateGroup: (group: RoleGroup) => void;
  onEditNode: (nodeId: string) => void;
  onDeleteNode: (nodeId: string) => void;
  onAddGroup: (parentId?: string, sectionId?: string) => void;
  onAddSection: () => void;
  onEditSection: (sectionId: string) => void;
  onDeleteSection: (sectionId: string) => void;
  onAddDepartment: (parentSectionId: string) => void;
}

export function RoleMapCanvas({
  map,
  showSecondaryRoles,
  onNodeSelect,
  onNodePositionChange,
  onSectionPositionChange,
  onEdgeStyleChange,
  onToggleSectionCollapse,
  onReparent,
  onAddConnection,
  onRemoveConnection,
  onUpdateConnectionStyle,
  onUpdateGroup,
  onEditNode,
  onDeleteNode,
  onAddGroup,
  onAddSection,
  onEditSection,
  onDeleteSection,
  onAddDepartment,
}: RoleMapCanvasProps) {
  const flowRef = useRef<HTMLDivElement>(null);
  const edgeReconnectSuccessful = useRef(true);
  const initialLayoutApplied = useRef(false);
  // Cache positions to survive collapse/expand cycles
  const positionCacheRef = useRef<Map<string, { x: number; y: number }>>(new Map());
  // Track section positions for group-follows-section behavior
  const sectionPositionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());

  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    show: false,
    x: 0,
    y: 0,
    nodeId: null,
    nodeType: 'pane',
  });

  // Track when a connection is being dragged for visual feedback
  const [isConnecting, setIsConnecting] = useState(false);

  // Alignment guide lines shown during node drag and section resize
  const [guideLines, setGuideLines] = useState<GuideLine[]>([]);
  // Stable refs for passing to SectionContainer without causing re-renders
  const setGuideLinesRef = useRef(setGuideLines);
  setGuideLinesRef.current = setGuideLines;
  // setNodes ref is populated after useNodesState (below), assigned in an effect-free pattern
  const setNodesRef = useRef<typeof setNodes>(null as unknown as typeof setNodes);

  // Track the last snapped position so we persist it (not the raw mouse position) on drag end
  const snappedPositionRef = useRef<Map<string, { x: number; y: number }>>(new Map());

  const getSectionForGroup = useCallback(
    (sectionId: string): Section | undefined => {
      return map.sections.find((s) => s.id === sectionId);
    },
    [map.sections]
  );

  // Build nodes and edges from map data - NO selectedNodeId dependency
  const { builtNodes, builtEdges } = useMemo(() => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    // Create section container nodes
    map.sections.forEach((section, index) => {
      if (section.id !== 'secondary-roles' || showSecondaryRoles) {
        // If parent section is collapsed, hide this department
        if (section.parentSectionId) {
          const parentSection = map.sections.find(s => s.id === section.parentSectionId);
          if (parentSection?.collapsed) return;
        }

        const isDepartment = !!section.parentSectionId;
        const defaultPosition = isDepartment
          ? { x: 20, y: 50 }
          : { x: index * 280, y: 120 };
        const defaultSize = isDepartment
          ? { width: 200, height: 300 }
          : { width: 250, height: 400 };

        const nodeConfig: Node = {
          id: `section-${section.id}`,
          type: 'sectionContainer',
          position: section.position || defaultPosition,
          data: {
            label: section.name,
            color: section.color,
            bgColor: section.bgColor,
            email: section.email,
            collapsed: section.collapsed,
            type: section.type || 'primary',
            onResizeGuideLines: (lines: GuideLine[]) => setGuideLinesRef.current(lines),
            onResizeSnap: (snap: { nodeId: string; position: { x: number; y: number }; width: number; height: number }) => {
              setNodesRef.current(nds =>
                nds.map(n =>
                  n.id === snap.nodeId
                    ? { ...n, position: snap.position, style: { ...n.style, width: snap.width, height: snap.height } }
                    : n
                )
              );
              // Persist snapped size to data model
              const sectionId = snap.nodeId.replace('section-', '');
              onSectionPositionChange(sectionId, snap.position, { width: snap.width, height: snap.height });
            },
          },
          style: {
            width: section.size?.width || defaultSize.width,
            height: section.size?.height || defaultSize.height,
          },
          zIndex: isDepartment ? 0 : -1,
          selectable: true,
          draggable: true,
        };

        // Nest department inside parent section
        if (isDepartment) {
          nodeConfig.parentId = `section-${section.parentSectionId}`;
          nodeConfig.extent = 'parent';
        }

        nodes.push(nodeConfig);
      }
    });

    // Filter groups based on showSecondaryRoles
    const visibleGroups = map.groups.filter((group) => {
      if (group.isSecondary && !showSecondaryRoles) return false;
      const section = getSectionForGroup(group.sectionId);
      if (section?.collapsed && group.sectionId !== 'root') return false;
      return true;
    });

    // Create nodes
    visibleGroups.forEach((group) => {
      const section = getSectionForGroup(group.sectionId);
      const isRoot = group.id === map.rootGroupId;

      nodes.push({
        id: group.id,
        type: isRoot ? 'rootNode' : 'roleNode',
        position: group.position || { x: 0, y: 0 },
        data: {
          label: group.label,
          email: group.email,
          sectionId: group.sectionId,
          color: isRoot ? '#2d3e50' : (section?.color || '#666'),
          bgColor: isRoot ? '#2d3e50' : (section?.bgColor || '#f5f5f5'),
          isSecondary: group.isSecondary,
          isRoot,
        },
      });

      // Create edge to parent with explicit handle IDs
      // Handle IDs persist through collapse/expand since they're stored in map.groups (data model)
      // and builtEdges is recalculated from the data model on each sync
      if (group.parentId) {
        const edgeLabel = group.edgeLabel || '';
        const edgeStyle = group.edgeStyle || {};
        const color = section?.color || '#666';

        edges.push({
          id: `${group.parentId}-${group.id}`,
          source: group.parentId,
          target: group.id,
          ...(group.sourceHandle ? { sourceHandle: group.sourceHandle } : {}),
          ...(group.targetHandle ? { targetHandle: group.targetHandle } : {}),
          type: 'custom',
          animated: edgeStyle.animated || false,
          reconnectable: true,
          data: {
            label: edgeLabel,
            color,
            dashed: edgeStyle.dashed || false,
          },
          markerStart: edgeStyle.arrowAtStart && !edgeStyle.noArrow
            ? { type: MarkerType.ArrowClosed, color }
            : undefined,
          markerEnd: !edgeStyle.arrowAtStart && !edgeStyle.noArrow
            ? { type: MarkerType.ArrowClosed, color }
            : undefined,
        });
      }

      // Create edges for secondary roles supplements
      if (group.isSecondary && group.supplementsRoles && showSecondaryRoles) {
        group.supplementsRoles.forEach((roleId) => {
          if (visibleGroups.some((g) => g.id === roleId)) {
            edges.push({
              id: `secondary-${group.id}-${roleId}`,
              source: group.id,
              target: roleId,
              type: 'custom',
              animated: true,
              data: {
                label: 'supplements',
                color: '#9e9e9e',
                dashed: true,
              },
            });
          }
        });
      }
    });

    // Create edges from standalone connections
    // Build a set of all visible node IDs (groups + sections)
    const visibleNodeIds = new Set([
      ...visibleGroups.map(g => g.id),
      ...nodes.map(n => n.id), // section nodes are already in the nodes array
    ]);

    (map.connections || []).forEach((conn) => {
      // Only render if both source and target are visible
      if (visibleNodeIds.has(conn.source) && visibleNodeIds.has(conn.target)) {
        const sourceGroup = map.groups.find(g => g.id === conn.source);
        const targetGroup = map.groups.find(g => g.id === conn.target);
        const sectionId = targetGroup?.sectionId || sourceGroup?.sectionId;
        // For section-to-section connections, get color from the source section
        const sourceSectionId = conn.source.startsWith('section-') ? conn.source.replace('section-', '') : null;
        const targetSectionId = conn.target.startsWith('section-') ? conn.target.replace('section-', '') : null;
        const section = sectionId
          ? map.sections.find(s => s.id === sectionId)
          : map.sections.find(s => s.id === sourceSectionId || s.id === targetSectionId);
        const color = section?.color || '#666';
        const connStyle = conn.style || {};

        edges.push({
          id: `conn-${conn.id}`,
          source: conn.source,
          target: conn.target,
          ...(conn.sourceHandle ? { sourceHandle: conn.sourceHandle } : {}),
          ...(conn.targetHandle ? { targetHandle: conn.targetHandle } : {}),
          type: 'custom',
          animated: connStyle.animated || false,
          reconnectable: true,
          data: {
            label: conn.label || '',
            color,
            dashed: connStyle.dashed || false,
          },
          markerStart: connStyle.arrowAtStart && !connStyle.noArrow
            ? { type: MarkerType.ArrowClosed, color }
            : undefined,
          markerEnd: !connStyle.arrowAtStart && !connStyle.noArrow
            ? { type: MarkerType.ArrowClosed, color }
            : undefined,
        });
      }
    });

    return { builtNodes: nodes, builtEdges: edges };
  }, [map.sections, map.groups, map.rootGroupId, map.connections, showSecondaryRoles, getSectionForGroup]);

  // Apply initial layout only once
  const getInitialNodes = useCallback(() => {
    const roleNodes = builtNodes.filter(n => n.type !== 'sectionContainer');
    const sectionNodes = builtNodes.filter(n => n.type === 'sectionContainer');
    const hasPositions = roleNodes.some((n) => n.position.x !== 0 || n.position.y !== 0)
      || map.groups.some((g) => g.position && (g.position.x !== 0 || g.position.y !== 0));

    if (!hasPositions && roleNodes.length > 0 && !initialLayoutApplied.current) {
      initialLayoutApplied.current = true;
      const layouted = getLayoutedElements(roleNodes, builtEdges, { direction: 'TB', rankSep: 100, nodeSep: 40 });
      return [...sectionNodes, ...layouted.nodes];
    }

    return builtNodes;
  }, [builtNodes, builtEdges]);

  const [nodes, setNodes, onNodesChange] = useNodesState(getInitialNodes());
  setNodesRef.current = setNodes;
  const [edges, setEdges, onEdgesChange] = useEdgesState(builtEdges);

  // Sync when map structure OR visual data changes (not positions)
  const prevMapRef = useRef<string>('');
  useEffect(() => {
    const mapKey = JSON.stringify({
      nodeIds: builtNodes.map(n => n.id).sort(),
      edgeIds: builtEdges.map(e => e.id).sort(),
      // Detect data changes that affect node rendering (section reassignment, label, color)
      groupMeta: map.groups.map(g => `${g.id}:${g.sectionId}:${g.label}:${g.email || ''}`).sort(),
      sectionMeta: map.sections.map(s => `${s.id}:${s.color}:${s.bgColor}:${s.name}:${s.email || ''}:${s.parentSectionId || ''}:${s.collapsed}`).sort(),
    });

    if (mapKey !== prevMapRef.current) {
      prevMapRef.current = mapKey;

      // Preserve existing positions when syncing, using cache for hidden nodes
      setNodes(currentNodes => {
        // Update cache with current positions before syncing
        currentNodes.forEach(n => {
          if (n.position.x !== 0 || n.position.y !== 0) {
            positionCacheRef.current.set(n.id, n.position);
          }
        });

        const newNodes = builtNodes.map(node => {
          // Priority: current state > cache > data model > default
          const currentNode = currentNodes.find(n => n.id === node.id);
          const cachedPos = positionCacheRef.current.get(node.id);
          const position = currentNode?.position || cachedPos || node.position;

          // Track section positions
          if (node.id.startsWith('section-')) {
            const sectionId = node.id.replace('section-', '');
            sectionPositionsRef.current.set(sectionId, position);
          }

          return { ...node, position };
        });

        return newNodes;
      });
      setEdges(builtEdges);
    }
  }, [builtNodes, builtEdges, setNodes, setEdges]);

  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      // Intercept remove changes — route through app delete callbacks instead
      // of letting React Flow remove from its internal state silently.
      const removeChanges = changes.filter(c => c.type === 'remove');
      if (removeChanges.length > 0) {
        for (const change of removeChanges) {
          if (change.id.startsWith('section-')) {
            onDeleteSection(change.id.replace('section-', ''));
          } else {
            onDeleteNode(change.id);
          }
        }
        // Filter out removes so React Flow doesn't process them — the app
        // callbacks update the data model, which rebuilds the canvas.
        const nonRemoveChanges = changes.filter(c => c.type !== 'remove');
        if (nonRemoveChanges.length === 0) return;
        changes = nonRemoveChanges;
      }

      // On drag-end, replace the raw mouse position with the alignment-snapped
      // position BEFORE React Flow applies it. This prevents the "jog on release"
      // where onNodesChange would apply the raw position, undoing the snap.
      const adjusted = changes.map(change => {
        if (change.type === 'position' && change.dragging === false && change.position) {
          const snapped = snappedPositionRef.current.get(change.id);
          if (snapped) {
            return { ...change, position: snapped };
          }
        }
        return change;
      });

      // Check for section drag to move children
      adjusted.forEach((change) => {
        if (change.type === 'position' && change.position && change.id.startsWith('section-')) {
          const sectionId = change.id.replace('section-', '');
          const prevPos = sectionPositionsRef.current.get(sectionId);

          if (prevPos && change.dragging) {
            // Calculate delta
            const deltaX = change.position.x - prevPos.x;
            const deltaY = change.position.y - prevPos.y;

            if (deltaX !== 0 || deltaY !== 0) {
              // Collect this section + all child department sections
              const sectionIds = new Set([sectionId]);
              map.sections.forEach(s => {
                if (s.parentSectionId === sectionId) {
                  sectionIds.add(s.id);
                }
              });

              // Move all groups in this section and its child departments
              setNodes(currentNodes =>
                currentNodes.map(node => {
                  if (node.id.startsWith('section-')) return node;
                  const nodeData = node.data as { sectionId?: string };
                  if (nodeData.sectionId && sectionIds.has(nodeData.sectionId)) {
                    const newPos = {
                      x: node.position.x + deltaX,
                      y: node.position.y + deltaY,
                    };
                    positionCacheRef.current.set(node.id, newPos);
                    return { ...node, position: newPos };
                  }
                  return node;
                })
              );
            }
          }

          // Update tracked position
          sectionPositionsRef.current.set(sectionId, change.position);

          // Save section position when drag ends
          if (change.dragging === false) {
            onSectionPositionChange(sectionId, change.position);
          }
        }

        // Handle section resize
        if (change.type === 'dimensions' && change.id.startsWith('section-') && change.dimensions) {
          const sectionId = change.id.replace('section-', '');
          const section = map.sections.find(s => s.id === sectionId);
          if (section) {
            onSectionPositionChange(
              sectionId,
              section.position || { x: 0, y: 0 },
              { width: change.dimensions.width, height: change.dimensions.height }
            );
          }
        }
      });

      // Apply adjusted changes to React Flow state (snapped positions, not raw)
      onNodesChange(adjusted);

      // Save position changes for role nodes
      adjusted.forEach((change) => {
        if (change.type === 'position' && change.position && change.dragging === false) {
          if (!change.id.startsWith('section-')) {
            positionCacheRef.current.set(change.id, change.position);
            onNodePositionChange(change.id, change.position);
          }
        }
      });

      // Clean up snapped refs after persisting
      adjusted.forEach((change) => {
        if (change.type === 'position' && change.dragging === false) {
          snappedPositionRef.current.delete(change.id);
        }
      });
    },
    [onNodesChange, onNodePositionChange, onSectionPositionChange, onDeleteNode, onDeleteSection, setNodes, map.groups, map.sections]
  );

  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      setGuideLines([]);
      if (!node.id.startsWith('section-')) {
        onNodeSelect(node.id);
      }
    },
    [onNodeSelect]
  );

  const handleNodeDoubleClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      if (node.id.startsWith('section-')) {
        const sectionId = node.id.replace('section-', '');
        onEditSection(sectionId);
      } else {
        onEditNode(node.id);
      }
    },
    [onEditNode, onEditSection]
  );

  const handlePaneClick = useCallback(() => {
    setGuideLines([]);
    onNodeSelect(null);
    setContextMenu(prev => ({ ...prev, show: false }));
  }, [onNodeSelect]);

  // Right-click context menu
  const handleNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: Node) => {
      event.preventDefault();
      const isSection = node.id.startsWith('section-');
      setContextMenu({
        show: true,
        x: event.clientX,
        y: event.clientY,
        nodeId: isSection ? node.id.replace('section-', '') : node.id,
        nodeType: isSection ? 'section' : 'role',
      });
    },
    []
  );

  const handlePaneContextMenu = useCallback(
    (event: MouseEvent | React.MouseEvent) => {
      event.preventDefault();
      setContextMenu({
        show: true,
        x: event.clientX,
        y: event.clientY,
        nodeId: null,
        nodeType: 'pane',
      });
    },
    []
  );

  // Edge context menu
  const handleEdgeContextMenu = useCallback(
    (event: React.MouseEvent, edge: Edge) => {
      event.preventDefault();
      const edgeData = edge.data as { label?: string; dashed?: boolean } | undefined;
      setContextMenu({
        show: true,
        x: event.clientX,
        y: event.clientY,
        nodeId: edge.id,
        nodeType: 'edge',
        edgeData: {
          label: edgeData?.label,
          dashed: edgeData?.dashed,
          animated: edge.animated,
          hasArrow: !!edge.markerEnd || !!edge.markerStart,
          arrowAtStart: !!edge.markerStart,
        },
      });
    },
    []
  );

  // Delete edge and update data model
  const handleDeleteEdge = useCallback(
    (edgeId: string) => {
      const edge = edges.find(e => e.id === edgeId);
      if (edge) {
        if (edge.id.startsWith('conn-')) {
          // Standalone connection - remove from connections array
          const connId = edge.id.replace('conn-', '');
          onRemoveConnection(connId);
        } else if (edge.id.startsWith('secondary-')) {
          // Secondary role supplement edge - remove target from supplementsRoles
          const secondaryGroup = map.groups.find(g =>
            g.isSecondary && edge.id === `secondary-${g.id}-${edge.target}`
          );
          if (secondaryGroup && secondaryGroup.supplementsRoles) {
            onUpdateGroup({
              ...secondaryGroup,
              supplementsRoles: secondaryGroup.supplementsRoles.filter(r => r !== edge.target),
            });
          }
        } else {
          // Remove parent relationship for regular edges
          onReparent(edge.target, null);
        }
        setEdges(eds => eds.filter(e => e.id !== edgeId));
      }
    },
    [edges, setEdges, onReparent, onRemoveConnection, onUpdateGroup, map.groups]
  );

  // Handle edge deletion via keyboard (Delete/Backspace key)
  const handleEdgesDelete = useCallback(
    (deletedEdges: Edge[]) => {
      deletedEdges.forEach(edge => {
        if (edge.id.startsWith('conn-')) {
          // Standalone connection
          const connId = edge.id.replace('conn-', '');
          onRemoveConnection(connId);
        } else if (edge.id.startsWith('secondary-')) {
          // Secondary edge - remove from supplementsRoles
          const secondaryGroup = map.groups.find(g =>
            g.isSecondary && edge.id === `secondary-${g.id}-${edge.target}`
          );
          if (secondaryGroup && secondaryGroup.supplementsRoles) {
            onUpdateGroup({
              ...secondaryGroup,
              supplementsRoles: secondaryGroup.supplementsRoles.filter(r => r !== edge.target),
            });
          }
        } else {
          // Regular edge - clear parent relationship in data model
          onReparent(edge.target, null);
        }
      });
    },
    [onReparent, onRemoveConnection, onUpdateGroup, map.groups]
  );

  // Get group ID from edge ID (edge format: parentId-groupId or conn-connId)
  const getGroupIdFromEdge = useCallback((edgeId: string) => {
    const edge = edges.find(e => e.id === edgeId);
    return edge?.target || null;
  }, [edges]);

  // Check if an edge is a standalone connection
  const isConnectionEdge = useCallback((edgeId: string) => {
    return edgeId.startsWith('conn-');
  }, []);

  // Get connection ID from edge ID
  const getConnectionIdFromEdge = useCallback((edgeId: string) => {
    return edgeId.replace('conn-', '');
  }, []);

  // Add/update edge label
  const handleUpdateEdgeLabel = useCallback(
    (edgeId: string, label: string) => {
      setEdges(eds =>
        eds.map(e =>
          e.id === edgeId
            ? { ...e, data: { ...e.data, label } }
            : e
        )
      );
      // Persist to data model
      if (isConnectionEdge(edgeId)) {
        onUpdateConnectionStyle(getConnectionIdFromEdge(edgeId), label, undefined);
      } else {
        const groupId = getGroupIdFromEdge(edgeId);
        if (groupId) {
          onEdgeStyleChange(groupId, label, undefined);
        }
      }
    },
    [setEdges, getGroupIdFromEdge, isConnectionEdge, getConnectionIdFromEdge, onEdgeStyleChange, onUpdateConnectionStyle]
  );

  // Reverse edge direction (visual only - swaps arrow position)
  const handleReverseEdge = useCallback(
    (edgeId: string) => {
      let newArrowAtStart = false;

      setEdges(eds =>
        eds.map(e => {
          if (e.id !== edgeId) return e;
          const currentData = e.data as { color?: string } | undefined;
          const color = currentData?.color || '#666';

          // If arrow is at end, move to start. If at start, move to end.
          if (e.markerEnd) {
            newArrowAtStart = true;
            return {
              ...e,
              markerEnd: undefined,
              markerStart: { type: MarkerType.ArrowClosed, color },
            };
          } else if (e.markerStart) {
            newArrowAtStart = false;
            return {
              ...e,
              markerStart: undefined,
              markerEnd: { type: MarkerType.ArrowClosed, color },
            };
          }
          // If no marker, add one at the end
          return {
            ...e,
            markerEnd: { type: MarkerType.ArrowClosed, color },
          };
        })
      );

      // Persist to data model
      if (isConnectionEdge(edgeId)) {
        onUpdateConnectionStyle(getConnectionIdFromEdge(edgeId), undefined, { arrowAtStart: newArrowAtStart, noArrow: false });
      } else {
        const groupId = getGroupIdFromEdge(edgeId);
        if (groupId) {
          onEdgeStyleChange(groupId, undefined, { arrowAtStart: newArrowAtStart, noArrow: false });
        }
      }
    },
    [setEdges, getGroupIdFromEdge, isConnectionEdge, getConnectionIdFromEdge, onEdgeStyleChange, onUpdateConnectionStyle]
  );

  // Update edge style
  const handleUpdateEdgeStyle = useCallback(
    (edgeId: string, style: { dashed?: boolean; animated?: boolean; toggleArrow?: boolean }) => {
      let persistedStyle: { dashed?: boolean; animated?: boolean; noArrow?: boolean } = {};

      setEdges(eds =>
        eds.map(e => {
          if (e.id !== edgeId) return e;
          const currentData = e.data as { label?: string; color?: string; dashed?: boolean } | undefined;
          const color = currentData?.color || '#666';

          let markerEnd = e.markerEnd;
          let markerStart = e.markerStart;

          // Toggle arrow on/off
          if (style.toggleArrow !== undefined) {
            const hasAnyArrow = !!e.markerEnd || !!e.markerStart;
            if (hasAnyArrow) {
              // Remove all arrows
              markerEnd = undefined;
              markerStart = undefined;
              persistedStyle.noArrow = true;
            } else {
              // Add arrow at end
              markerEnd = { type: MarkerType.ArrowClosed, color };
              persistedStyle.noArrow = false;
            }
          }

          if (style.dashed !== undefined) {
            persistedStyle.dashed = style.dashed;
          }
          if (style.animated !== undefined) {
            persistedStyle.animated = style.animated;
          }

          return {
            ...e,
            data: {
              ...currentData,
              dashed: style.dashed ?? currentData?.dashed,
            },
            animated: style.animated ?? e.animated,
            markerEnd,
            markerStart,
          };
        })
      );

      // Persist to data model
      if (Object.keys(persistedStyle).length > 0) {
        if (isConnectionEdge(edgeId)) {
          onUpdateConnectionStyle(getConnectionIdFromEdge(edgeId), undefined, persistedStyle);
        } else {
          const groupId = getGroupIdFromEdge(edgeId);
          if (groupId) {
            onEdgeStyleChange(groupId, undefined, persistedStyle);
          }
        }
      }
    },
    [setEdges, getGroupIdFromEdge, isConnectionEdge, getConnectionIdFromEdge, onEdgeStyleChange, onUpdateConnectionStyle]
  );

  const closeContextMenu = useCallback(() => {
    setContextMenu(prev => ({ ...prev, show: false }));
  }, []);

  // Match section width to the widest other section
  const handleMatchWidth = useCallback((sectionId: string) => {
    const sectionNodes = nodes.filter(n => n.id.startsWith('section-') && n.id !== `section-${sectionId}`);
    if (sectionNodes.length === 0) return;

    const maxWidth = Math.max(...sectionNodes.map(n => n.style?.width as number || 250));
    const currentSection = map.sections.find(s => s.id === sectionId);

    if (currentSection) {
      onSectionPositionChange(
        sectionId,
        currentSection.position || { x: 0, y: 0 },
        { width: maxWidth, height: currentSection.size?.height || 400 }
      );
      // Update node in React Flow state
      setNodes(nds => nds.map(n =>
        n.id === `section-${sectionId}`
          ? { ...n, style: { ...n.style, width: maxWidth } }
          : n
      ));
    }
  }, [nodes, map.sections, onSectionPositionChange, setNodes]);

  // Match section height to the tallest other section
  const handleMatchHeight = useCallback((sectionId: string) => {
    const sectionNodes = nodes.filter(n => n.id.startsWith('section-') && n.id !== `section-${sectionId}`);
    if (sectionNodes.length === 0) return;

    const maxHeight = Math.max(...sectionNodes.map(n => n.style?.height as number || 400));
    const currentSection = map.sections.find(s => s.id === sectionId);

    if (currentSection) {
      onSectionPositionChange(
        sectionId,
        currentSection.position || { x: 0, y: 0 },
        { width: currentSection.size?.width || 250, height: maxHeight }
      );
      // Update node in React Flow state
      setNodes(nds => nds.map(n =>
        n.id === `section-${sectionId}`
          ? { ...n, style: { ...n.style, height: maxHeight } }
          : n
      ));
    }
  }, [nodes, map.sections, onSectionPositionChange, setNodes]);

  // Set exact section dimensions via prompt
  const handleSetSize = useCallback((sectionId: string) => {
    const currentSection = map.sections.find(s => s.id === sectionId);
    if (!currentSection) return;

    const currentW = currentSection.size?.width || 250;
    const currentH = currentSection.size?.height || 400;
    const input = prompt(`Enter size as width x height:`, `${currentW} x ${currentH}`);
    if (!input) return;

    const match = input.match(/(\d+)\s*[x×,]\s*(\d+)/);
    if (!match) return;

    const newW = Math.max(150, parseInt(match[1], 10));
    const newH = Math.max(100, parseInt(match[2], 10));

    onSectionPositionChange(
      sectionId,
      currentSection.position || { x: 0, y: 0 },
      { width: newW, height: newH }
    );
    setNodes(nds => nds.map(n =>
      n.id === `section-${sectionId}`
        ? { ...n, style: { ...n.style, width: newW, height: newH } }
        : n
    ));
  }, [map.sections, onSectionPositionChange, setNodes]);

  // Handle edge reconnection (drag to reparent)
  const onReconnectStart = useCallback(() => {
    edgeReconnectSuccessful.current = false;
  }, []);

  // Connection drag visual feedback
  const onConnectStart = useCallback(() => {
    setIsConnecting(true);
  }, []);

  const onConnectEnd = useCallback(() => {
    setIsConnecting(false);
  }, []);

  // Check if connecting to a node would create a circular reference
  const wouldCreateCycle = useCallback(
    (childId: string, parentId: string): boolean => {
      if (childId === parentId) return true;
      // Walk up the parent chain from parentId to see if we reach childId
      let current = parentId;
      const visited = new Set<string>();
      while (current) {
        if (visited.has(current)) return true;
        visited.add(current);
        const group = map.groups.find(g => g.id === current);
        if (!group?.parentId) break;
        if (group.parentId === childId) return true;
        current = group.parentId;
      }
      return false;
    },
    [map.groups]
  );

  const onReconnect: OnReconnect = useCallback(
    (oldEdge, newConnection) => {
      if (newConnection.source && newConnection.target) {
        // Prevent self-connections and circular references
        if (newConnection.source === newConnection.target) return;
        if (wouldCreateCycle(newConnection.source, newConnection.target)) return;

        edgeReconnectSuccessful.current = true;
        onReparent(
          newConnection.target,
          newConnection.source,
          newConnection.sourceHandle || undefined,
          newConnection.targetHandle || undefined
        );
        setEdges((els) => reconnectEdge(oldEdge, newConnection, els));
      }
    },
    [setEdges, onReparent, wouldCreateCycle]
  );

  const onReconnectEnd = useCallback(
    (_: MouseEvent | TouchEvent, edge: Edge) => {
      if (!edgeReconnectSuccessful.current) {
        const childId = edge.target;
        onReparent(childId, null);
        setEdges((eds) => eds.filter((e) => e.id !== edge.id));
      }
      edgeReconnectSuccessful.current = true;
    },
    [setEdges, onReparent]
  );

  // Smart alignment snapping during node drag
  const handleNodeDrag = useCallback(
    (_: React.MouseEvent, dragNode: Node) => {
      const isSection = dragNode.id.startsWith('section-');
      // Sections snap only to other sections; role nodes snap to everything
      const candidates = isSection
        ? nodes.filter(n => n.id.startsWith('section-'))
        : nodes;

      const result = findAlignments(dragNode, candidates);

      if (result.snapX !== null || result.snapY !== null) {
        const snappedPos = {
          x: result.snapX ?? dragNode.position.x,
          y: result.snapY ?? dragNode.position.y,
        };
        snappedPositionRef.current.set(dragNode.id, snappedPos);
        setNodes(nds =>
          nds.map(n => n.id === dragNode.id ? { ...n, position: snappedPos } : n)
        );
      } else {
        // No snap — clear so drag-end uses raw position
        snappedPositionRef.current.delete(dragNode.id);
      }

      setGuideLines(result.guideLines);
    },
    [nodes, setNodes]
  );

  const handleNodeDragStop = useCallback(() => {
    setGuideLines([]);
  }, []);

  // Handle new connections (add parent relationship or standalone connection)
  const onConnect = useCallback(
    (connection: Connection) => {
      if (connection.source && connection.target) {
        // Prevent self-connections
        if (connection.source === connection.target) return;

        // Get section color for the edge
        const targetGroup = map.groups.find(g => g.id === connection.target);
        const sourceGroup = map.groups.find(g => g.id === connection.source);
        const sectionId = targetGroup?.sectionId || sourceGroup?.sectionId;
        const section = sectionId ? map.sections.find(s => s.id === sectionId) : null;
        const edgeColor = section?.color || '#666';

        // Determine if this involves section nodes (not group nodes)
        const involvesSection =
          connection.source.startsWith('section-') || connection.target.startsWith('section-');

        // Check if target already has a parent - if so, add as standalone connection
        const targetHasParent = targetGroup?.parentId != null;

        // Use standalone connection if:
        // - Target already has a parent (multiple edges to same node)
        // - Either end is a section node (can't be a parent-child relationship)
        if (targetHasParent || involvesSection) {
          const connId = crypto.randomUUID().slice(0, 12);
          onAddConnection({
            id: connId,
            source: connection.source,
            target: connection.target,
            sourceHandle: connection.sourceHandle || undefined,
            targetHandle: connection.targetHandle || undefined,
          });
          setEdges((eds) =>
            addEdge(
              {
                id: `conn-${connId}`,
                source: connection.source,
                target: connection.target,
                ...(connection.sourceHandle ? { sourceHandle: connection.sourceHandle } : {}),
                ...(connection.targetHandle ? { targetHandle: connection.targetHandle } : {}),
                type: 'custom',
                data: {
                  color: edgeColor,
                  dashed: false,
                },
                markerEnd: { type: MarkerType.ArrowClosed, color: edgeColor },
              },
              eds
            )
          );
        } else {
          // Prevent circular references (only applies to parent-child edges)
          if (wouldCreateCycle(connection.source, connection.target)) return;

          // Save the handle IDs to the data model as parent relationship
          onReparent(
            connection.target,
            connection.source,
            connection.sourceHandle || undefined,
            connection.targetHandle || undefined
          );
          setEdges((eds) =>
            addEdge(
              {
                id: `${connection.source}-${connection.target}`,
                source: connection.source,
                target: connection.target,
                ...(connection.sourceHandle ? { sourceHandle: connection.sourceHandle } : {}),
                ...(connection.targetHandle ? { targetHandle: connection.targetHandle } : {}),
                type: 'custom',
                data: {
                  color: edgeColor,
                  dashed: false,
                },
                markerEnd: { type: MarkerType.ArrowClosed, color: edgeColor },
              },
              eds
            )
          );
        }
      }
    },
    [setEdges, onReparent, onAddConnection, wouldCreateCycle, map.groups, map.sections]
  );

  // Section badges for the legend
  const sectionBadges = useMemo(() => {
    return map.sections
      .filter((s) => s.id !== 'secondary-roles' || showSecondaryRoles)
      .map((section) => ({
        ...section,
        groupCount: map.groups.filter((g) => g.sectionId === section.id).length,
      }));
  }, [map.sections, map.groups, showSecondaryRoles]);

  return (
    <div className={`canvas-container ${isConnecting ? 'connecting' : ''}`} ref={flowRef}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={onEdgesChange}
        onEdgesDelete={handleEdgesDelete}
        onConnect={onConnect}
        onReconnect={onReconnect}
        onReconnectStart={onReconnectStart}
        onReconnectEnd={onReconnectEnd}
        onConnectStart={onConnectStart}
        onConnectEnd={onConnectEnd}
        onNodeClick={handleNodeClick}
        onNodeDoubleClick={handleNodeDoubleClick}
        onNodeContextMenu={handleNodeContextMenu}
        onEdgeContextMenu={handleEdgeContextMenu}
        onNodeDrag={handleNodeDrag}
        onNodeDragStop={handleNodeDragStop}
        onPaneClick={handlePaneClick}
        onPaneContextMenu={handlePaneContextMenu}
        edgesReconnectable
        deleteKeyCode={["Delete", "Backspace"]}
        selectionOnDrag={false}
        panOnDrag
        selectionKeyCode="Shift"
        multiSelectionKeyCode="Shift"
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        connectionMode={ConnectionMode.Loose}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.3}
        maxZoom={2}
        elevateEdgesOnSelect
        defaultEdgeOptions={{
          type: 'custom',
          zIndex: 1000,
        }}
      >
        <Background color="#e0e0e0" gap={20} />
        <Controls />
        <MiniMap
          nodeColor={(node) => {
            if (node.type === 'sectionContainer') {
              return (node.data as { bgColor: string }).bgColor || '#e2e2e2';
            }
            return (node.data as { bgColor: string }).bgColor || '#e2e2e2';
          }}
          maskColor="rgba(0,0,0,0.1)"
        />

        <Panel position="top-left" className="section-legend">
          <div className="legend-title">Sections</div>
          {sectionBadges.map((section) => (
            <button
              key={section.id}
              className={`legend-item ${section.collapsed ? 'collapsed' : ''}`}
              style={{
                borderLeftColor: section.color,
                backgroundColor: section.collapsed ? '#f0f0f0' : section.bgColor,
              }}
              onClick={() => onToggleSectionCollapse(section.id)}
              title={section.collapsed ? 'Click to expand' : 'Click to collapse'}
            >
              <span className="legend-name" style={{ color: section.color }}>
                {section.name}
              </span>
              <span className="legend-count">{section.groupCount}</span>
              <span className="legend-toggle">{section.collapsed ? '+' : '-'}</span>
            </button>
          ))}
        </Panel>
      </ReactFlow>

      {guideLines.length > 0 && <AlignmentGuides guideLines={guideLines} />}

      {contextMenu.show && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          nodeType={contextMenu.nodeType}
          onClose={closeContextMenu}
          onEdit={() => {
            if (contextMenu.nodeType === 'section' && contextMenu.nodeId) {
              onEditSection(contextMenu.nodeId);
            } else if (contextMenu.nodeId) {
              onEditNode(contextMenu.nodeId);
            }
          }}
          onDelete={() => {
            if (contextMenu.nodeType === 'edge' && contextMenu.nodeId) {
              handleDeleteEdge(contextMenu.nodeId);
            } else if (contextMenu.nodeType === 'section' && contextMenu.nodeId) {
              onDeleteSection(contextMenu.nodeId);
            } else if (contextMenu.nodeId) {
              onDeleteNode(contextMenu.nodeId);
            }
          }}
          onAddChild={() => {
            if (contextMenu.nodeId) {
              const group = map.groups.find(g => g.id === contextMenu.nodeId);
              onAddGroup(contextMenu.nodeId, group?.sectionId);
            }
          }}
          onAddGroup={() => {
            if (contextMenu.nodeType === 'section' && contextMenu.nodeId) {
              onAddGroup(undefined, contextMenu.nodeId);
            } else {
              onAddGroup();
            }
          }}
          onAddSection={onAddSection}
          onAddDepartment={
            contextMenu.nodeType === 'section' && contextMenu.nodeId
              ? () => onAddDepartment(contextMenu.nodeId!)
              : undefined
          }
          hasLabel={!!contextMenu.edgeData?.label}
          isDashed={contextMenu.edgeData?.dashed}
          isAnimated={contextMenu.edgeData?.animated}
          hasArrow={contextMenu.edgeData?.hasArrow}
          onAddLabel={() => {
            if (contextMenu.nodeId) {
              const label = prompt('Enter connection label:');
              if (label) {
                handleUpdateEdgeLabel(contextMenu.nodeId, label);
              }
            }
          }}
          onRemoveLabel={() => {
            if (contextMenu.nodeId) {
              handleUpdateEdgeLabel(contextMenu.nodeId, '');
            }
          }}
          onReverseDirection={() => {
            if (contextMenu.nodeId) {
              handleReverseEdge(contextMenu.nodeId);
            }
          }}
          onToggleDashed={() => {
            if (contextMenu.nodeId) {
              handleUpdateEdgeStyle(contextMenu.nodeId, { dashed: !contextMenu.edgeData?.dashed });
            }
          }}
          onToggleAnimated={() => {
            if (contextMenu.nodeId) {
              handleUpdateEdgeStyle(contextMenu.nodeId, { animated: !contextMenu.edgeData?.animated });
            }
          }}
          onToggleArrow={() => {
            if (contextMenu.nodeId) {
              handleUpdateEdgeStyle(contextMenu.nodeId, { toggleArrow: true });
            }
          }}
          onMatchWidth={() => {
            if (contextMenu.nodeId && contextMenu.nodeType === 'section') {
              handleMatchWidth(contextMenu.nodeId);
            }
          }}
          onMatchHeight={() => {
            if (contextMenu.nodeId && contextMenu.nodeType === 'section') {
              handleMatchHeight(contextMenu.nodeId);
            }
          }}
          onSetSize={() => {
            if (contextMenu.nodeId && contextMenu.nodeType === 'section') {
              handleSetSize(contextMenu.nodeId);
            }
          }}
        />
      )}
    </div>
  );
}

export async function exportToPDF(elementId: string, filename: string) {
  const element = document.getElementById(elementId);
  if (!element) return;

  try {
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
      unit: 'px',
      format: [canvas.width, canvas.height],
    });

    pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
    pdf.save(`${filename}.pdf`);
  } catch (error) {
    console.error('Error exporting PDF:', error);
    alert('Error exporting PDF. Please try again.');
  }
}
