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
}

export interface AlignmentResult {
  snapX: number | null; // adjusted x position for the dragging node, or null
  snapY: number | null; // adjusted y position for the dragging node, or null
  guideLines: GuideLine[];
}

export function getNodeBounds(node: Node): NodeBounds | null {
  const w = node.measured?.width ?? node.width ?? 0;
  const h = node.measured?.height ?? node.height ?? 0;
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
    if (node.id.startsWith('section-')) continue; // skip section containers

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
    ...xGuides.map((x): GuideLine => ({ orientation: 'vertical', position: x })),
    ...yGuides.map((y): GuideLine => ({ orientation: 'horizontal', position: y })),
  ];

  return {
    snapX: bestDx,
    snapY: bestDy,
    guideLines,
  };
}
