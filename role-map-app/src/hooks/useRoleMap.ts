import { useState, useCallback, useEffect } from 'react';
import type { RoleMap, RoleGroup, Section, AppState } from '../types';
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
        // Also update any groups that had this as parent
        const newGroups = map.groups
          .filter((g) => g.id !== groupId)
          .map((g) => {
            if (g.parentId === groupId) {
              return { ...g, parentId: null };
            }
            if (g.supplementsRoles?.includes(groupId)) {
              return {
                ...g,
                supplementsRoles: g.supplementsRoles.filter((r) => r !== groupId),
              };
            }
            return g;
          });
        return { ...map, groups: newGroups };
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
        return {
          ...map,
          sections: map.sections.filter((s) => s.id !== sectionId),
          groups: map.groups.filter((g) => g.sectionId !== sectionId),
        };
      }),
    }));
  }, []);

  const toggleSectionCollapse = useCallback((sectionId: string) => {
    setState((prev) => ({
      ...prev,
      maps: prev.maps.map((map) => {
        if (map.id !== prev.activeMapId) return map;
        return {
          ...map,
          sections: map.sections.map((s) =>
            s.id === sectionId ? { ...s, collapsed: !s.collapsed } : s
          ),
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
      const maps = JSON.parse(jsonString) as RoleMap[];
      setState((prev) => ({
        ...prev,
        maps,
        activeMapId: maps[0]?.id || prev.activeMapId,
      }));
      return true;
    } catch {
      return false;
    }
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
    addMap,
    deleteMap,
    exportData,
    importData,
    resetToDefault,
  };
}
