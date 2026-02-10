import type { RoleMap } from '../types';

interface ToolbarProps {
  maps: RoleMap[];
  activeMapId: string;
  showSecondaryRoles: boolean;
  onMapChange: (mapId: string) => void;
  onToggleSecondaryRoles: () => void;
  onAddGroup: () => void;
  onAddSection: () => void;
  onExportPDF: () => void;
  onAddMap: () => void;
  onDeleteMap: (mapId: string) => void;
  onSaveData: () => void;
  onLoadData: (json: string) => boolean;
  // File System Access API props
  onOpenFile: () => void;
  onNewFile: () => void;
  onCloseFile: () => void;
  fileName: string | null;
  lastFileName: string | null;
  needsReopen: boolean;
  isSaving: boolean;
  saveError: string | null;
  isFileSystemSupported: boolean;
}

export function Toolbar({
  maps,
  activeMapId,
  showSecondaryRoles,
  onMapChange,
  onToggleSecondaryRoles,
  onAddGroup,
  onAddSection,
  onExportPDF,
  onAddMap,
  onDeleteMap,
  onSaveData,
  onLoadData,
  onOpenFile,
  onNewFile,
  onCloseFile,
  fileName,
  lastFileName: _lastFileName,
  needsReopen: _needsReopen,
  isSaving,
  saveError,
  isFileSystemSupported,
}: ToolbarProps) {
  const handleLoadFile = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const json = event.target?.result as string;
          const success = onLoadData(json);
          if (!success) {
            alert('Invalid file format. Please select a valid role map JSON file.');
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };
  const canDelete = maps.length > 1;

  return (
    <div className="toolbar">
      <div className="toolbar-left">
        <div className="map-tabs">
          {maps.map((map) => (
            <div
              key={map.id}
              className={`tab-wrapper ${activeMapId === map.id ? 'active' : ''}`}
            >
              <button
                className={`tab-btn ${activeMapId === map.id ? 'active' : ''}`}
                onClick={() => onMapChange(map.id)}
              >
                {map.name}
              </button>
              {canDelete && (
                <button
                  className="tab-delete-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`Delete "${map.name}" map?`)) {
                      onDeleteMap(map.id);
                    }
                  }}
                  title={`Delete ${map.name}`}
                >
                  &times;
                </button>
              )}
            </div>
          ))}
          <button
            className="tab-btn add-tab"
            title="Add new map"
            onClick={onAddMap}
          >
            +
          </button>
        </div>
      </div>

      <div className="toolbar-center">
        <button className="toolbar-btn" onClick={onAddGroup} title="Add new role group">
          <span className="btn-icon">+</span>
          Add Group
        </button>
        <button className="toolbar-btn" onClick={onAddSection} title="Add new section">
          <span className="btn-icon">+</span>
          Add Section
        </button>
      </div>

      <div className="toolbar-right">
        {isFileSystemSupported && (
          <>
            {fileName ? (
              <span className="file-indicator" title={saveError || undefined}>
                <span className="file-name">{fileName}</span>
                {isSaving && <span className="save-status">Saving...</span>}
                {saveError && <span className="save-status error">Error</span>}
                {!isSaving && !saveError && <span className="save-status ok">Saved</span>}
                <button
                  className="file-close-btn"
                  onClick={onCloseFile}
                  title="Close file (revert to local storage)"
                >
                  &times;
                </button>
              </span>
            ) : (
              <>
                <button className="toolbar-btn" onClick={onOpenFile} title="Open a .json file for live editing">
                  <span className="btn-icon">📁</span>
                  Open File
                </button>
                <button className="toolbar-btn" onClick={onNewFile} title="Create a new .json file">
                  <span className="btn-icon">📄</span>
                  New File
                </button>
              </>
            )}
            <span className="toolbar-divider" />
          </>
        )}

        <label className="toggle-label">
          <input
            type="checkbox"
            checked={showSecondaryRoles}
            onChange={onToggleSecondaryRoles}
          />
          <span className="toggle-text">Show Secondary Roles</span>
        </label>
        <button className="toolbar-btn" onClick={onSaveData} title="Download as JSON (manual backup)">
          <span className="btn-icon">💾</span>
          Save
        </button>
        <button className="toolbar-btn" onClick={handleLoadFile} title="Load data from JSON file">
          <span className="btn-icon">📂</span>
          Load
        </button>
        <button className="toolbar-btn export-btn" onClick={onExportPDF}>
          <span className="btn-icon">📄</span>
          Export PDF
        </button>
      </div>
    </div>
  );
}
