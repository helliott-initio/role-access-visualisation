import type { Node } from '@xyflow/react';

export interface NodeBounds {
  left: number;
  right: number;
  top: number;
  bottom: number;
  centerX: number;
  centerY: number;
  width: number;
  height: number;
}

export interface GuideLine {
  orientation: 'horizontal' | 'vertical';
  position: number; // x for vertical, y for horizontal
  type?: 'alignment' | 'spacing';
  // For spacing guides: the segment endpoints and label
  start?: number;
  end?: number;
  label?: string;
}

export interface AlignmentResult {
  snapX: number | null; // adjusted x position for the dragging node, or null
  snapY: number | null; // adjusted y position for the dragging node, or null
  guideLines: GuideLine[];
}

export function getNodeBounds(node: Node): NodeBounds | null {
  // Prefer explicit style dimensions (set on section nodes) over measured
  // to avoid sub-pixel discrepancies that misalign guide lines with visual edges.
  // Role nodes have no explicit style dimensions, so they correctly fall back to measured.
  const styleW = typeof node.style?.width === 'number' ? node.style.width : null;
  const styleH = typeof node.style?.height === 'number' ? node.style.height : null;
  const w = styleW ?? node.measured?.width ?? node.width ?? 0;
  const h = styleH ?? node.measured?.height ?? node.height ?? 0;
  if (!w || !h) return null;

  const left = node.position.x;
  const top = node.position.y;
  return {
    left,
    right: left + w,
    top,
    bottom: top + h,
    centerX: left + w / 2,
    centerY: top + h / 2,
    width: w,
    height: h,
  };
}

const THRESHOLD = 5;
const SPACING_THRESHOLD = 8;

interface SpacingSnap {
  snapPos: number; // The node position (x or y) to snap to
  dist: number; // How close it is to the ideal equidistant point
  guides: GuideLine[];
}

/**
 * For each pair of existing nodes (A, C), check if the dragging node B
 * can be placed equidistant between them on a given axis.
 */
function findSpacingSnaps(
  dragging: NodeBounds,
  others: { bounds: NodeBounds; nodeType: string }[],
  axis: 'x' | 'y',
  threshold: number = SPACING_THRESHOLD
): SpacingSnap | null {
  let best: SpacingSnap | null = null;

  for (let i = 0; i < others.length; i++) {
    for (let j = i + 1; j < others.length; j++) {
      const a = others[i];
      const c = others[j];

      // Only snap same-type nodes together (groups with groups, sections with sections)
      if (a.nodeType !== c.nodeType) continue;

      if (axis === 'x') {
        // Check horizontal spacing: A left of C (by center)
        const aCx = a.bounds.centerX;
        const cCx = c.bounds.centerX;
        const left = Math.min(aCx, cCx);
        const right = Math.max(aCx, cCx);

        // B should be between A and C
        if (dragging.centerX < left - threshold || dragging.centerX > right + threshold) continue;

        // Equidistant center point
        const midX = (left + right) / 2;
        const idealLeft = midX - dragging.width / 2;
        const dist = Math.abs(dragging.left - idealLeft);

        if (dist < threshold && (!best || dist < best.dist)) {
          const spacing = Math.round((right - left) / 2);
          const crossY = Math.min(a.bounds.centerY, c.bounds.centerY, dragging.centerY);
          const crossYEnd = Math.max(a.bounds.centerY, c.bounds.centerY, dragging.centerY);
          const guideY = (crossY + crossYEnd) / 2;

          best = {
            snapPos: idealLeft,
            dist,
            guides: [
              {
                orientation: 'horizontal',
                position: guideY,
                type: 'spacing',
                start: left,
                end: midX,
                label: `${spacing}`,
              },
              {
                orientation: 'horizontal',
                position: guideY,
                type: 'spacing',
                start: midX,
                end: right,
                label: `${spacing}`,
              },
            ],
          };
        }
      } else {
        // Check vertical spacing
        const aCy = a.bounds.centerY;
        const cCy = c.bounds.centerY;
        const top = Math.min(aCy, cCy);
        const bottom = Math.max(aCy, cCy);

        if (dragging.centerY < top - threshold || dragging.centerY > bottom + threshold) continue;

        const midY = (top + bottom) / 2;
        const idealTop = midY - dragging.height / 2;
        const dist = Math.abs(dragging.top - idealTop);

        if (dist < threshold && (!best || dist < best.dist)) {
          const spacing = Math.round((bottom - top) / 2);
          const crossX = Math.min(a.bounds.centerX, c.bounds.centerX, dragging.centerX);
          const crossXEnd = Math.max(a.bounds.centerX, c.bounds.centerX, dragging.centerX);
          const guideX = (crossX + crossXEnd) / 2;

          best = {
            snapPos: idealTop,
            dist,
            guides: [
              {
                orientation: 'vertical',
                position: guideX,
                type: 'spacing',
                start: top,
                end: midY,
                label: `${spacing}`,
              },
              {
                orientation: 'vertical',
                position: guideX,
                type: 'spacing',
                start: midY,
                end: bottom,
                label: `${spacing}`,
              },
            ],
          };
        }
      }
    }
  }

  return best;
}

export function findAlignments(
  draggingNode: Node,
  allNodes: Node[],
  threshold: number = THRESHOLD
): AlignmentResult {
  const dragging = getNodeBounds(draggingNode);
  if (!dragging) return { snapX: null, snapY: null, guideLines: [] };

  let bestDx: number | null = null;
  let bestDxDist = Infinity;
  let bestDy: number | null = null;
  let bestDyDist = Infinity;
  const xGuides: number[] = [];
  const yGuides: number[] = [];

  for (const node of allNodes) {
    if (node.id === draggingNode.id) continue;

    const other = getNodeBounds(node);
    if (!other) continue;

    // --- Horizontal alignment (snap X) ---
    // Each pair: [dragging edge value, other edge value, guide line x]
    const xPairs: [number, number, number][] = [
      [dragging.left, other.left, other.left],           // left ↔ left
      [dragging.right, other.right, other.right],         // right ↔ right
      [dragging.centerX, other.centerX, other.centerX],   // center ↔ center
      [dragging.left, other.right, other.right],           // left ↔ right
      [dragging.right, other.left, other.left],            // right ↔ left
      [dragging.left, other.centerX, other.centerX],       // left ↔ center
      [dragging.right, other.centerX, other.centerX],      // right ↔ center
      [dragging.centerX, other.left, other.left],          // center ↔ left
      [dragging.centerX, other.right, other.right],        // center ↔ right
    ];

    for (const [dVal, oVal, guide] of xPairs) {
      const dist = Math.abs(dVal - oVal);
      if (dist < threshold && dist < bestDxDist) {
        // Calculate how much to adjust the node's x position
        // offset = how far dVal is from dragging.left (the node position)
        const offset = dVal - dragging.left;
        bestDx = oVal - offset;
        bestDxDist = dist;
        xGuides.length = 0;
        xGuides.push(guide);
      } else if (dist < threshold && dist === bestDxDist) {
        xGuides.push(guide);
      }
    }

    // --- Vertical alignment (snap Y) ---
    const yPairs: [number, number, number][] = [
      [dragging.top, other.top, other.top],               // top ↔ top
      [dragging.bottom, other.bottom, other.bottom],       // bottom ↔ bottom
      [dragging.centerY, other.centerY, other.centerY],    // center ↔ center
      [dragging.top, other.bottom, other.bottom],           // top ↔ bottom
      [dragging.bottom, other.top, other.top],              // bottom ↔ top
      [dragging.top, other.centerY, other.centerY],         // top ↔ center
      [dragging.bottom, other.centerY, other.centerY],      // bottom ↔ center
      [dragging.centerY, other.top, other.top],             // center ↔ top
      [dragging.centerY, other.bottom, other.bottom],       // center ↔ bottom
    ];

    for (const [dVal, oVal, guide] of yPairs) {
      const dist = Math.abs(dVal - oVal);
      if (dist < threshold && dist < bestDyDist) {
        const offset = dVal - dragging.top;
        bestDy = oVal - offset;
        bestDyDist = dist;
        yGuides.length = 0;
        yGuides.push(guide);
      } else if (dist < threshold && dist === bestDyDist) {
        yGuides.push(guide);
      }
    }
  }

  const guideLines: GuideLine[] = [
    ...xGuides.map((x): GuideLine => ({ orientation: 'vertical', position: x, type: 'alignment' })),
    ...yGuides.map((y): GuideLine => ({ orientation: 'horizontal', position: y, type: 'alignment' })),
  ];

  // --- Spacing snaps (lower priority — only apply when alignment didn't snap) ---
  const isSection = draggingNode.id.startsWith('section-');
  const dragNodeType = isSection ? 'section' : 'group';

  const otherBounds = allNodes
    .filter(n => n.id !== draggingNode.id)
    .map(n => {
      const bounds = getNodeBounds(n);
      return bounds ? { bounds, nodeType: n.id.startsWith('section-') ? 'section' : 'group' } : null;
    })
    .filter((b): b is { bounds: NodeBounds; nodeType: string } => b !== null)
    // Only include same-type nodes for spacing snap
    .filter(b => b.nodeType === dragNodeType);

  if (bestDx === null) {
    const spacingX = findSpacingSnaps(dragging, otherBounds, 'x');
    if (spacingX) {
      bestDx = spacingX.snapPos;
      guideLines.push(...spacingX.guides);
    }
  }

  if (bestDy === null) {
    const spacingY = findSpacingSnaps(dragging, otherBounds, 'y');
    if (spacingY) {
      bestDy = spacingY.snapPos;
      guideLines.push(...spacingY.guides);
    }
  }

  return {
    snapX: bestDx,
    snapY: bestDy,
    guideLines,
  };
}
