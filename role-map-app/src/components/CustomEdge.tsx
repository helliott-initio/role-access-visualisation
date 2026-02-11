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
  parallelIndex?: number;
  parallelTotal?: number;
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

// Gap between parallel edges (px)
const PARALLEL_GAP = 14;

// Compute perpendicular offset for parallel edges
function getParallelOffset(
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number,
  index: number,
  total: number,
): { dx: number; dy: number } {
  if (total <= 1) return { dx: 0, dy: 0 };

  // Offset from center: -1, 0, +1 for 3 edges, etc.
  const offset = (index - (total - 1) / 2) * PARALLEL_GAP;

  // Direction vector from source to target
  const vx = targetX - sourceX;
  const vy = targetY - sourceY;
  const len = Math.sqrt(vx * vx + vy * vy);
  if (len === 0) return { dx: 0, dy: 0 };

  // Perpendicular unit vector (rotate 90 degrees)
  const px = -vy / len;
  const py = vx / len;

  return { dx: px * offset, dy: py * offset };
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
  const parallelIndex = edgeData?.parallelIndex ?? 0;
  const parallelTotal = edgeData?.parallelTotal ?? 1;

  // Apply perpendicular offset for parallel edges
  const pOffset = getParallelOffset(sourceX, sourceY, targetX, targetY, parallelIndex, parallelTotal);
  const sx = sourceX + pOffset.dx;
  const sy = sourceY + pOffset.dy;
  const tx = targetX + pOffset.dx;
  const ty = targetY + pOffset.dy;

  // Use handle IDs to derive correct positions for path calculation
  const effectiveSourcePosition = getPositionFromHandleId(sourceHandleId, sourcePosition);
  const effectiveTargetPosition = getPositionFromHandleId(targetHandleId, targetPosition);

  // Check if we can use a straight line (nodes are aligned)
  const useStraight = canUseStraightPath(
    sx, sy, tx, ty,
    effectiveSourcePosition, effectiveTargetPosition
  );

  let edgePath: string;
  let labelX: number;
  let labelY: number;

  if (useStraight) {
    // Use straight line for aligned nodes
    [edgePath, labelX, labelY] = getStraightPath(sx, sy, tx, ty);
  } else {
    // Use orthogonal path with minimal offset
    const dx = Math.abs(tx - sx);
    const dy = Math.abs(ty - sy);
    const offset = Math.min(Math.max(Math.min(dx, dy) / 4, 10), 25);

    [edgePath, labelX, labelY] = getSmoothStepPath({
      sourceX: sx,
      sourceY: sy,
      targetX: tx,
      targetY: ty,
      sourcePosition: effectiveSourcePosition,
      targetPosition: effectiveTargetPosition,
      borderRadius: 8,
      offset,
    });
  }

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
