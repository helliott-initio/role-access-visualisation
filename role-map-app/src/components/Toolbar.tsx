import { useState, useRef, useEffect } from 'react';
import type { RoleMap } from '../types';
import type { SaveStatus } from '../hooks/useFileHandle';
import { ConfirmDialog } from './ConfirmDialog';

interface ToolbarProps {
  maps: RoleMap[];
  activeMapId: string;
  activeMapDomain: string;
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
  saveStatus: SaveStatus;
  saveError: string | null;
  isFileSystemSupported: boolean;
  onSaveNow: () => void;
}

function SaveStatusIndicator({ status, error }: { status: SaveStatus; error: string | null }) {
  switch (status) {
    case 'saving':
      return (
        <span className="hdr-save-status hdr-save-saving">
          <span className="hdr-save-dot" />
          Saving
        </span>
      );
    case 'saved':
      return (
        <span className="hdr-save-status hdr-save-saved">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 6.5L4.5 9L10 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Saved
        </span>
      );
    case 'unsaved':
      return (
        <span className="hdr-save-status hdr-save-unsaved">
          <span className="hdr-unsaved-dot" />
          Unsaved
        </span>
      );
    case 'error':
      return (
        <span className="hdr-save-status hdr-save-error" title={error || undefined}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.2"/>
            <path d="M6 3.5V6.5M6 8V8.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
          Error
        </span>
      );
    default:
      return null;
  }
}

/* Dropdown menu for overflow actions */
function DropdownMenu({ children, label, icon }: { children: React.ReactNode; label: string; icon: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div className="hdr-dropdown" ref={ref}>
      <button
        className="hdr-btn hdr-btn-ghost"
        onClick={() => setOpen(!open)}
        title={label}
        aria-expanded={open}
      >
        {icon}
        <span className="hdr-btn-label">{label}</span>
        <svg className="hdr-chevron" width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d="M2.5 4L5 6.5L7.5 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      {open && (
        <div className="hdr-dropdown-menu" onClick={() => setOpen(false)}>
          {children}
        </div>
      )}
    </div>
  );
}

export function Toolbar({
  maps,
  activeMapId,
  activeMapDomain,
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
  saveStatus,
  saveError,
  isFileSystemSupported,
  onSaveNow,
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

  const [deleteMapConfirm, setDeleteMapConfirm] = useState<{ id: string; name: string } | null>(null);
  const canDelete = maps.length > 1;

  return (
    <header className="hdr">
      {/* Top bar: brand + file status + view controls */}
      <div className="hdr-top">
        <div className="hdr-brand">
          <div className="hdr-logo">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <rect x="2" y="3" width="20" height="18" rx="3" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M8 3V21" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M12 8H18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M12 12H18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M12 16H16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <div className="hdr-titles">
            <h1 className="hdr-title">Role Access</h1>
            <span className="hdr-domain">{activeMapDomain}</span>
          </div>
        </div>

        {/* File indicator — center of top bar */}
        {isFileSystemSupported && (
          <div className="hdr-file">
            {fileName ? (
              <div className="hdr-file-active">
                <svg className="hdr-file-icon" width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M3 1.5H8.5L11 4V12.5H3V1.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
                  <path d="M8.5 1.5V4H11" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
                </svg>
                <span className="hdr-file-name">{fileName}</span>
                <SaveStatusIndicator status={saveStatus} error={saveError} />
                <button className="hdr-file-save" onClick={onSaveNow} title="Save now (Ctrl+S)">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2 1H8.5L11 3.5V10C11 10.5 10.5 11 10 11H2C1.5 11 1 10.5 1 10V2C1 1.5 1.5 1 2 1Z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round"/>
                    <path d="M3 1V4H8V1" stroke="currentColor" strokeWidth="1.1"/>
                    <path d="M3 11V7H9V11" stroke="currentColor" strokeWidth="1.1"/>
                  </svg>
                </button>
                <button className="hdr-file-close" onClick={onCloseFile} title="Close file">
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M2 2L8 8M8 2L2 8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>
            ) : (
              <div className="hdr-file-actions">
                <button className="hdr-btn hdr-btn-file" onClick={onOpenFile} title="Open a .json file for live editing">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M2 4.5L2 11.5H12V4.5L9.5 4.5L8.5 3H5.5L4.5 4.5H2Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
                  </svg>
                  Open
                </button>
                <button className="hdr-btn hdr-btn-file" onClick={onNewFile} title="Save to a new .json file">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M3 1.5H8.5L11 4V12.5H3V1.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
                    <path d="M7 6V10M5 8H9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                  </svg>
                  New
                </button>
              </div>
            )}
          </div>
        )}

        {/* Right: view toggle + data actions */}
        <div className="hdr-actions">
          <label className="hdr-toggle">
            <input
              type="checkbox"
              checked={showSecondaryRoles}
              onChange={onToggleSecondaryRoles}
            />
            <span className="hdr-toggle-track">
              <span className="hdr-toggle-thumb" />
            </span>
            <span className="hdr-toggle-label">Secondary Roles</span>
          </label>

          <span className="hdr-sep" />

          <DropdownMenu
            label="Data"
            icon={
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M11 7.5V11.5H3V7.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M7 2V8.5M7 8.5L4.5 6M7 8.5L9.5 6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            }
          >
            <button className="hdr-dropdown-item" onClick={onSaveData}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M11 7.5V11.5H3V7.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M7 2V8.5M7 8.5L4.5 6M7 8.5L9.5 6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Download JSON
            </button>
            <button className="hdr-dropdown-item" onClick={handleLoadFile}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M11 6.5V2.5H3V6.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M7 12V5.5M7 5.5L4.5 8M7 5.5L9.5 8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Import JSON
            </button>
            <div className="hdr-dropdown-divider" />
            <button className="hdr-dropdown-item" onClick={onExportPDF}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <rect x="2.5" y="1.5" width="9" height="11" rx="1" stroke="currentColor" strokeWidth="1.2"/>
                <path d="M5 5H9M5 7.5H9M5 10H7.5" stroke="currentColor" strokeWidth="1.0" strokeLinecap="round"/>
              </svg>
              Export PDF
            </button>
          </DropdownMenu>
        </div>
      </div>

      {/* Bottom bar: map tabs + add actions */}
      <div className="hdr-bottom">
        <nav className="hdr-tabs">
          {maps.map((map) => (
            <div
              key={map.id}
              className={`hdr-tab ${activeMapId === map.id ? 'hdr-tab-active' : ''}`}
            >
              <button
                className="hdr-tab-btn"
                onClick={() => onMapChange(map.id)}
              >
                {map.name}
              </button>
              {canDelete && (
                <button
                  className="hdr-tab-x"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteMapConfirm({ id: map.id, name: map.name });
                  }}
                  title={`Delete ${map.name}`}
                >
                  <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                    <path d="M1.5 1.5L6.5 6.5M6.5 1.5L1.5 6.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                  </svg>
                </button>
              )}
            </div>
          ))}
          <button className="hdr-tab-add" onClick={onAddMap} title="New map">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M6 2V10M2 6H10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
          </button>
        </nav>

        <div className="hdr-add-actions">
          <button className="hdr-btn hdr-btn-add" onClick={onAddGroup}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect x="2" y="3" width="10" height="8" rx="2" stroke="currentColor" strokeWidth="1.2"/>
              <path d="M7 5.5V8.5M5.5 7H8.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
            <span className="hdr-btn-label">Add Group</span>
          </button>
          <button className="hdr-btn hdr-btn-add" onClick={onAddSection}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect x="1.5" y="2" width="11" height="10" rx="2" stroke="currentColor" strokeWidth="1.2" strokeDasharray="3 2"/>
              <path d="M7 5V9M5 7H9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
            <span className="hdr-btn-label">Add Section</span>
          </button>
        </div>
      </div>

      {deleteMapConfirm && (
        <ConfirmDialog
          title="Delete Map"
          message={`Delete "${deleteMapConfirm.name}" map? This cannot be undone.`}
          confirmLabel="Delete Map"
          onConfirm={() => {
            onDeleteMap(deleteMapConfirm.id);
            setDeleteMapConfirm(null);
          }}
          onCancel={() => setDeleteMapConfirm(null)}
        />
      )}
    </header>
  );
}
