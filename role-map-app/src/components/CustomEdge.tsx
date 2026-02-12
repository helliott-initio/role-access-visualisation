import {
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

// Darken light colors so edges remain visible against white/light backgrounds
function darkenForEdge(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  // Perceived luminance (ITU-R BT.709)
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  if (lum < 140) return hex; // already dark enough
  // Scale toward a darker version — factor decreases as luminance increases
  const factor = Math.max(0.45, 1 - (lum - 140) / 250);
  const dr = Math.round(r * factor);
  const dg = Math.round(g * factor);
  const db = Math.round(b * factor);
  return `#${dr.toString(16).padStart(2, '0')}${dg.toString(16).padStart(2, '0')}${db.toString(16).padStart(2, '0')}`;
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
  const rawColor = edgeData?.color || '#666';
  const color = darkenForEdge(rawColor);
  const dashed = edgeData?.dashed || false;
  const isAnimated = edgeData?.animated || false;
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
      {/* Background knockout stroke: only for dashed edges so overlapping
          dashed lines don't accumulate into a solid appearance.
          Skipped for solid edges to avoid visible artifacts over colored sections. */}
      {dashed && (
        <path
          d={edgePath}
          fill="none"
          stroke="#f0f2f5"
          strokeWidth={strokeWidth + 2}
          strokeLinecap="round"
        />
      )}
      {/* Visible edge path — we render manually instead of using BaseEdge
          so that our knockout stroke stays static while only this path animates */}
      <path
        id={id}
        className={`react-flow__edge-path${isAnimated ? ' edge-animated' : ''}`}
        d={edgePath}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={dashed ? '5,5' : undefined}
        strokeLinecap="round"
        markerEnd={markerEnd as string}
        markerStart={markerStart as string}
      />
      {/* Transparent interaction path for easier click/hover targeting */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={20}
        className="react-flow__edge-interaction"
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
