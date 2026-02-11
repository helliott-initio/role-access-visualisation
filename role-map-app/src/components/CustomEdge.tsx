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

// Threshold for considering nodes "aligned" (in pixels)
const ALIGNMENT_THRESHOLD = 30;

// Check if a straight line path is appropriate
function canUseStraightPath(
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number,
  sourcePos: Position,
  targetPos: Position
): boolean {
  const dx = Math.abs(targetX - sourceX);
  const dy = Math.abs(targetY - sourceY);

  // Vertical alignment: bottom→top or top→bottom when X coordinates are close
  if (
    (sourcePos === Position.Bottom && targetPos === Position.Top && sourceY < targetY) ||
    (sourcePos === Position.Top && targetPos === Position.Bottom && sourceY > targetY)
  ) {
    return dx <= ALIGNMENT_THRESHOLD;
  }

  // Horizontal alignment: left→right or right→left when Y coordinates are close
  if (
    (sourcePos === Position.Right && targetPos === Position.Left && sourceX < targetX) ||
    (sourcePos === Position.Left && targetPos === Position.Right && sourceX > targetX)
  ) {
    return dy <= ALIGNMENT_THRESHOLD;
  }

  return false;
}

// Generate a straight path between two points
function getStraightPath(
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number
): [string, number, number] {
  const path = `M ${sourceX} ${sourceY} L ${targetX} ${targetY}`;
  const labelX = (sourceX + targetX) / 2;
  const labelY = (sourceY + targetY) / 2;
  return [path, labelX, labelY];
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

  // Check if we can use a straight line (nodes are aligned)
  const useStraight = canUseStraightPath(
    sourceX, sourceY, targetX, targetY,
    effectiveSourcePosition, effectiveTargetPosition
  );

  let edgePath: string;
  let labelX: number;
  let labelY: number;

  if (useStraight) {
    [edgePath, labelX, labelY] = getStraightPath(sourceX, sourceY, targetX, targetY);
  } else {
    [edgePath, labelX, labelY] = getSmoothStepPath({
      sourceX,
      sourceY,
      targetX,
      targetY,
      sourcePosition: effectiveSourcePosition,
      targetPosition: effectiveTargetPosition,
      borderRadius: 8,
    });
  }

  const strokeWidth = selected ? 3 : 2;

  return (
    <>
      {/* Background knockout stroke: erases overlapping edges underneath so
          multiple edges on the same route don't accumulate thickness */}
      <path
        d={edgePath}
        fill="none"
        stroke="#f0f2f5"
        strokeWidth={strokeWidth + 4}
        strokeLinecap="round"
      />
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        markerStart={markerStart}
        style={{
          stroke: color,
          strokeWidth,
          strokeDasharray: dashed ? '5,5' : undefined,
        }}
      />
      {label && (
        <EdgeLabelRenderer>
          <div
            className="edge-label nodrag nopan"
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              '--edge-color': color,
            } as React.CSSProperties}
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

export default CustomEdge;
