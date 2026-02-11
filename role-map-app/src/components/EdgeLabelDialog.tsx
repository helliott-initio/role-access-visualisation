import { useState, useEffect, useRef } from 'react';

interface EdgeLabelDialogProps {
  currentLabel?: string;
  onSave: (label: string) => void;
  onCancel: () => void;
}

export function EdgeLabelDialog({
  currentLabel,
  onSave,
  onCancel,
}: EdgeLabelDialogProps) {
  const [value, setValue] = useState(currentLabel || '');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Auto-focus and select all text
    const input = inputRef.current;
    if (input) {
      input.focus();
      input.select();
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onCancel]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (trimmed) {
      onSave(trimmed);
    }
  };

  const isEditing = !!currentLabel;

  return (
    <div className="modal-overlay confirm-overlay" onClick={onCancel}>
      <div className="edge-label-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="confirm-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M4 12H20" stroke="#2d3e50" strokeWidth="2" strokeLinecap="round"/>
            <rect x="7" y="8" width="10" height="8" rx="3" stroke="#2d3e50" strokeWidth="1.5" fill="white"/>
            <path d="M10 12H14" stroke="#2d3e50" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
        </div>
        <h3 className="confirm-title">
          {isEditing ? 'Edit Label' : 'Add Label'}
        </h3>
        <p className="confirm-message">
          {isEditing
            ? 'Update the text shown on this connection.'
            : 'Add a text label to this connection.'}
        </p>
        <form onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            className="edge-label-input"
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="e.g. reports to, manages..."
            maxLength={50}
          />
          <div className="confirm-actions">
            <button type="button" className="confirm-cancel-btn" onClick={onCancel}>
              Cancel
            </button>
            <button
              type="submit"
              className="confirm-action-btn confirm-default"
              disabled={!value.trim()}
            >
              {isEditing ? 'Update' : 'Add'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
