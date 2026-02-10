import { useEffect, useRef } from 'react';

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'default';
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  variant = 'danger',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // Focus the cancel button by default so Enter doesn't accidentally confirm
    confirmRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onCancel]);

  return (
    <div className="modal-overlay confirm-overlay" onClick={onCancel}>
      <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="confirm-icon">
          {variant === 'danger' ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="#dc3545" strokeWidth="2"/>
              <path d="M12 8V13" stroke="#dc3545" strokeWidth="2" strokeLinecap="round"/>
              <circle cx="12" cy="16.5" r="1" fill="#dc3545"/>
            </svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="#2d3e50" strokeWidth="2"/>
              <path d="M12 8V13" stroke="#2d3e50" strokeWidth="2" strokeLinecap="round"/>
              <circle cx="12" cy="16.5" r="1" fill="#2d3e50"/>
            </svg>
          )}
        </div>
        <h3 className="confirm-title">{title}</h3>
        <p className="confirm-message">{message}</p>
        <div className="confirm-actions">
          <button className="confirm-cancel-btn" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            className={`confirm-action-btn ${variant === 'danger' ? 'confirm-danger' : 'confirm-default'}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
