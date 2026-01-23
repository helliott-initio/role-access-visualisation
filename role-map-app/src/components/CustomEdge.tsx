import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  type EdgeProps,
} from '@xyflow/react';

interface CustomEdgeData {
  label?: string;
  color?: string;
  animated?: boolean;
  dashed?: boolean;
}

export function CustomEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  markerEnd,
  markerStart,
  selected,
}: EdgeProps) {
  const edgeData = data as CustomEdgeData | undefined;
  const color = edgeData?.color || '#666';
  const dashed = edgeData?.dashed || false;
  const label = edgeData?.label;

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 8,
  });

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        markerStart={markerStart}
        style={{
          stroke: color,
          strokeWidth: selected ? 3 : 2,
          strokeDasharray: dashed ? '5,5' : undefined,
        }}
      />
      {label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              background: 'white',
              padding: '4px 8px',
              borderRadius: 4,
              fontSize: 11,
              fontWeight: 500,
              color: color,
              border: `1px solid ${color}`,
              boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
              pointerEvents: 'all',
            }}
            className="nodrag nopan"
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

export default CustomEdge;
