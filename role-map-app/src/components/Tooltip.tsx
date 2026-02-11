import { useRef, useEffect, useState } from 'react';

interface TooltipProps {
  x: number;
  y: number;
  children: React.ReactNode;
}

export function Tooltip({ x, y, children }: TooltipProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ left: x + 12, top: y + 12 });

  useEffect(() => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const pad = 8;
    let left = x + 12;
    let top = y + 12;

    if (left + rect.width > window.innerWidth - pad) {
      left = x - rect.width - 8;
    }
    if (top + rect.height > window.innerHeight - pad) {
      top = y - rect.height - 8;
    }
    if (left < pad) left = pad;
    if (top < pad) top = pad;

    setPos({ left, top });
  }, [x, y]);

  return (
    <div ref={ref} className="node-tooltip" style={{ left: pos.left, top: pos.top }}>
      {children}
    </div>
  );
}
