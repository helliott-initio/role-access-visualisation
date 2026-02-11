interface WelcomeDialogProps {
  onCreateNew: () => void;
  onOpenFile: () => void;
  onLoadExample: () => void;
}

export function WelcomeDialog({ onCreateNew, onOpenFile, onLoadExample }: WelcomeDialogProps) {
  return (
    <div className="welcome-overlay">
      <div className="welcome-dialog">
        <div className="welcome-logo">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="5" r="3" />
            <line x1="12" y1="8" x2="12" y2="14" />
            <circle cx="6" cy="19" r="3" />
            <circle cx="18" cy="19" r="3" />
            <line x1="12" y1="14" x2="6" y2="16" />
            <line x1="12" y1="14" x2="18" y2="16" />
          </svg>
        </div>
        <h2 className="welcome-title">Role Map</h2>
        <p className="welcome-subtitle">Visualise your organisation's role hierarchy and access groups.</p>

        <div className="welcome-actions">
          <button className="welcome-btn welcome-btn-primary" onClick={onCreateNew}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="12" y1="18" x2="12" y2="12" />
              <line x1="9" y1="15" x2="15" y2="15" />
            </svg>
            Create New Map
          </button>
          <button className="welcome-btn welcome-btn-secondary" onClick={onOpenFile}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
            Open Existing File
          </button>
        </div>

        <button className="welcome-example-link" onClick={onLoadExample}>
          or start with example data
        </button>
      </div>
    </div>
  );
}
