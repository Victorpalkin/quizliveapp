'use client';

import type { SlideElement } from '@/lib/types';
import {
  computeConnectorPath,
  computeConnectorBoundingBox,
  toLocalCoords,
} from '@/lib/utils/connector-paths';

interface ConnectorElementProps {
  element: SlideElement;
}

export function ConnectorElement({ element }: ConnectorElementProps) {
  const config = element.connectorConfig;
  if (!config) return null;

  const bbox = computeConnectorBoundingBox(
    config.startX, config.startY,
    config.endX, config.endY
  );

  const localStart = toLocalCoords(config.startX, config.startY, bbox);
  const localEnd = toLocalCoords(config.endX, config.endY, bbox);

  const pathD = computeConnectorPath(
    config.routingType,
    localStart.x, localStart.y,
    localEnd.x, localEnd.y
  );

  const markerId = `arrow-${element.id}`;
  const markerStartId = `arrow-start-${element.id}`;

  const strokeDasharray =
    config.strokeStyle === 'dashed'
      ? '8 4'
      : config.strokeStyle === 'dotted'
        ? '2 4'
        : undefined;

  return (
    <svg
      className="w-full h-full overflow-visible"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
    >
      <defs>
        {config.endArrow === 'arrow' && (
          <marker
            id={markerId}
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill={config.strokeColor} />
          </marker>
        )}
        {config.startArrow === 'arrow' && (
          <marker
            id={markerStartId}
            viewBox="0 0 10 10"
            refX="1"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 10 0 L 0 5 L 10 10 z" fill={config.strokeColor} />
          </marker>
        )}
      </defs>

      {/* Invisible hit area for easier clicking */}
      <path
        d={pathD}
        fill="none"
        stroke="transparent"
        strokeWidth={Math.max(12, config.strokeWidth * 4)}
        vectorEffect="non-scaling-stroke"
      />

      {/* Visible connector line */}
      <path
        d={pathD}
        fill="none"
        stroke={config.strokeColor}
        strokeWidth={config.strokeWidth}
        strokeDasharray={strokeDasharray}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
        markerEnd={config.endArrow === 'arrow' ? `url(#${markerId})` : undefined}
        markerStart={config.startArrow === 'arrow' ? `url(#${markerStartId})` : undefined}
      />
    </svg>
  );
}
