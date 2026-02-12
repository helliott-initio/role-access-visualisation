import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';

interface RoleNodeData {
  label: string;
  email: string;
  sectionId: string;
  color: string;
  bgColor: string;
  isSecondary?: boolean;
  isRoot?: boolean;
  mailType?: 'security' | 'mailing' | null;
}

function RoleNode({ data, selected }: NodeProps) {
  const nodeData = data as unknown as RoleNodeData;
  const { label, email, color, bgColor, isSecondary, isRoot, mailType } = nodeData;

  const handleStyle = { background: color, width: 8, height: 8 };

  return (
    <div
      className={`role-node ${isSecondary ? 'secondary' : ''} ${isRoot ? 'root' : ''} ${selected ? 'selected' : ''}`}
      style={{
        backgroundColor: bgColor,
        borderColor: color,
        borderWidth: isRoot ? 3 : 2,
        borderStyle: isSecondary ? 'dashed' : 'solid',
      }}
    >
      {/* One handle per side - all can be source or target */}
      <Handle type="source" position={Position.Top} id="top" style={handleStyle} isConnectableStart={true} isConnectableEnd={true} />
      <Handle type="source" position={Position.Bottom} id="bottom" style={handleStyle} isConnectableStart={true} isConnectableEnd={true} />
      <Handle type="source" position={Position.Left} id="left" style={handleStyle} isConnectableStart={true} isConnectableEnd={true} />
      <Handle type="source" position={Position.Right} id="right" style={handleStyle} isConnectableStart={true} isConnectableEnd={true} />

      {mailType && (
        <span className={`mail-type-badge mail-type-${mailType}`}>
          <span className="mail-type-letter">{mailType === 'security' ? 'S' : 'M'}</span>
          <span className="mail-type-expanded">{mailType === 'security' ? 'Security' : 'Mailing'}</span>
        </span>
      )}
      <div className="role-node-content">
        <div className="role-label" style={{ color: isRoot ? '#fff' : color }}>
          {label}
        </div>
        <div className="role-email" style={{ color: isRoot ? 'rgba(255,255,255,0.8)' : '#666' }}>
          {email}
        </div>
      </div>
    </div>
  );
}

export default memo(RoleNode);
