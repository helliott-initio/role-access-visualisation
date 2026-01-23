import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';

interface SectionNodeData {
  label: string;
  color: string;
  bgColor: string;
  collapsed: boolean;
  onToggleCollapse: () => void;
  isPrimary: boolean;
}

function SectionNode({ data, selected }: NodeProps) {
  const nodeData = data as unknown as SectionNodeData;
  const { label, color, bgColor, collapsed, onToggleCollapse, isPrimary } = nodeData;

  return (
    <div
      className={`section-node ${selected ? 'selected' : ''}`}
      style={{
        backgroundColor: bgColor,
        borderColor: color,
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: color, width: 8, height: 8 }}
      />
      <div className="section-header" style={{ backgroundColor: color }}>
        <button
          className="collapse-btn"
          onClick={(e) => {
            e.stopPropagation();
            onToggleCollapse();
          }}
        >
          {collapsed ? '+' : '-'}
        </button>
        <span className="section-title">{label}</span>
        {isPrimary && <span className="primary-badge">Primary</span>}
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: color, width: 8, height: 8 }}
      />
    </div>
  );
}

export default memo(SectionNode);
