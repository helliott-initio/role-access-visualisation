import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  Position,
  type EdgeProps,
} from '@xyflow/react';

interface CustomEdgeData {
  label?: string;
  color?: string;
  animated?: boolean;
  dashed?: boolean;
}

// Map handle IDs to Position enum for correct path calculation
function getPositionFromHandleId(handleId: string | null | undefined, fallback: Position): Position {
  if (!handleId) return fallback;
  switch (handleId) {
    case 'top': return Position.Top;
    case 'bottom':
    case 'header-bottom': return Position.Bottom;
    case 'left': return Position.Left;
    case 'right': return Position.Right;
    default: return fallback;
  }
}

// Calculate optimal offset to minimize unnecessary bends
function calculateOffset(
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number,
  sourcePos: Position,
  targetPos: Position
): number {
  const dx = Math.abs(targetX - sourceX);
  const dy = Math.abs(targetY - sourceY);

  // Check if handles are on compatible sides for a direct path
  const isVerticalSource = sourcePos === Position.Top || sourcePos === Position.Bottom;
  const isVerticalTarget = targetPos === Position.Top || targetPos === Position.Bottom;

  // When both are vertical (top/bottom), use minimal offset if horizontally aligned
  if (isVerticalSource && isVerticalTarget) {
    // If mostly vertical movement, keep offset small
    if (dx < 50) return 10;
    // Otherwise, use half the horizontal distance for a cleaner bend
    return Math.min(dx / 2, 30);
  }

  // When both are horizontal (left/right), use minimal offset if vertically aligned
  if (!isVerticalSource && !isVerticalTarget) {
    if (dy < 50) return 10;
    return Math.min(dy / 2, 30);
  }

  // Mixed orientations (e.g., top to left) - use smaller offset for tighter corners
  return Math.min(Math.min(dx, dy) / 3, 25);
}

export function CustomEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  sourceHandleId,
  targetHandleId,
  data,
  markerEnd,
  markerStart,
  selected,
}: EdgeProps) {
  const edgeData = data as CustomEdgeData | undefined;
  const color = edgeData?.color || '#666';
  const dashed = edgeData?.dashed || false;
  const label = edgeData?.label;

  // Use handle IDs to derive correct positions for path calculation
  const effectiveSourcePosition = getPositionFromHandleId(sourceHandleId, sourcePosition);
  const effectiveTargetPosition = getPositionFromHandleId(targetHandleId, targetPosition);

  // Calculate dynamic offset based on geometry to minimize bends
  const offset = calculateOffset(
    sourceX, sourceY, targetX, targetY,
    effectiveSourcePosition, effectiveTargetPosition
  );

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition: effectiveSourcePosition,
    targetPosition: effectiveTargetPosition,
    borderRadius: 8,
    offset,
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
