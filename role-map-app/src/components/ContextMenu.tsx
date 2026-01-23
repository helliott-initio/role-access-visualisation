import { useCallback } from 'react';

interface ContextMenuProps {
  x: number;
  y: number;
  nodeType: 'role' | 'section' | 'pane' | 'edge';
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onAddChild: () => void;
  onAddGroup: () => void;
  onAddSection: () => void;
  onAddLabel?: () => void;
  onRemoveLabel?: () => void;
  onReverseDirection?: () => void;
  onToggleDashed?: () => void;
  onToggleAnimated?: () => void;
  onToggleArrow?: () => void;
  onMatchWidth?: () => void;
  onMatchHeight?: () => void;
  hasLabel?: boolean;
  isDashed?: boolean;
  isAnimated?: boolean;
  hasArrow?: boolean;
}

export function ContextMenu({
  x,
  y,
  nodeType,
  onClose,
  onEdit,
  onDelete,
  onAddChild,
  onAddGroup,
  onAddSection,
  onAddLabel,
  onRemoveLabel,
  onReverseDirection,
  onToggleDashed,
  onToggleAnimated,
  onToggleArrow,
  onMatchWidth,
  onMatchHeight,
  hasLabel,
  isDashed,
  isAnimated,
  hasArrow,
}: ContextMenuProps) {
  const handleClick = useCallback(
    (action: () => void) => {
      action();
      onClose();
    },
    [onClose]
  );

  return (
    <>
      <div className="context-menu-backdrop" onClick={onClose} />
      <div
        className="context-menu"
        style={{
          left: x,
          top: y,
        }}
      >
        {nodeType === 'role' && (
          <>
            <button className="context-menu-item" onClick={() => handleClick(onEdit)}>
              <span className="context-menu-icon">✎</span>
              Edit Group
            </button>
            <button className="context-menu-item" onClick={() => handleClick(onAddChild)}>
              <span className="context-menu-icon">+</span>
              Add Child Group
            </button>
            <div className="context-menu-divider" />
            <button
              className="context-menu-item danger"
              onClick={() => handleClick(onDelete)}
            >
              <span className="context-menu-icon">🗑</span>
              Delete Group
            </button>
          </>
        )}
        {nodeType === 'section' && (
          <>
            <button className="context-menu-item" onClick={() => handleClick(onEdit)}>
              <span className="context-menu-icon">✎</span>
              Edit Section
            </button>
            <button className="context-menu-item" onClick={() => handleClick(onAddGroup)}>
              <span className="context-menu-icon">+</span>
              Add Group to Section
            </button>
            <div className="context-menu-divider" />
            {onMatchWidth && (
              <button className="context-menu-item" onClick={() => handleClick(onMatchWidth)}>
                <span className="context-menu-icon">↔</span>
                Match Width to Others
              </button>
            )}
            {onMatchHeight && (
              <button className="context-menu-item" onClick={() => handleClick(onMatchHeight)}>
                <span className="context-menu-icon">↕</span>
                Match Height to Others
              </button>
            )}
            <div className="context-menu-divider" />
            <button
              className="context-menu-item danger"
              onClick={() => handleClick(onDelete)}
            >
              <span className="context-menu-icon">🗑</span>
              Delete Section
            </button>
          </>
        )}
        {nodeType === 'pane' && (
          <>
            <button className="context-menu-item" onClick={() => handleClick(onAddGroup)}>
              <span className="context-menu-icon">+</span>
              Add Group
            </button>
            <button className="context-menu-item" onClick={() => handleClick(onAddSection)}>
              <span className="context-menu-icon">▢</span>
              Add Section
            </button>
          </>
        )}
        {nodeType === 'edge' && (
          <>
            {!hasLabel && onAddLabel && (
              <button className="context-menu-item" onClick={() => handleClick(onAddLabel)}>
                <span className="context-menu-icon">📄</span>
                Add Label
              </button>
            )}
            {hasLabel && onRemoveLabel && (
              <button className="context-menu-item" onClick={() => handleClick(onRemoveLabel)}>
                <span className="context-menu-icon">✕</span>
                Remove Label
              </button>
            )}
            {onReverseDirection && (
              <button className="context-menu-item" onClick={() => handleClick(onReverseDirection)}>
                <span className="context-menu-icon">⇄</span>
                Reverse Direction
              </button>
            )}
            <div className="context-menu-divider" />
            {onToggleArrow && (
              <button className="context-menu-item" onClick={() => handleClick(onToggleArrow)}>
                <span className="context-menu-icon">{hasArrow ? '✓' : ''}</span>
                Arrow Head
              </button>
            )}
            {onToggleDashed && (
              <button className="context-menu-item" onClick={() => handleClick(onToggleDashed)}>
                <span className="context-menu-icon">{isDashed ? '✓' : ''}</span>
                Dashed Line
              </button>
            )}
            {onToggleAnimated && (
              <button className="context-menu-item" onClick={() => handleClick(onToggleAnimated)}>
                <span className="context-menu-icon">{isAnimated ? '✓' : ''}</span>
                Animated
              </button>
            )}
            <div className="context-menu-divider" />
            <button
              className="context-menu-item danger"
              onClick={() => handleClick(onDelete)}
            >
              <span className="context-menu-icon">🗑</span>
              Delete Connection
            </button>
          </>
        )}
      </div>
    </>
  );
}
