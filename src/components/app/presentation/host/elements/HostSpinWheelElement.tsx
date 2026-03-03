'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import type { SlideElement } from '@/lib/types';

interface HostSpinWheelElementProps {
  element: SlideElement;
  playerNames: string[];
}

const DEFAULT_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4'];

export function HostSpinWheelElement({ element, playerNames }: HostSpinWheelElementProps) {
  const config = element.spinWheelConfig;
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);

  const segments = config?.mode === 'players'
    ? playerNames.map((name, i) => ({ label: name, color: DEFAULT_COLORS[i % DEFAULT_COLORS.length] }))
    : (config?.segments || []).map((s, i) => ({ label: s.label, color: s.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length] }));

  const spin = useCallback(() => {
    if (spinning || segments.length === 0) return;
    setSpinning(true);
    setWinner(null);

    const extraSpins = 5 + Math.random() * 5;
    const targetDeg = extraSpins * 360 + Math.random() * 360;
    setRotation((prev) => prev + targetDeg);

    setTimeout(() => {
      const finalAngle = (rotation + targetDeg) % 360;
      const segmentAngle = 360 / segments.length;
      const winnerIndex = Math.floor((360 - finalAngle) / segmentAngle) % segments.length;
      setWinner(segments[winnerIndex]?.label || null);
      setSpinning(false);
    }, 4000);
  }, [spinning, segments, rotation]);

  if (segments.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
        {config?.mode === 'players' ? 'Waiting for players...' : 'No segments configured'}
      </div>
    );
  }

  const segAngle = 360 / segments.length;

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-4">
      {/* Wheel */}
      <div className="relative" style={{ width: '280px', height: '280px' }}>
        {/* Pointer */}
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[12px] border-r-[12px] border-t-[20px] border-l-transparent border-r-transparent border-t-foreground z-10" />

        {/* Wheel SVG */}
        <svg
          viewBox="0 0 200 200"
          className="w-full h-full transition-transform"
          style={{
            transform: `rotate(${rotation}deg)`,
            transitionDuration: spinning ? '4s' : '0s',
            transitionTimingFunction: 'cubic-bezier(0.17, 0.67, 0.12, 0.99)',
          }}
        >
          {segments.map((seg, i) => {
            const startAngle = (i * segAngle * Math.PI) / 180;
            const endAngle = ((i + 1) * segAngle * Math.PI) / 180;
            const x1 = 100 + 95 * Math.cos(startAngle);
            const y1 = 100 + 95 * Math.sin(startAngle);
            const x2 = 100 + 95 * Math.cos(endAngle);
            const y2 = 100 + 95 * Math.sin(endAngle);
            const largeArc = segAngle > 180 ? 1 : 0;

            const midAngle = ((i + 0.5) * segAngle * Math.PI) / 180;
            const textX = 100 + 60 * Math.cos(midAngle);
            const textY = 100 + 60 * Math.sin(midAngle);
            const textRotation = (i + 0.5) * segAngle;

            return (
              <g key={i}>
                <path
                  d={`M100,100 L${x1},${y1} A95,95 0 ${largeArc},1 ${x2},${y2} Z`}
                  fill={seg.color}
                  stroke="white"
                  strokeWidth="1"
                />
                <text
                  x={textX}
                  y={textY}
                  fill="white"
                  fontSize="8"
                  fontWeight="bold"
                  textAnchor="middle"
                  dominantBaseline="central"
                  transform={`rotate(${textRotation}, ${textX}, ${textY})`}
                >
                  {seg.label.slice(0, 12)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Spin button & winner */}
      <div className="mt-4 text-center">
        {winner ? (
          <div className="text-2xl font-bold text-primary animate-bounce">{winner}</div>
        ) : (
          <Button onClick={spin} disabled={spinning} size="lg" variant="gradient">
            {spinning ? 'Spinning...' : 'Spin!'}
          </Button>
        )}
        {config?.action && winner && (
          <p className="text-sm text-muted-foreground mt-2">{config.action}</p>
        )}
      </div>
    </div>
  );
}
