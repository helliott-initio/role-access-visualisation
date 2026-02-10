import { useState, useCallback } from 'react';
import { ReactFlowProvider } from '@xyflow/react';

import { useRoleMap } from './hooks/useRoleMap';
import { useFileHandle } from './hooks/useFileHandle';
import { RoleMapCanvas, exportToPDF } from './components/RoleMapCanvas';
import { Toolbar } from './components/Toolbar';
import { EditModal } from './components/EditModal';
import { SectionModal } from './components/SectionModal';
import { NewMapModal } from './components/NewMapModal';
import type { RoleGroup, Section, RoleMap } from './types';

import './App.css';

function App() {
  const {
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
    reparentGroup,
    updateEdgeStyle,
    addConnection,
    removeConnection,
    updateConnectionStyle,
    exportData,
    importData,
    loadMaps,
    addMap,
    deleteMap,
  } = useRoleMap();

  const {
    fileName,
    lastFileName,
    needsReopen,
    saveStatus,
    saveError,
    isSupported: isFileSystemSupported,
    openFile,
    newFile,
    closeFile,
  } = useFileHandle(state.maps);

  const [showEditModal, setShowEditModal] = useState(false);
  const [showSectionModal, setShowSectionModal] = useState(false);
  const [showNewMapModal, setShowNewMapModal] = useState(false);
  const [isNewGroup, setIsNewGroup] = useState(false);
  const [isNewSection, setIsNewSection] = useState(false);
  const [editingSection, setEditingSection] = useState<Section | null>(null);
  const [newGroupDefaults, setNewGroupDefaults] = useState<{ parentId?: string; sectionId?: string }>({});
  const [defaultParentSectionId, setDefaultParentSectionId] = useState<string | undefined>();

  const selectedGroup = state.selectedNodeId
    ? activeMap.groups.find((g) => g.id === state.selectedNodeId) || null
    : null;

  // Single click just selects, doesn't open modal
  const handleNodeSelect = useCallback(
    (nodeId: string | null) => {
      setSelectedNode(nodeId);
    },
    [setSelectedNode]
  );

  // Double click or edit action opens the modal
  const handleEditNode = useCallback(
    (nodeId: string) => {
      setSelectedNode(nodeId);
      setIsNewGroup(false);
      setNewGroupDefaults({});
      setShowEditModal(true);
    },
    [setSelectedNode]
  );

  const handleDeleteNode = useCallback(
    (nodeId: string) => {
      if (confirm('Are you sure you want to delete this role group?')) {
        deleteGroup(nodeId);
      }
    },
    [deleteGroup]
  );

  const handleAddGroup = useCallback((parentId?: string, sectionId?: string) => {
    setSelectedNode(null);
    setIsNewGroup(true);
    setNewGroupDefaults({ parentId, sectionId });
    setShowEditModal(true);
  }, [setSelectedNode]);

  const handleAddSection = useCallback(() => {
    setEditingSection(null);
    setIsNewSection(true);
    setDefaultParentSectionId(undefined);
    setShowSectionModal(true);
  }, []);

  const handleAddDepartment = useCallback((parentSectionId: string) => {
    setEditingSection(null);
    setIsNewSection(true);
    setDefaultParentSectionId(parentSectionId);
    setShowSectionModal(true);
  }, []);

  const handleEditSection = useCallback((sectionId: string) => {
    const section = activeMap.sections.find(s => s.id === sectionId);
    if (section) {
      setEditingSection(section);
      setIsNewSection(false);
      setShowSectionModal(true);
    }
  }, [activeMap.sections]);

  const handleDeleteSectionDirect = useCallback((sectionId: string) => {
    if (confirm('Are you sure? All groups in this section will also be deleted.')) {
      deleteSection(sectionId);
    }
  }, [deleteSection]);

  const handleSaveGroup = useCallback(
    (group: RoleGroup) => {
      // Apply defaults for new groups
      if (isNewGroup && newGroupDefaults.parentId && !group.parentId) {
        group = { ...group, parentId: newGroupDefaults.parentId };
      }
      if (isNewGroup && newGroupDefaults.sectionId && !group.sectionId) {
        group = { ...group, sectionId: newGroupDefaults.sectionId };
      }

      // Position new child groups below their parent with a bottom→top connection
      if (isNewGroup && group.parentId && !group.position) {
        const parent = activeMap.groups.find(g => g.id === group.parentId);
        if (parent?.position) {
          group = {
            ...group,
            position: { x: parent.position.x, y: parent.position.y + 120 },
            sourceHandle: 'bottom',
            targetHandle: 'top',
          };
        }
      }

      updateGroup(group);
      setShowEditModal(false);
      setSelectedNode(null);
      setNewGroupDefaults({});
    },
    [updateGroup, setSelectedNode, isNewGroup, newGroupDefaults, activeMap.groups]
  );

  const handleDeleteGroup = useCallback(
    (groupId: string) => {
      deleteGroup(groupId);
      setShowEditModal(false);
    },
    [deleteGroup]
  );

  const handleSaveSection = useCallback(
    (section: Section) => {
      updateSection(section);
      setShowSectionModal(false);
      setEditingSection(null);
    },
    [updateSection]
  );

  const handleDeleteSection = useCallback(
    (sectionId: string) => {
      deleteSection(sectionId);
      setShowSectionModal(false);
      setEditingSection(null);
    },
    [deleteSection]
  );

  const handleExportPDF = useCallback(() => {
    exportToPDF('role-map-canvas', `${activeMap.name}-role-map`);
  }, [activeMap.name]);

  const handleSaveData = useCallback(() => {
    const json = exportData();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'role-maps.json';
    a.click();
    URL.revokeObjectURL(url);
  }, [exportData]);

  const handleOpenFile = useCallback(async () => {
    const maps = await openFile();
    if (maps) {
      loadMaps(maps);
    }
  }, [openFile, loadMaps]);

  const handleNewFile = useCallback(async () => {
    await newFile(state.maps);
  }, [newFile, state.maps]);

  const handleReparent = useCallback(
    (childId: string, newParentId: string | null, sourceHandle?: string, targetHandle?: string) => {
      reparentGroup(childId, newParentId, sourceHandle, targetHandle);
    },
    [reparentGroup]
  );

  const handleAddMap = useCallback(() => {
    setShowNewMapModal(true);
  }, []);

  const handleSaveNewMap = useCallback(
    (map: RoleMap) => {
      addMap(map);
      setShowNewMapModal(false);
    },
    [addMap]
  );

  return (
    <div className="app">
      <header className="app-header">
        <h1>Role Access Visualisation</h1>
        <p className="domain-label">{activeMap.domain}</p>
      </header>

      <Toolbar
        maps={state.maps}
        activeMapId={state.activeMapId}
        showSecondaryRoles={state.showSecondaryRoles}
        onMapChange={setActiveMap}
        onToggleSecondaryRoles={toggleSecondaryRoles}
        onAddGroup={() => handleAddGroup()}
        onAddSection={handleAddSection}
        onExportPDF={handleExportPDF}
        onAddMap={handleAddMap}
        onDeleteMap={deleteMap}
        onSaveData={handleSaveData}
        onLoadData={importData}
        onOpenFile={handleOpenFile}
        onNewFile={handleNewFile}
        onCloseFile={closeFile}
        fileName={fileName}
        lastFileName={lastFileName}
        needsReopen={needsReopen}
        saveStatus={saveStatus}
        saveError={saveError}
        isFileSystemSupported={isFileSystemSupported}
      />

      {needsReopen && (
        <div className="reopen-banner">
          <span>You were editing <strong>{lastFileName}</strong> — re-open it to continue auto-saving.</span>
          <button className="reopen-btn" onClick={handleOpenFile}>
            Re-open File
          </button>
          <button className="reopen-dismiss" onClick={closeFile} title="Dismiss">
            &times;
          </button>
        </div>
      )}

      <main className="app-main" id="role-map-canvas">
        <ReactFlowProvider>
          <RoleMapCanvas
            map={activeMap}
            showSecondaryRoles={state.showSecondaryRoles}
            onNodeSelect={handleNodeSelect}
            onNodePositionChange={updateGroupPosition}
            onSectionPositionChange={updateSectionPosition}
            onEdgeStyleChange={updateEdgeStyle}
            onToggleSectionCollapse={toggleSectionCollapse}
            onReparent={handleReparent}
            onAddConnection={addConnection}
            onRemoveConnection={removeConnection}
            onUpdateConnectionStyle={updateConnectionStyle}
            onUpdateGroup={updateGroup}
            onEditNode={handleEditNode}
            onDeleteNode={handleDeleteNode}
            onAddGroup={handleAddGroup}
            onAddSection={handleAddSection}
            onEditSection={handleEditSection}
            onDeleteSection={handleDeleteSectionDirect}
            onAddDepartment={handleAddDepartment}
          />
        </ReactFlowProvider>
      </main>

      {showEditModal && (
        <EditModal
          group={isNewGroup ? null : selectedGroup}
          sections={activeMap.sections}
          allGroups={activeMap.groups}
          domain={activeMap.domain}
          onSave={handleSaveGroup}
          onDelete={handleDeleteGroup}
          onClose={() => {
            setShowEditModal(false);
            setSelectedNode(null);
            setNewGroupDefaults({});
          }}
          isNew={isNewGroup}
          defaultSectionId={newGroupDefaults.sectionId}
        />
      )}

      {showSectionModal && (
        <SectionModal
          section={isNewSection ? null : editingSection}
          sections={activeMap.sections}
          domain={activeMap.domain}
          onSave={handleSaveSection}
          onDelete={handleDeleteSection}
          onClose={() => {
            setShowSectionModal(false);
            setEditingSection(null);
            setDefaultParentSectionId(undefined);
          }}
          isNew={isNewSection}
          defaultParentSectionId={defaultParentSectionId}
        />
      )}

      {showNewMapModal && (
        <NewMapModal
          onSave={handleSaveNewMap}
          onClose={() => setShowNewMapModal(false)}
        />
      )}
    </div>
  );
}

export default App;
