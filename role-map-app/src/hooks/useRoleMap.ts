import { useState, useCallback, useEffect, useRef } from 'react';
import type { RoleMap, RoleGroup, Section, AppState, MapConnection, TextAnnotation } from '../types';
import { simpleStarterMap } from '../data/simpleStarterMap';
import { useUndoRedo } from './useUndoRedo';

const STORAGE_KEY = 'role-map-data';

const emptyMap: RoleMap = {
  id: 'empty-map',
  name: 'Role Map',
  domain: 'yourdomain.org',
  rootGroupId: 'allstaff',
  sections: [],
  groups: [
    {
      id: 'allstaff',
      email: 'allstaff@yourdomain.org',
      label: 'All Staff',
      parentId: null,
      sectionId: 'root',
    },
  ],
};

const initialState: AppState = {
  maps: [emptyMap],
  activeMapId: emptyMap.id,
  showSecondaryRoles: true,
  selectedNodeId: null,
  isFirstLaunch: true,
};

export function useRoleMap() {
  const [state, setState] = useState<AppState>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        return { ...parsed, isFirstLaunch: false };
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

  // Undo/redo history — tracks AppState snapshots
  const { pushState, endBatch, undo: undoState, redo: redoState, canUndo, canRedo, clearHistory } = useUndoRedo<AppState>();

  // Ref to read current state without closure staleness
  const stateRef = useRef(state);
  stateRef.current = state;

  // Flag to suppress history recording during undo/redo sync
  const isUndoingRef = useRef(false);

  /** Push current state to history, then apply a mutation.
   *  Only snapshots data-model fields (maps, activeMapId) — UI state
   *  like selectedNodeId and showSecondaryRoles is excluded from undo. */
  const mutate = useCallback((updater: (prev: AppState) => AppState, batch = false) => {
    // Don't record history for position changes triggered by undo/redo sync
    if (isUndoingRef.current) {
      setState(updater);
      return;
    }
    if (!batch) endBatch();
    const { selectedNodeId: _, isFirstLaunch: __, showSecondaryRoles: ___, ...dataSnapshot } = stateRef.current;
    pushState({ ...dataSnapshot, selectedNodeId: null, isFirstLaunch: false, showSecondaryRoles: true } as AppState, batch);
    setState(updater);
  }, [pushState, endBatch]);

  // Incremented on each undo/redo to signal canvas to force-sync positions
  const [undoGeneration, setUndoGeneration] = useState(0);

  const undo = useCallback(() => {
    endBatch();
    const restored = undoState(stateRef.current);
    if (restored) {
      isUndoingRef.current = true;
      const current = stateRef.current;
      setState({
        ...restored,
        selectedNodeId: current.selectedNodeId,
        isFirstLaunch: current.isFirstLaunch,
        showSecondaryRoles: current.showSecondaryRoles,
      });
      setUndoGeneration(g => g + 1);
      // Clear flag after React processes the state update
      setTimeout(() => { isUndoingRef.current = false; }, 100);
    }
  }, [undoState, endBatch]);

  const redo = useCallback(() => {
    endBatch();
    const restored = redoState(stateRef.current);
    if (restored) {
      isUndoingRef.current = true;
      const current = stateRef.current;
      setState({
        ...restored,
        selectedNodeId: current.selectedNodeId,
        isFirstLaunch: current.isFirstLaunch,
        showSecondaryRoles: current.showSecondaryRoles,
      });
      setUndoGeneration(g => g + 1);
      setTimeout(() => { isUndoingRef.current = false; }, 100);
    }
  }, [redoState, endBatch]);

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
    mutate((prev) => ({
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
  }, [mutate]);

  const deleteGroup = useCallback((groupId: string) => {
    mutate((prev) => ({
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
  }, [mutate]);

  const duplicateGroup = useCallback((groupId: string): string | null => {
    let newId: string | null = null;
    mutate((prev) => {
      const map = prev.maps.find((m) => m.id === prev.activeMapId);
      if (!map) return prev;
      const source = map.groups.find((g) => g.id === groupId);
      if (!source) return prev;

      newId = `group-${crypto.randomUUID().slice(0, 8)}`;
      const newGroup: RoleGroup = {
        ...source,
        id: newId,
        parentId: null,
        edgeLabel: undefined,
        edgeStyle: undefined,
        sourceHandle: undefined,
        targetHandle: undefined,
        position: source.position
          ? { x: source.position.x + 40, y: source.position.y + 40 }
          : undefined,
      };

      return {
        ...prev,
        selectedNodeId: newId,
        maps: prev.maps.map((m) =>
          m.id !== prev.activeMapId ? m : { ...m, groups: [...m.groups, newGroup] }
        ),
      };
    });
    return newId;
  }, [mutate]);

  const duplicateSection = useCallback((sectionId: string): string | null => {
    let newSectionId: string | null = null;
    mutate((prev) => {
      const map = prev.maps.find((m) => m.id === prev.activeMapId);
      if (!map) return prev;
      const sourceSection = map.sections.find((s) => s.id === sectionId);
      if (!sourceSection) return prev;

      newSectionId = `section-dup-${crypto.randomUUID().slice(0, 8)}`;

      // Duplicate the section itself (explicitly copy size)
      const newSection: Section = {
        ...sourceSection,
        id: newSectionId,
        name: sourceSection.name + ' (Copy)',
        collapsed: false,
        position: sourceSection.position
          ? { x: sourceSection.position.x + 50, y: sourceSection.position.y + 50 }
          : undefined,
        size: sourceSection.size
          ? { width: sourceSection.size.width, height: sourceSection.size.height }
          : undefined,
      };

      // Collect child departments
      const childDepts = map.sections.filter((s) => s.parentSectionId === sectionId);

      // Build old→new section ID map
      const sectionIdMap = new Map<string, string>();
      sectionIdMap.set(sectionId, newSectionId);
      const newDepts: Section[] = childDepts.map((dept) => {
        const newDeptId = `section-dup-${crypto.randomUUID().slice(0, 8)}`;
        sectionIdMap.set(dept.id, newDeptId);
        return {
          ...dept,
          id: newDeptId,
          name: dept.name + ' (Copy)',
          collapsed: false,
          parentSectionId: newSectionId,
          position: dept.position
            ? { x: dept.position.x, y: dept.position.y }
            : undefined,
          size: dept.size
            ? { width: dept.size.width, height: dept.size.height }
            : undefined,
        };
      });

      // Collect all section IDs to duplicate groups from (parent + departments)
      const sourceSectionIds = new Set([sectionId, ...childDepts.map((d) => d.id)]);

      // Duplicate groups, building old→new group ID map
      const groupIdMap = new Map<string, string>();
      const sourceGroups = map.groups.filter((g) => sourceSectionIds.has(g.sectionId));
      sourceGroups.forEach((g) => {
        groupIdMap.set(g.id, `group-${crypto.randomUUID().slice(0, 8)}`);
      });

      const newGroups: RoleGroup[] = sourceGroups.map((g) => {
        const newGroupId = groupIdMap.get(g.id)!;
        const newSectionForGroup = sectionIdMap.get(g.sectionId) || g.sectionId;

        // Remap parentId if it's within the duplicated set, otherwise clear
        let newParentId: string | null = null;
        let edgeLabel = undefined as string | undefined;
        let edgeStyle = undefined as RoleGroup['edgeStyle'];
        let sourceHandle = undefined as string | undefined;
        let targetHandle = undefined as string | undefined;

        if (g.parentId && groupIdMap.has(g.parentId)) {
          newParentId = groupIdMap.get(g.parentId)!;
          edgeLabel = g.edgeLabel;
          edgeStyle = g.edgeStyle;
          sourceHandle = g.sourceHandle;
          targetHandle = g.targetHandle;
        }

        return {
          ...g,
          id: newGroupId,
          sectionId: newSectionForGroup,
          parentId: newParentId,
          edgeLabel,
          edgeStyle,
          sourceHandle,
          targetHandle,
          position: g.position
            ? { x: g.position.x, y: g.position.y }
            : undefined,
        };
      });

      // Insert new sections before secondary-roles
      const newSections = [...map.sections];
      const secondaryIndex = newSections.findIndex((s) => s.id === 'secondary-roles');
      const insertAt = secondaryIndex >= 0 ? secondaryIndex : newSections.length;
      newSections.splice(insertAt, 0, newSection, ...newDepts);

      return {
        ...prev,
        selectedNodeId: `section-${newSectionId}`,
        maps: prev.maps.map((m) =>
          m.id !== prev.activeMapId
            ? m
            : { ...m, sections: newSections, groups: [...m.groups, ...newGroups] }
        ),
      };
    });
    return newSectionId;
  }, [mutate]);

  const updateSection = useCallback((updatedSection: Section) => {
    mutate((prev) => ({
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
  }, [mutate]);

  const deleteSection = useCallback((sectionId: string) => {
    mutate((prev) => ({
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
  }, [mutate]);

  const toggleSectionCollapse = useCallback((sectionId: string) => {
    mutate((prev) => ({
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
  }, [mutate]);

  // Position updates use setState directly — no undo history entries.
  // Positions are captured in the pre-mutation snapshot of structural changes,
  // and restored by the undo sync via undoGeneration.
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
    mutate((prev) => ({
      ...prev,
      maps: prev.maps.map((map) => {
        if (map.id !== prev.activeMapId) return map;
        return {
          ...map,
          groups: map.groups.map((g) => ({ ...g, position: undefined })),
        };
      }),
    }));
  }, [mutate]);

  const reparentGroup = useCallback((
    childId: string,
    newParentId: string | null,
    sourceHandle?: string,
    targetHandle?: string
  ) => {
    mutate((prev) => ({
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
  }, [mutate]);

  const updateEdgeStyle = useCallback((groupId: string, edgeLabel?: string, edgeStyle?: RoleGroup['edgeStyle']) => {
    mutate((prev) => ({
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
  }, [mutate]);

  const addConnection = useCallback((connection: MapConnection) => {
    mutate((prev) => ({
      ...prev,
      maps: prev.maps.map((map) => {
        if (map.id !== prev.activeMapId) return map;
        const existing = map.connections || [];
        return { ...map, connections: [...existing, connection] };
      }),
    }));
  }, [mutate]);

  const removeConnection = useCallback((connectionId: string) => {
    mutate((prev) => ({
      ...prev,
      maps: prev.maps.map((map) => {
        if (map.id !== prev.activeMapId) return map;
        return {
          ...map,
          connections: (map.connections || []).filter((c) => c.id !== connectionId),
        };
      }),
    }));
  }, [mutate]);

  const updateConnectionStyle = useCallback((connectionId: string, label?: string, style?: MapConnection['style']) => {
    mutate((prev) => ({
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
  }, [mutate]);

  const updateMapPrefix = useCallback((mapId: string, newPrefix: string) => {
    const trimmed = newPrefix.trim().toLowerCase();
    mutate((prev) => {
      const map = prev.maps.find(m => m.id === mapId);
      if (!map) return prev;
      const oldPrefix = (map.prefix || '').toLowerCase();

      const rewriteEmail = (email: string): string => {
        const [local, domain] = email.includes('@') ? email.split('@') : [email, ''];
        // Remove old prefix if present
        const stripped = oldPrefix && local.toLowerCase().startsWith(oldPrefix)
          ? local.slice(oldPrefix.length)
          : local;
        // Add new prefix
        const newLocal = trimmed ? `${trimmed}${stripped}` : stripped;
        return domain ? `${newLocal}@${domain}` : newLocal;
      };

      return {
        ...prev,
        maps: prev.maps.map((m) => {
          if (m.id !== mapId) return m;
          return {
            ...m,
            prefix: trimmed || undefined,
            groups: m.groups.map((g) => ({
              ...g,
              email: rewriteEmail(g.email),
              alias: g.alias ? rewriteEmail(g.alias) : g.alias,
            })),
            sections: m.sections.map((s) => ({
              ...s,
              email: s.email ? rewriteEmail(s.email) : s.email,
            })),
          };
        }),
      };
    });
  }, [mutate]);

  const renameMap = useCallback((mapId: string, newName: string) => {
    mutate((prev) => ({
      ...prev,
      maps: prev.maps.map((m) => m.id === mapId ? { ...m, name: newName } : m),
    }));
  }, [mutate]);

  const updateMapDomain = useCallback((mapId: string, newDomain: string) => {
    const trimmed = newDomain.trim();
    if (!trimmed) return;
    mutate((prev) => ({
      ...prev,
      maps: prev.maps.map((m) => {
        if (m.id !== mapId) return m;
        return {
          ...m,
          domain: trimmed,
          groups: m.groups.map((g) => ({
            ...g,
            email: g.email.includes('@')
              ? `${g.email.split('@')[0]}@${trimmed}`
              : `${g.email}@${trimmed}`,
            alias: g.alias && g.alias.includes('@')
              ? `${g.alias.split('@')[0]}@${trimmed}`
              : g.alias,
          })),
          sections: m.sections.map((s) => ({
            ...s,
            email: s.email
              ? (s.email.includes('@')
                ? `${s.email.split('@')[0]}@${trimmed}`
                : `${s.email}@${trimmed}`)
              : s.email,
          })),
        };
      }),
    }));
  }, [mutate]);

  const addMap = useCallback((map: RoleMap) => {
    mutate((prev) => ({
      ...prev,
      maps: [...prev.maps, map],
      activeMapId: map.id,
    }));
  }, [mutate]);

  const deleteMap = useCallback((mapId: string) => {
    mutate((prev) => {
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
  }, [mutate]);

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
    clearHistory();
    setState(initialState);
    localStorage.removeItem(STORAGE_KEY);
  }, [clearHistory]);

  const dismissWelcome = useCallback(() => {
    setState((prev) => ({ ...prev, isFirstLaunch: false }));
  }, []);

  const loadStarterMap = useCallback(() => {
    clearHistory();
    setState({
      maps: [simpleStarterMap],
      activeMapId: simpleStarterMap.id,
      showSecondaryRoles: true,
      selectedNodeId: null,
      isFirstLaunch: false,
    });
  }, [clearHistory]);

  const addTextAnnotation = useCallback((annotation: TextAnnotation) => {
    mutate((prev) => ({
      ...prev,
      maps: prev.maps.map((map) => {
        if (map.id !== prev.activeMapId) return map;
        return { ...map, textAnnotations: [...(map.textAnnotations || []), annotation] };
      }),
    }));
  }, [mutate]);

  const updateTextAnnotation = useCallback((id: string, updates: Partial<TextAnnotation>) => {
    mutate((prev) => ({
      ...prev,
      maps: prev.maps.map((map) => {
        if (map.id !== prev.activeMapId) return map;
        return {
          ...map,
          textAnnotations: (map.textAnnotations || []).map((t) =>
            t.id === id ? { ...t, ...updates } : t
          ),
        };
      }),
    }), true);
  }, [mutate]);

  const deleteTextAnnotation = useCallback((id: string) => {
    mutate((prev) => ({
      ...prev,
      maps: prev.maps.map((map) => {
        if (map.id !== prev.activeMapId) return map;
        return {
          ...map,
          textAnnotations: (map.textAnnotations || []).filter((t) => t.id !== id),
        };
      }),
    }));
  }, [mutate]);

  return {
    state,
    activeMap,
    setActiveMap,
    toggleSecondaryRoles,
    setSelectedNode,
    updateGroup,
    deleteGroup,
    duplicateGroup,
    duplicateSection,
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
    renameMap,
    updateMapDomain,
    updateMapPrefix,
    addMap,
    deleteMap,
    exportData,
    importData,
    loadMaps,
    resetToDefault,
    dismissWelcome,
    loadStarterMap,
    addTextAnnotation,
    updateTextAnnotation,
    deleteTextAnnotation,
    undo,
    redo,
    canUndo,
    canRedo,
    endBatch,
    undoGeneration,
  };
}
