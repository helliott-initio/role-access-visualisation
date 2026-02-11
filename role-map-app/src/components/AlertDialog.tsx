import { useEffect, useRef } from 'react';

interface AlertDialogProps {
  title: string;
  message: string;
  buttonLabel?: string;
  variant?: 'danger' | 'default';
  onClose: () => void;
}

export function AlertDialog({
  title,
  message,
  buttonLabel = 'OK',
  variant = 'default',
  onClose,
}: AlertDialogProps) {
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    btnRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const iconColor = variant === 'danger' ? '#dc3545' : '#2d3e50';

  return (
    <div className="modal-overlay confirm-overlay" onClick={onClose}>
      <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="confirm-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke={iconColor} strokeWidth="2"/>
            <path d="M12 8V13" stroke={iconColor} strokeWidth="2" strokeLinecap="round"/>
            <circle cx="12" cy="16.5" r="1" fill={iconColor}/>
          </svg>
        </div>
        <h3 className="confirm-title">{title}</h3>
        <p className="confirm-message">{message}</p>
        <div className="confirm-actions">
          <button
            ref={btnRef}
            className={`confirm-action-btn ${variant === 'danger' ? 'confirm-danger' : 'confirm-default'}`}
            onClick={onClose}
          >
            {buttonLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
