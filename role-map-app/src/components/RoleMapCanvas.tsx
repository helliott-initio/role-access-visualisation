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
import type { RoleMap, Section } from '../types';

const nodeTypes = {
  roleNode: RoleNode,
  rootNode: RootNode,
  sectionContainer: SectionContainer,
};

const edgeTypes = {
  custom: CustomEdge,
};

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
  onEditNode: (nodeId: string) => void;
  onDeleteNode: (nodeId: string) => void;
  onAddGroup: (parentId?: string, sectionId?: string) => void;
  onAddSection: () => void;
  onEditSection: (sectionId: string) => void;
  onDeleteSection: (sectionId: string) => void;
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
  onEditNode,
  onDeleteNode,
  onAddGroup,
  onAddSection,
  onEditSection,
  onDeleteSection,
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
        const defaultPosition = { x: index * 280, y: 120 };
        const defaultSize = { width: 250, height: 400 };
        nodes.push({
          id: `section-${section.id}`,
          type: 'sectionContainer',
          position: section.position || defaultPosition,
          data: {
            label: section.name,
            color: section.color,
            bgColor: section.bgColor,
            collapsed: section.collapsed,
            type: section.type || 'primary',
          },
          style: {
            width: section.size?.width || defaultSize.width,
            height: section.size?.height || defaultSize.height,
            zIndex: -1,
          },
          selectable: true,
          draggable: true,
        });
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

      // Create edge to parent
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

    return { builtNodes: nodes, builtEdges: edges };
  }, [map.sections, map.groups, map.rootGroupId, showSecondaryRoles, getSectionForGroup]);

  // Apply initial layout only once
  const getInitialNodes = useCallback(() => {
    const roleNodes = builtNodes.filter(n => n.type !== 'sectionContainer');
    const sectionNodes = builtNodes.filter(n => n.type === 'sectionContainer');
    const hasPositions = roleNodes.some((n) => n.position.x !== 0 || n.position.y !== 0);

    if (!hasPositions && roleNodes.length > 0 && !initialLayoutApplied.current) {
      initialLayoutApplied.current = true;
      const layouted = getLayoutedElements(roleNodes, builtEdges, { direction: 'TB', rankSep: 100, nodeSep: 40 });
      return [...sectionNodes, ...layouted.nodes];
    }

    return builtNodes;
  }, [builtNodes, builtEdges]);

  const [nodes, setNodes, onNodesChange] = useNodesState(getInitialNodes());
  const [edges, setEdges, onEdgesChange] = useEdgesState(builtEdges);

  // Only sync when map structure changes (add/remove nodes), not positions
  const prevMapRef = useRef<string>('');
  useEffect(() => {
    // Create a key based on node IDs and edge IDs only
    const mapKey = JSON.stringify({
      nodeIds: builtNodes.map(n => n.id).sort(),
      edgeIds: builtEdges.map(e => e.id).sort(),
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
      // Check for section drag to move children
      changes.forEach((change) => {
        if (change.type === 'position' && change.position && change.id.startsWith('section-')) {
          const sectionId = change.id.replace('section-', '');
          const prevPos = sectionPositionsRef.current.get(sectionId);

          if (prevPos && change.dragging) {
            // Calculate delta
            const deltaX = change.position.x - prevPos.x;
            const deltaY = change.position.y - prevPos.y;

            if (deltaX !== 0 || deltaY !== 0) {
              // Move all groups in this section
              setNodes(currentNodes =>
                currentNodes.map(node => {
                  if (node.id.startsWith('section-')) return node;
                  const nodeData = node.data as { sectionId?: string };
                  if (nodeData.sectionId === sectionId) {
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

      onNodesChange(changes);

      // Save position changes for role nodes (not section containers)
      changes.forEach((change) => {
        if (change.type === 'position' && change.position && change.dragging === false) {
          if (!change.id.startsWith('section-')) {
            // Update cache and persist to data model
            positionCacheRef.current.set(change.id, change.position);
            onNodePositionChange(change.id, change.position);
          }
        }
      });
    },
    [onNodesChange, onNodePositionChange, onSectionPositionChange, setNodes]
  );

  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
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
        // Remove parent relationship
        onReparent(edge.target, null);
        setEdges(eds => eds.filter(e => e.id !== edgeId));
      }
    },
    [edges, setEdges, onReparent]
  );

  // Get group ID from edge ID (edge format: parentId-groupId)
  const getGroupIdFromEdge = useCallback((edgeId: string) => {
    const edge = edges.find(e => e.id === edgeId);
    return edge?.target || null;
  }, [edges]);

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
      const groupId = getGroupIdFromEdge(edgeId);
      if (groupId) {
        onEdgeStyleChange(groupId, label, undefined);
      }
    },
    [setEdges, getGroupIdFromEdge, onEdgeStyleChange]
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
      const groupId = getGroupIdFromEdge(edgeId);
      if (groupId) {
        onEdgeStyleChange(groupId, undefined, { arrowAtStart: newArrowAtStart, noArrow: false });
      }
    },
    [setEdges, getGroupIdFromEdge, onEdgeStyleChange]
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
      const groupId = getGroupIdFromEdge(edgeId);
      if (groupId && Object.keys(persistedStyle).length > 0) {
        onEdgeStyleChange(groupId, undefined, persistedStyle);
      }
    },
    [setEdges, getGroupIdFromEdge, onEdgeStyleChange]
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

  // Handle edge reconnection (drag to reparent)
  const onReconnectStart = useCallback(() => {
    edgeReconnectSuccessful.current = false;
  }, []);

  const onReconnect: OnReconnect = useCallback(
    (oldEdge, newConnection) => {
      edgeReconnectSuccessful.current = true;
      if (newConnection.source && newConnection.target) {
        onReparent(
          newConnection.target,
          newConnection.source,
          newConnection.sourceHandle || undefined,
          newConnection.targetHandle || undefined
        );
      }
      setEdges((els) => reconnectEdge(oldEdge, newConnection, els));
    },
    [setEdges, onReparent]
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

  // Handle new connections (add parent relationship)
  const onConnect = useCallback(
    (connection: Connection) => {
      if (connection.source && connection.target) {
        // Save the handle IDs to the data model
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
                color: '#666',
                dashed: false,
              },
              markerEnd: { type: MarkerType.ArrowClosed, color: '#666' },
            },
            eds
          )
        );
      }
    },
    [setEdges, onReparent]
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
    <div className="canvas-container" ref={flowRef}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onReconnect={onReconnect}
        onReconnectStart={onReconnectStart}
        onReconnectEnd={onReconnectEnd}
        onNodeClick={handleNodeClick}
        onNodeDoubleClick={handleNodeDoubleClick}
        onNodeContextMenu={handleNodeContextMenu}
        onEdgeContextMenu={handleEdgeContextMenu}
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
        snapToGrid
        snapGrid={[15, 15]}
        defaultEdgeOptions={{
          type: 'custom',
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
