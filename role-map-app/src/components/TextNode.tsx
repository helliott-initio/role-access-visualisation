import { useState, useRef, useEffect, useCallback } from 'react';
import { Handle, Position } from '@xyflow/react';

interface TextNodeData {
  text: string;
  fontSize?: number;
  color?: string;
  onTextChange?: (id: string, text: string) => void;
  onDelete?: (id: string) => void;
}

interface TextNodeProps {
  id: string;
  data: TextNodeData;
  selected: boolean;
}

export function TextNode({ id, data, selected }: TextNodeProps) {
  const [editing, setEditing] = useState(!data.text);
  const [editText, setEditText] = useState(data.text);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [editing]);

  const confirmEdit = useCallback(() => {
    const trimmed = editText.trim();
    if (trimmed) {
      data.onTextChange?.(id, trimmed);
      setEditing(false);
    } else {
      data.onDelete?.(id);
    }
  }, [editText, id, data]);

  const cancelEdit = useCallback(() => {
    if (!data.text) {
      data.onDelete?.(id);
    } else {
      setEditText(data.text);
      setEditing(false);
    }
  }, [data, id]);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setEditText(data.text);
    setEditing(true);
  }, [data.text]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      confirmEdit();
    } else if (e.key === 'Escape') {
      cancelEdit();
    }
  }, [confirmEdit, cancelEdit]);

  const fontSize = data.fontSize || 14;
  const color = data.color || '#333';

  return (
    <div
      className={`text-node ${selected ? 'selected' : ''}`}
      onDoubleClick={handleDoubleClick}
    >
      <Handle type="target" position={Position.Top} id="top" style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Bottom} id="bottom" style={{ opacity: 0 }} />
      {editing ? (
        <textarea
          ref={textareaRef}
          className="text-node-input nodrag"
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={confirmEdit}
          style={{ fontSize, color }}
          rows={Math.max(1, editText.split('\n').length)}
          placeholder="Type text..."
        />
      ) : (
        <div className="text-node-display" style={{ fontSize, color, whiteSpace: 'pre-wrap' }}>
          {data.text || 'Double-click to edit'}
        </div>
      )}
    </div>
  );
}

export default TextNode;
