import { useState, useCallback, useEffect } from 'react';
import type { RoleMap, RoleGroup, Section, AppState, MapConnection } from '../types';
import { simpleStarterMap } from '../data/simpleStarterMap';

const STORAGE_KEY = 'role-map-data';

const initialState: AppState = {
  maps: [simpleStarterMap],
  activeMapId: simpleStarterMap.id,
  showSecondaryRoles: true,
  selectedNodeId: null,
};

export function useRoleMap() {
  const [state, setState] = useState<AppState>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return initialState;
      }
    }
    return initialState;
  });

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const activeMap = state.maps.find((m) => m.id === state.activeMapId) || state.maps[0];

  const setActiveMap = useCallback((mapId: string) => {
    setState((prev) => ({ ...prev, activeMapId: mapId }));
  }, []);

  const toggleSecondaryRoles = useCallback(() => {
    setState((prev) => ({ ...prev, showSecondaryRoles: !prev.showSecondaryRoles }));
  }, []);

  const setSelectedNode = useCallback((nodeId: string | null) => {
    setState((prev) => ({ ...prev, selectedNodeId: nodeId }));
  }, []);

  const updateGroup = useCallback((updatedGroup: RoleGroup) => {
    setState((prev) => ({
      ...prev,
      maps: prev.maps.map((map) => {
        if (map.id !== prev.activeMapId) return map;
        const existingIndex = map.groups.findIndex((g) => g.id === updatedGroup.id);
        if (existingIndex >= 0) {
          const newGroups = [...map.groups];
          newGroups[existingIndex] = updatedGroup;
          return { ...map, groups: newGroups };
        } else {
          return { ...map, groups: [...map.groups, updatedGroup] };
        }
      }),
    }));
  }, []);

  const deleteGroup = useCallback((groupId: string) => {
    setState((prev) => ({
      ...prev,
      selectedNodeId: null,
      maps: prev.maps.map((map) => {
        if (map.id !== prev.activeMapId) return map;
        // Clean up all references to the deleted group
        const newGroups = map.groups
          .filter((g) => g.id !== groupId)
          .map((g) => {
            let updated = g;
            // Clear parent reference and orphaned handle data
            if (g.parentId === groupId) {
              updated = { ...updated, parentId: null, sourceHandle: undefined, targetHandle: undefined };
            }
            // Clear from supplementsRoles
            if (g.supplementsRoles?.includes(groupId)) {
              updated = {
                ...updated,
                supplementsRoles: g.supplementsRoles.filter((r) => r !== groupId),
              };
            }
            return updated;
          });
        // Also remove standalone connections referencing the deleted group
        const newConnections = (map.connections || []).filter(
          (c) => c.source !== groupId && c.target !== groupId
        );
        return { ...map, groups: newGroups, connections: newConnections };
      }),
    }));
  }, []);

  const updateSection = useCallback((updatedSection: Section) => {
    setState((prev) => ({
      ...prev,
      maps: prev.maps.map((map) => {
        if (map.id !== prev.activeMapId) return map;
        const existingIndex = map.sections.findIndex((s) => s.id === updatedSection.id);
        if (existingIndex >= 0) {
          const newSections = [...map.sections];
          newSections[existingIndex] = updatedSection;
          return { ...map, sections: newSections };
        } else {
          // Insert before secondary-roles section
          const secondaryIndex = map.sections.findIndex((s) => s.id === 'secondary-roles');
          const newSections = [...map.sections];
          if (secondaryIndex >= 0) {
            newSections.splice(secondaryIndex, 0, updatedSection);
          } else {
            newSections.push(updatedSection);
          }
          return { ...map, sections: newSections };
        }
      }),
    }));
  }, []);

  const deleteSection = useCallback((sectionId: string) => {
    setState((prev) => ({
      ...prev,
      maps: prev.maps.map((map) => {
        if (map.id !== prev.activeMapId) return map;
        // Collect this section + all child sections (departments)
        const deletedSectionIds = new Set<string>([sectionId]);
        map.sections.forEach((s) => {
          if (s.parentSectionId === sectionId) {
            deletedSectionIds.add(s.id);
          }
        });
        // Get IDs of groups being deleted with these sections
        const deletedGroupIds = new Set(
          map.groups.filter(g => deletedSectionIds.has(g.sectionId)).map(g => g.id)
        );
        // Remove groups in deleted sections and clean up references from surviving groups
        const survivingGroups = map.groups
          .filter((g) => !deletedSectionIds.has(g.sectionId))
          .map((g) => {
            let updated = g;
            // Clear parent reference if parent was in deleted section
            if (g.parentId && deletedGroupIds.has(g.parentId)) {
              updated = { ...updated, parentId: null, sourceHandle: undefined, targetHandle: undefined };
            }
            // Clear from supplementsRoles
            if (g.supplementsRoles?.some(r => deletedGroupIds.has(r))) {
              updated = {
                ...updated,
                supplementsRoles: g.supplementsRoles!.filter(r => !deletedGroupIds.has(r)),
              };
            }
            return updated;
          });
        // Remove standalone connections referencing deleted groups or sections
        const deletedSectionNodeIds = new Set([...deletedSectionIds].map(id => `section-${id}`));
        const newConnections = (map.connections || []).filter(
          (c) => !deletedGroupIds.has(c.source) && !deletedGroupIds.has(c.target)
            && !deletedSectionNodeIds.has(c.source) && !deletedSectionNodeIds.has(c.target)
        );
        return {
          ...map,
          sections: map.sections.filter((s) => !deletedSectionIds.has(s.id)),
          groups: survivingGroups,
          connections: newConnections,
        };
      }),
    }));
  }, []);

  const toggleSectionCollapse = useCallback((sectionId: string) => {
    setState((prev) => ({
      ...prev,
      maps: prev.maps.map((map) => {
        if (map.id !== prev.activeMapId) return map;
        const target = map.sections.find((s) => s.id === sectionId);
        if (!target) return map;
        const willCollapse = !target.collapsed;
        return {
          ...map,
          sections: map.sections.map((s) => {
            if (s.id === sectionId) return { ...s, collapsed: willCollapse };
            // When collapsing a parent, also collapse all child sections
            if (willCollapse && s.parentSectionId === sectionId) {
              return { ...s, collapsed: true };
            }
            return s;
          }),
        };
      }),
    }));
  }, []);

  const updateGroupPosition = useCallback((groupId: string, position: { x: number; y: number }) => {
    setState((prev) => ({
      ...prev,
      maps: prev.maps.map((map) => {
        if (map.id !== prev.activeMapId) return map;
        return {
          ...map,
          groups: map.groups.map((g) => (g.id === groupId ? { ...g, position } : g)),
        };
      }),
    }));
  }, []);

  const updateSectionPosition = useCallback((sectionId: string, position: { x: number; y: number }, size?: { width: number; height: number }) => {
    setState((prev) => ({
      ...prev,
      maps: prev.maps.map((map) => {
        if (map.id !== prev.activeMapId) return map;
        return {
          ...map,
          sections: map.sections.map((s) =>
            s.id === sectionId
              ? { ...s, position, ...(size && { size }) }
              : s
          ),
        };
      }),
    }));
  }, []);

  const clearPositions = useCallback(() => {
    setState((prev) => ({
      ...prev,
      maps: prev.maps.map((map) => {
        if (map.id !== prev.activeMapId) return map;
        return {
          ...map,
          groups: map.groups.map((g) => ({ ...g, position: undefined })),
        };
      }),
    }));
  }, []);

  const reparentGroup = useCallback((
    childId: string,
    newParentId: string | null,
    sourceHandle?: string,
    targetHandle?: string
  ) => {
    setState((prev) => ({
      ...prev,
      maps: prev.maps.map((map) => {
        if (map.id !== prev.activeMapId) return map;
        return {
          ...map,
          groups: map.groups.map((g) =>
            g.id === childId
              ? {
                  ...g,
                  parentId: newParentId,
                  sourceHandle: newParentId ? sourceHandle : undefined,
                  targetHandle: newParentId ? targetHandle : undefined,
                }
              : g
          ),
        };
      }),
    }));
  }, []);

  const updateEdgeStyle = useCallback((groupId: string, edgeLabel?: string, edgeStyle?: RoleGroup['edgeStyle']) => {
    setState((prev) => ({
      ...prev,
      maps: prev.maps.map((map) => {
        if (map.id !== prev.activeMapId) return map;
        return {
          ...map,
          groups: map.groups.map((g) => {
            if (g.id !== groupId) return g;
            return {
              ...g,
              ...(edgeLabel !== undefined && { edgeLabel }),
              ...(edgeStyle !== undefined && { edgeStyle: { ...g.edgeStyle, ...edgeStyle } }),
            };
          }),
        };
      }),
    }));
  }, []);

  const addConnection = useCallback((connection: MapConnection) => {
    setState((prev) => ({
      ...prev,
      maps: prev.maps.map((map) => {
        if (map.id !== prev.activeMapId) return map;
        const existing = map.connections || [];
        return { ...map, connections: [...existing, connection] };
      }),
    }));
  }, []);

  const removeConnection = useCallback((connectionId: string) => {
    setState((prev) => ({
      ...prev,
      maps: prev.maps.map((map) => {
        if (map.id !== prev.activeMapId) return map;
        return {
          ...map,
          connections: (map.connections || []).filter((c) => c.id !== connectionId),
        };
      }),
    }));
  }, []);

  const updateConnectionStyle = useCallback((connectionId: string, label?: string, style?: MapConnection['style']) => {
    setState((prev) => ({
      ...prev,
      maps: prev.maps.map((map) => {
        if (map.id !== prev.activeMapId) return map;
        return {
          ...map,
          connections: (map.connections || []).map((c) => {
            if (c.id !== connectionId) return c;
            return {
              ...c,
              ...(label !== undefined && { label }),
              ...(style !== undefined && { style: { ...c.style, ...style } }),
            };
          }),
        };
      }),
    }));
  }, []);

  const addMap = useCallback((map: RoleMap) => {
    setState((prev) => ({
      ...prev,
      maps: [...prev.maps, map],
      activeMapId: map.id,
    }));
  }, []);

  const deleteMap = useCallback((mapId: string) => {
    setState((prev) => {
      // Don't delete if it's the only map
      if (prev.maps.length <= 1) return prev;

      const newMaps = prev.maps.filter((m) => m.id !== mapId);
      const newActiveId = prev.activeMapId === mapId
        ? newMaps[0]?.id || prev.activeMapId
        : prev.activeMapId;

      return {
        ...prev,
        maps: newMaps,
        activeMapId: newActiveId,
      };
    });
  }, []);

  const exportData = useCallback(() => {
    return JSON.stringify(state.maps, null, 2);
  }, [state.maps]);

  const importData = useCallback((jsonString: string) => {
    try {
      const parsed = JSON.parse(jsonString);
      // Validate basic structure
      const maps = Array.isArray(parsed) ? parsed : [parsed];
      const isValid = maps.every((m: unknown) => {
        if (!m || typeof m !== 'object') return false;
        const map = m as Record<string, unknown>;
        return (
          typeof map.id === 'string' &&
          typeof map.name === 'string' &&
          Array.isArray(map.sections) &&
          Array.isArray(map.groups)
        );
      });
      if (!isValid || maps.length === 0) return false;
      setState((prev) => ({
        ...prev,
        maps: maps as RoleMap[],
        activeMapId: (maps[0] as RoleMap).id || prev.activeMapId,
      }));
      return true;
    } catch {
      return false;
    }
  }, []);

  const loadMaps = useCallback((maps: RoleMap[]) => {
    setState((prev) => ({
      ...prev,
      maps,
      activeMapId: maps[0]?.id || prev.activeMapId,
    }));
  }, []);

  const resetToDefault = useCallback(() => {
    setState(initialState);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return {
    state,
    activeMap,
    setActiveMap,
    toggleSecondaryRoles,
    setSelectedNode,
    updateGroup,
    deleteGroup,
    updateSection,
    deleteSection,
    toggleSectionCollapse,
    updateGroupPosition,
    updateSectionPosition,
    clearPositions,
    reparentGroup,
    updateEdgeStyle,
    addConnection,
    removeConnection,
    updateConnectionStyle,
    addMap,
    deleteMap,
    exportData,
    importData,
    loadMaps,
    resetToDefault,
  };
}
