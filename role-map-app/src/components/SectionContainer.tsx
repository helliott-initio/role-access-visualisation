import { memo, useState, useEffect } from 'react';
import { NodeResizer, useStore, Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';

interface SectionContainerData {
  label: string;
  color: string;
  bgColor: string;
  type?: 'primary' | 'secondary' | 'support';
}

function SectionContainer({ id, data, selected }: NodeProps) {
  const nodeData = data as unknown as SectionContainerData;
  const { label, color, bgColor, type = 'primary' } = nodeData;
  const typeLabel = type.charAt(0).toUpperCase() + type.slice(1);

  const [isResizing, setIsResizing] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // Get current node dimensions from store
  const node = useStore((state) => state.nodeLookup.get(id));
  const width = node?.measured?.width ?? node?.width ?? 250;
  const height = node?.measured?.height ?? node?.height ?? 400;

  useEffect(() => {
    if (isResizing) {
      setDimensions({ width: Math.round(width), height: Math.round(height) });
    }
  }, [width, height, isResizing]);

  const handleStyle = {
    background: 'white',
    width: 10,
    height: 10,
    border: `2px solid ${color}`,
    opacity: selected ? 1 : 0,
    transition: 'opacity 0.2s',
  };

  // Header is ~36px tall (padding 8px + content + padding 8px)
  const headerHeight = 36;
  const headerCenter = headerHeight / 2;

  return (
    <>
      <NodeResizer
        minWidth={150}
        minHeight={100}
        isVisible={selected}
        lineClassName="section-resizer-line"
        handleClassName="section-resizer-handle"
        color={color}
        onResizeStart={() => setIsResizing(true)}
        onResizeEnd={() => setIsResizing(false)}
      />
      {isResizing && (
        <div className="resize-tooltip" style={{ borderColor: color }}>
          {dimensions.width} × {dimensions.height}
        </div>
      )}

      {/* Section handles - positioned on the header bar */}
      {/* Top center of header */}
      <Handle
        type="source"
        position={Position.Top}
        id="top"
        style={handleStyle}
        isConnectableStart={true}
        isConnectableEnd={true}
      />
      {/* Bottom of header (not bottom of section) */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="header-bottom"
        style={{
          ...handleStyle,
          top: headerHeight,
        }}
        isConnectableStart={true}
        isConnectableEnd={true}
      />
      {/* Left side of header */}
      <Handle
        type="source"
        position={Position.Left}
        id="left"
        style={{ ...handleStyle, top: headerCenter }}
        isConnectableStart={true}
        isConnectableEnd={true}
      />
      {/* Right side of header */}
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        style={{ ...handleStyle, top: headerCenter }}
        isConnectableStart={true}
        isConnectableEnd={true}
      />

      <div
        className="section-container"
        style={{
          backgroundColor: bgColor,
          borderColor: color,
          width: '100%',
          height: '100%',
        }}
      >
        <div className="section-container-header" style={{ backgroundColor: color }}>
          <span className="section-container-label">{label}</span>
          <span className="section-container-badge">{typeLabel}</span>
        </div>
      </div>
    </>
  );
}

export default memo(SectionContainer);
