import { memo, useState, useCallback, useRef } from 'react';
import { NodeResizer, useStore, Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import type { GuideLine } from '../utils/snapAlignment';

interface ResizeSnapTarget {
  width: number;
  height: number;
  x: number;
  y: number;
}

interface ResizeSnapRequest {
  nodeId: string;
  position: { x: number; y: number };
  width: number;
  height: number;
}

interface SectionContainerData {
  label: string;
  color: string;
  bgColor: string;
  email?: string;
  type?: 'primary' | 'secondary' | 'support' | 'department';
  mailType?: 'security' | 'mailing' | null;
  onResizeGuideLines?: (lines: GuideLine[]) => void;
  onResizeSnap?: (snap: ResizeSnapRequest) => void;
}

// Escape must be >2x snap to create a dead zone that prevents oscillation
const SNAP_THRESHOLD = 8;
const ESCAPE_THRESHOLD = 20;

interface SnapLock {
  width: number;
  height: number;
  lockedW: boolean;
  lockedH: boolean;
  wTarget: ResizeSnapTarget | null;
  hTarget: ResizeSnapTarget | null;
}

function SectionContainer({ id, data, selected }: NodeProps) {
  const nodeData = data as unknown as SectionContainerData;
  const { label, color, bgColor, email, type = 'primary', mailType, onResizeGuideLines, onResizeSnap } = nodeData;
  const typeLabel = type.charAt(0).toUpperCase() + type.slice(1);

  const [isResizing, setIsResizing] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [snappedAxes, setSnappedAxes] = useState({ w: false, h: false });

  const resizeStartRef = useRef<{ x: number; y: number; width: number; height: number } | null>(null);
  const snapTargetsRef = useRef<ResizeSnapTarget[]>([]);
  const snapLockRef = useRef<SnapLock | null>(null);
  // Skip snap on the first drag frame to guarantee NodeResizer's internal
  // resizeDetected flag becomes true, ensuring onResizeEnd always fires.
  const firstFrameRef = useRef(true);

  const node = useStore((state) => state.nodeLookup.get(id));

  const headerHeight = 36;
  const headerCenter = headerHeight / 2;

  const baseHandleStyle = {
    background: 'white',
    width: 10,
    height: 10,
    border: `2px solid ${color}`,
    opacity: selected ? 1 : 0,
    transition: 'opacity 0.2s',
    zIndex: 10,
  };

  const nodeLookup = useStore((state) => state.nodeLookup);

  // Build guide lines that bracket the TARGET section(s) to show which one we're matching.
  // Width and height may match different targets — show guides for each.
  const buildGuideLines = useCallback(
    (wTarget: ResizeSnapTarget | null, hTarget: ResizeSnapTarget | null) => {
      const lines: GuideLine[] = [];
      if (wTarget) {
        lines.push({ orientation: 'vertical', position: wTarget.x });
        lines.push({ orientation: 'vertical', position: wTarget.x + wTarget.width });
      }
      if (hTarget) {
        lines.push({ orientation: 'horizontal', position: hTarget.y });
        lines.push({ orientation: 'horizontal', position: hTarget.y + hTarget.height });
      }
      return lines;
    },
    []
  );

  const handleResizeStart = useCallback(() => {
    setIsResizing(true);
    snapLockRef.current = null;
    firstFrameRef.current = true;
    const w = (node?.style?.width as number) ?? node?.measured?.width ?? 250;
    const h = (node?.style?.height as number) ?? node?.measured?.height ?? 400;
    const pos = node?.position ?? { x: 0, y: 0 };
    resizeStartRef.current = { x: pos.x, y: pos.y, width: w, height: h };

    // Use style dimensions (what we explicitly set) rather than measured dimensions
    // (from ResizeObserver) to ensure guide lines align exactly with visual edges.
    // measured can include sub-pixel differences that cause guide lines to be slightly off.
    const targets: ResizeSnapTarget[] = [];
    for (const [nodeId, n] of nodeLookup) {
      if (!nodeId.startsWith('section-') || nodeId === id) continue;
      const tw = (n.style?.width as number) ?? n.measured?.width ?? 0;
      const th = (n.style?.height as number) ?? n.measured?.height ?? 0;
      if (tw > 0 || th > 0) {
        targets.push({ width: tw, height: th, x: n.position.x, y: n.position.y });
      }
    }
    snapTargetsRef.current = targets;
  }, [node, id, nodeLookup]);

  // shouldResize: return false to block NodeResizer when snapped.
  // Hysteresis: SNAP_THRESHOLD to enter, ESCAPE_THRESHOLD to leave.
  const handleShouldResize = useCallback(
    (_event: unknown, params: { x: number; y: number; width: number; height: number; direction: number[] }) => {
      // Always let the first drag frame through so NodeResizer marks
      // resizeDetected=true internally, guaranteeing onResizeEnd fires.
      if (firstFrameRef.current) {
        firstFrameRef.current = false;
        setDimensions({ width: Math.round(params.width), height: Math.round(params.height) });
        return true;
      }

      const locked = snapLockRef.current;

      if (locked) {
        // Currently snap-locked — check if mouse has moved far enough to escape
        const wDist = Math.abs(params.width - locked.width);
        const hDist = Math.abs(params.height - locked.height);
        const wEscaped = !locked.lockedW || wDist > ESCAPE_THRESHOLD;
        const hEscaped = !locked.lockedH || hDist > ESCAPE_THRESHOLD;

        if (wEscaped && hEscaped) {
          snapLockRef.current = null;
          onResizeGuideLines?.([]);
          setSnappedAxes({ w: false, h: false });
          setDimensions({ width: Math.round(params.width), height: Math.round(params.height) });
          return true;
        }

        // Still locked — keep tooltip showing snapped dims
        return false;
      }

      // Not locked — scan for snap matches (only on axes being actively resized).
      // Skip targets whose dimension matches the starting size — this prevents the
      // section snapping back to its original width/height when you begin resizing.
      const resizingW = params.direction[0] !== 0;
      const resizingH = params.direction[1] !== 0;
      const start = resizeStartRef.current;
      let bestSnapW: number | null = null;
      let bestSnapH: number | null = null;
      let wTarget: ResizeSnapTarget | null = null;
      let hTarget: ResizeSnapTarget | null = null;

      for (const target of snapTargetsRef.current) {
        if (resizingW && target.width > 0 && Math.abs(params.width - target.width) < SNAP_THRESHOLD) {
          if (start && Math.abs(target.width - start.width) < SNAP_THRESHOLD) continue;
          bestSnapW = target.width;
          wTarget = target;
        }
        if (resizingH && target.height > 0 && Math.abs(params.height - target.height) < SNAP_THRESHOLD) {
          if (start && Math.abs(target.height - start.height) < SNAP_THRESHOLD) continue;
          bestSnapH = target.height;
          hTarget = target;
        }
      }

      if (bestSnapW !== null || bestSnapH !== null) {
        const finalW = bestSnapW ?? params.width;
        const finalH = bestSnapH ?? params.height;
        let newX = params.x;
        let newY = params.y;

        // Adjust position when resizing from left/top edge (right/bottom stays fixed)
        if (start) {
          if (bestSnapW !== null && params.direction[0] === -1) {
            newX = start.x + start.width - finalW;
          }
          if (bestSnapH !== null && params.direction[1] === -1) {
            newY = start.y + start.height - finalH;
          }
        }

        // Apply snapped dimensions via parent's controlled setNodes
        onResizeSnap?.({
          nodeId: id,
          position: { x: newX, y: newY },
          width: finalW,
          height: finalH,
        });

        // Enter snap lock — track per-axis targets for guide lines
        snapLockRef.current = {
          width: finalW,
          height: finalH,
          lockedW: bestSnapW !== null,
          lockedH: bestSnapH !== null,
          wTarget,
          hTarget,
        };

        setDimensions({ width: Math.round(finalW), height: Math.round(finalH) });
        setSnappedAxes({ w: bestSnapW !== null, h: bestSnapH !== null });

        // Guide lines bracket each matching target section's edges
        onResizeGuideLines?.(buildGuideLines(wTarget, hTarget));

        return false; // Block NodeResizer — our setNodes applies snapped dims
      }

      // No snap — show raw dimensions, let NodeResizer proceed
      setDimensions({ width: Math.round(params.width), height: Math.round(params.height) });
      onResizeGuideLines?.([]);
      return true;
    },
    [id, onResizeSnap, onResizeGuideLines, buildGuideLines]
  );

  const handleResizeEnd = useCallback(() => {
    setIsResizing(false);
    setSnappedAxes({ w: false, h: false });
    snapLockRef.current = null;
    resizeStartRef.current = null;
    snapTargetsRef.current = [];
    firstFrameRef.current = true;
    onResizeGuideLines?.([]);
  }, [onResizeGuideLines]);

  return (
    <>
      <NodeResizer
        minWidth={150}
        minHeight={100}
        isVisible={selected}
        lineClassName="section-resizer-line"
        handleClassName="section-resizer-handle"
        color={color}
        onResizeStart={handleResizeStart}
        shouldResize={handleShouldResize}
        onResizeEnd={handleResizeEnd}
      />
      {isResizing && (
        <div className="resize-tooltip" style={{ borderColor: color }}>
          <span className={snappedAxes.w ? 'snapped' : ''}>{dimensions.width}</span>
          {' × '}
          <span className={snappedAxes.h ? 'snapped' : ''}>{dimensions.height}</span>
        </div>
      )}

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
          <div className="section-container-header-text">
            <span className="section-container-label">{label}</span>
            {email && <span className="section-container-email">{email}</span>}
          </div>
          <div className="section-container-badges">
            {mailType && (
              <span className={`mail-type-badge mail-type-${mailType}`}>
                <span className="mail-type-letter">{mailType === 'security' ? 'S' : 'M'}</span>
                <span className="mail-type-expanded">{mailType === 'security' ? 'Security' : 'Mailing'}</span>
              </span>
            )}
            <span className="section-container-badge">{typeLabel}</span>
          </div>
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Top}
        id="top"
        style={baseHandleStyle}
        isConnectableStart={true}
        isConnectableEnd={true}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        style={baseHandleStyle}
        isConnectableStart={true}
        isConnectableEnd={true}
      />
      <Handle
        type="source"
        position={Position.Left}
        id="left"
        style={{ ...baseHandleStyle, top: headerCenter }}
        isConnectableStart={true}
        isConnectableEnd={true}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        style={{ ...baseHandleStyle, top: headerCenter }}
        isConnectableStart={true}
        isConnectableEnd={true}
      />
      {/* Handle at the bottom edge of the section header — for "member of" connections */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="header-bottom"
        style={{ ...baseHandleStyle, top: headerHeight, bottom: 'auto' }}
        isConnectableStart={true}
        isConnectableEnd={true}
      />
    </>
  );
}

export default memo(SectionContainer);
