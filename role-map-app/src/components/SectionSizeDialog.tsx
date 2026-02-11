import { useState, useEffect, useRef } from 'react';

interface SectionSizeDialogProps {
  currentWidth: number;
  currentHeight: number;
  onSave: (width: number, height: number) => void;
  onCancel: () => void;
}

export function SectionSizeDialog({
  currentWidth,
  currentHeight,
  onSave,
  onCancel,
}: SectionSizeDialogProps) {
  const [width, setWidth] = useState(String(currentWidth));
  const [height, setHeight] = useState(String(currentHeight));
  const widthRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    widthRef.current?.focus();
    widthRef.current?.select();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onCancel]);

  const parsedW = parseInt(width, 10);
  const parsedH = parseInt(height, 10);
  const isValid = !isNaN(parsedW) && !isNaN(parsedH) && parsedW >= 150 && parsedH >= 100;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    onSave(parsedW, parsedH);
  };

  return (
    <div className="modal-overlay confirm-overlay" onClick={onCancel}>
      <div className="edge-label-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="confirm-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="3" width="18" height="18" rx="3" stroke="#2d3e50" strokeWidth="1.5" strokeDasharray="4 2"/>
            <path d="M8 12H16" stroke="#2d3e50" strokeWidth="1.5" strokeLinecap="round"/>
            <path d="M8 11L6 12L8 13" stroke="#2d3e50" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M16 11L18 12L16 13" stroke="#2d3e50" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <h3 className="confirm-title">Set Section Size</h3>
        <p className="confirm-message">Enter width and height in pixels. Minimum 150 x 100.</p>
        <form onSubmit={handleSubmit}>
          <div className="size-dialog-fields">
            <div className="size-dialog-field">
              <label className="size-dialog-label">Width</label>
              <input
                ref={widthRef}
                className="edge-label-input"
                type="number"
                value={width}
                onChange={(e) => setWidth(e.target.value)}
                min={150}
                step={10}
              />
            </div>
            <span className="size-dialog-x">&times;</span>
            <div className="size-dialog-field">
              <label className="size-dialog-label">Height</label>
              <input
                className="edge-label-input"
                type="number"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                min={100}
                step={10}
              />
            </div>
          </div>
          <div className="confirm-actions">
            <button type="button" className="confirm-cancel-btn" onClick={onCancel}>
              Cancel
            </button>
            <button
              type="submit"
              className="confirm-action-btn confirm-default"
              disabled={!isValid}
            >
              Apply
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
