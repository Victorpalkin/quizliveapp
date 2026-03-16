'use client';

import { useCallback } from 'react';
import type { SlideElement } from '@/lib/types';
import {
  computeConnectorBoundingBox,
  toLocalCoords,
  findClosestAnchor,
} from '@/lib/utils/connector-paths';

interface ConnectorSelectionOverlayProps {
  element: SlideElement;
  canvasRef: React.RefObject<HTMLDivElement | null>;
  slideElements: SlideElement[];
  onUpdateConnector: (updates: Partial<SlideElement>) => void;
}

const SNAP_THRESHOLD = 3; // % of slide

export function ConnectorSelectionOverlay({
  element,
  canvasRef,
  slideElements,
  onUpdateConnector,
}: ConnectorSelectionOverlayProps) {
  const config = element.connectorConfig;
  if (!config) return null;

  const bbox = computeConnectorBoundingBox(
    config.startX, config.startY,
    config.endX, config.endY
  );

  const localStart = toLocalCoords(config.startX, config.startY, bbox);
  const localEnd = toLocalCoords(config.endX, config.endY, bbox);

  const handleEndpointDrag = useCallback(
    (e: React.MouseEvent, endpoint: 'start' | 'end') => {
      e.stopPropagation();
      e.preventDefault();

      const canvas = canvasRef.current;
      if (!canvas || !config) return;

      const rect = canvas.getBoundingClientRect();

      const handleMouseMove = (ev: MouseEvent) => {
        const absX = ((ev.clientX - rect.left) / rect.width) * 100;
        const absY = ((ev.clientY - rect.top) / rect.height) * 100;

        const clampedX = Math.max(0, Math.min(100, absX));
        const clampedY = Math.max(0, Math.min(100, absY));

        // Check for snap to shape anchors
        let attachment: { elementId: string; anchor: 'top' | 'bottom' | 'left' | 'right' } | undefined;
        let snapX = clampedX;
        let snapY = clampedY;

        for (const el of slideElements) {
          if (el.id === element.id || el.type === 'connector') continue;
          const closest = findClosestAnchor(el, clampedX, clampedY);
          if (closest.distance < SNAP_THRESHOLD) {
            snapX = closest.x;
            snapY = closest.y;
            attachment = { elementId: el.id, anchor: closest.anchor };
            break;
          }
        }

        const newConfig = { ...config };
        if (endpoint === 'start') {
          newConfig.startX = snapX;
          newConfig.startY = snapY;
          newConfig.startAttachment = attachment;
        } else {
          newConfig.endX = snapX;
          newConfig.endY = snapY;
          newConfig.endAttachment = attachment;
        }

        const newBbox = computeConnectorBoundingBox(
          newConfig.startX, newConfig.startY,
          newConfig.endX, newConfig.endY
        );

        onUpdateConnector({
          connectorConfig: newConfig,
          x: newBbox.x,
          y: newBbox.y,
          width: newBbox.width,
          height: newBbox.height,
        });
      };

      const handleMouseUp = () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    },
    [canvasRef, config, element.id, slideElements, onUpdateConnector]
  );

  return (
    <>
      {/* Selection border (dashed for connectors) */}
      <div className="absolute inset-0 border border-dashed border-primary/50 pointer-events-none rounded-sm" />

      {/* Start endpoint handle */}
      <div
        className="absolute w-4 h-4 bg-primary border-2 border-white rounded-full z-10 hover:scale-125 transition-transform shadow-sm cursor-crosshair"
        style={{
          left: `${localStart.x}%`,
          top: `${localStart.y}%`,
          transform: 'translate(-50%, -50%)',
        }}
        onMouseDown={(e) => handleEndpointDrag(e, 'start')}
      />

      {/* End endpoint handle */}
      <div
        className="absolute w-4 h-4 bg-primary border-2 border-white rounded-full z-10 hover:scale-125 transition-transform shadow-sm cursor-crosshair"
        style={{
          left: `${localEnd.x}%`,
          top: `${localEnd.y}%`,
          transform: 'translate(-50%, -50%)',
        }}
        onMouseDown={(e) => handleEndpointDrag(e, 'end')}
      />

      {/* Attachment indicators */}
      {config.startAttachment && (
        <div
          className="absolute w-2 h-2 bg-green-500 rounded-full z-10 pointer-events-none"
          style={{
            left: `${localStart.x}%`,
            top: `${localStart.y}%`,
            transform: 'translate(-50%, -50%)',
          }}
        />
      )}
      {config.endAttachment && (
        <div
          className="absolute w-2 h-2 bg-green-500 rounded-full z-10 pointer-events-none"
          style={{
            left: `${localEnd.x}%`,
            top: `${localEnd.y}%`,
            transform: 'translate(-50%, -50%)',
          }}
        />
      )}
    </>
  );
}
