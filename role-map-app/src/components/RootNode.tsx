import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';

interface RootNodeData {
  label: string;
  email: string;
  mailType?: 'security' | 'mailing' | null;
}

function RootNode({ data, selected }: NodeProps) {
  const nodeData = data as unknown as RootNodeData;
  const { label, email, mailType } = nodeData;

  const handleStyle = { background: '#fff', width: 10, height: 10, border: '2px solid #2d3e50' };

  return (
    <div className={`root-node ${selected ? 'selected' : ''}`}>
      {/* One handle per side */}
      <Handle type="source" position={Position.Top} id="top" style={handleStyle} isConnectableStart={true} isConnectableEnd={true} />
      <Handle type="source" position={Position.Bottom} id="bottom" style={handleStyle} isConnectableStart={true} isConnectableEnd={true} />
      <Handle type="source" position={Position.Left} id="left" style={handleStyle} isConnectableStart={true} isConnectableEnd={true} />
      <Handle type="source" position={Position.Right} id="right" style={handleStyle} isConnectableStart={true} isConnectableEnd={true} />

      {mailType && (
        <span className={`mail-type-badge mail-type-${mailType}`}>
          {mailType === 'security' ? 'S' : 'M'}
        </span>
      )}
      <div className="root-node-content">
        <div className="root-label">{label}</div>
        <div className="root-email">{email}</div>
      </div>
    </div>
  );
}

export default memo(RootNode);
