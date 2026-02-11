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
const PARALLEL_GAP = 16;

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

  // Parallel spread: offset from center for this edge in the parallel group
  const parallelSpread = parallelTotal > 1
    ? (parallelIndex - (parallelTotal - 1) / 2) * PARALLEL_GAP
    : 0;

  // Use handle IDs to derive correct positions for path calculation
  const effectiveSourcePosition = getPositionFromHandleId(sourceHandleId, sourcePosition);
  const effectiveTargetPosition = getPositionFromHandleId(targetHandleId, targetPosition);

  // Check if we can use a straight line (nodes are aligned) — use original coords
  const useStraight = canUseStraightPath(
    sourceX, sourceY, targetX, targetY,
    effectiveSourcePosition, effectiveTargetPosition
  );

  let edgePath: string;
  let labelX: number;
  let labelY: number;

  if (useStraight) {
    // For straight paths: offset perpendicular to the line direction
    const vx = targetX - sourceX;
    const vy = targetY - sourceY;
    const len = Math.sqrt(vx * vx + vy * vy) || 1;
    // Perpendicular unit vector
    const px = -vy / len;
    const py = vx / len;
    const sx = sourceX + px * parallelSpread;
    const sy = sourceY + py * parallelSpread;
    const tx = targetX + px * parallelSpread;
    const ty = targetY + py * parallelSpread;
    [edgePath, labelX, labelY] = getStraightPath(sx, sy, tx, ty);
  } else {
    // For orthogonal paths: use different routing offsets to spread the channels.
    // Each parallel edge routes through a different "lane" by increasing the
    // distance from the node where the path makes its first turn.
    const dx = Math.abs(targetX - sourceX);
    const dy = Math.abs(targetY - sourceY);
    const baseOffset = Math.min(Math.max(Math.min(dx, dy) / 4, 10), 25);
    const routeOffset = baseOffset + Math.abs(parallelSpread);

    // Also shift endpoints slightly perpendicular so the paths don't
    // start/end at the exact same point on the node handle.
    const vx = targetX - sourceX;
    const vy = targetY - sourceY;
    const len = Math.sqrt(vx * vx + vy * vy) || 1;
    const px = -vy / len;
    const py = vx / len;
    const handleShift = parallelSpread * 0.5;

    [edgePath, labelX, labelY] = getSmoothStepPath({
      sourceX: sourceX + px * handleShift,
      sourceY: sourceY + py * handleShift,
      targetX: targetX + px * handleShift,
      targetY: targetY + py * handleShift,
      sourcePosition: effectiveSourcePosition,
      targetPosition: effectiveTargetPosition,
      borderRadius: 8,
      offset: routeOffset,
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
