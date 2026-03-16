import type { SlideElement } from '@/lib/types';

type ConnectorRoutingType = 'straight' | 'elbow' | 'curved';
type AnchorPosition = 'top' | 'bottom' | 'left' | 'right';

/**
 * Compute the SVG path `d` attribute for a straight connector.
 * Coordinates are relative to the SVG viewBox (0-100% range mapped to local space).
 */
export function computeStraightPath(
  startX: number, startY: number,
  endX: number, endY: number
): string {
  return `M ${startX} ${startY} L ${endX} ${endY}`;
}

/**
 * Compute the SVG path `d` attribute for an elbow (orthogonal) connector.
 */
export function computeElbowPath(
  startX: number, startY: number,
  endX: number, endY: number
): string {
  const midX = (startX + endX) / 2;
  return `M ${startX} ${startY} H ${midX} V ${endY} H ${endX}`;
}

/**
 * Compute the SVG path `d` attribute for a curved (bezier) connector.
 */
export function computeCurvedPath(
  startX: number, startY: number,
  endX: number, endY: number
): string {
  const dx = endX - startX;
  const dy = endY - startY;

  // Control points offset along the dominant axis
  const cpOffset = Math.max(Math.abs(dx), Math.abs(dy)) * 0.4;

  let cp1x: number, cp1y: number, cp2x: number, cp2y: number;

  if (Math.abs(dx) >= Math.abs(dy)) {
    // Horizontal-dominant: offset control points horizontally
    cp1x = startX + cpOffset;
    cp1y = startY;
    cp2x = endX - cpOffset;
    cp2y = endY;
  } else {
    // Vertical-dominant: offset control points vertically
    cp1x = startX;
    cp1y = startY + (dy > 0 ? cpOffset : -cpOffset);
    cp2x = endX;
    cp2y = endY + (dy > 0 ? -cpOffset : cpOffset);
  }

  return `M ${startX} ${startY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${endX} ${endY}`;
}

/**
 * Compute the SVG path based on routing type.
 */
export function computeConnectorPath(
  routingType: ConnectorRoutingType,
  startX: number, startY: number,
  endX: number, endY: number
): string {
  switch (routingType) {
    case 'elbow':
      return computeElbowPath(startX, startY, endX, endY);
    case 'curved':
      return computeCurvedPath(startX, startY, endX, endY);
    default:
      return computeStraightPath(startX, startY, endX, endY);
  }
}

/**
 * Compute the bounding box from connector endpoint coordinates.
 * Returns { x, y, width, height } as percentages.
 */
export function computeConnectorBoundingBox(
  startX: number, startY: number,
  endX: number, endY: number,
  padding = 1
): { x: number; y: number; width: number; height: number } {
  const minX = Math.min(startX, endX) - padding;
  const minY = Math.min(startY, endY) - padding;
  const maxX = Math.max(startX, endX) + padding;
  const maxY = Math.max(startY, endY) + padding;

  return {
    x: Math.max(0, minX),
    y: Math.max(0, minY),
    width: Math.max(2, maxX - minX),
    height: Math.max(2, maxY - minY),
  };
}

/**
 * Compute the absolute position (% of slide) for an anchor on a given element.
 */
export function computeAnchorPosition(
  element: SlideElement,
  anchor: AnchorPosition
): { x: number; y: number } {
  switch (anchor) {
    case 'top':
      return { x: element.x + element.width / 2, y: element.y };
    case 'bottom':
      return { x: element.x + element.width / 2, y: element.y + element.height };
    case 'left':
      return { x: element.x, y: element.y + element.height / 2 };
    case 'right':
      return { x: element.x + element.width, y: element.y + element.height / 2 };
  }
}

/**
 * Find the closest anchor on an element to a given point.
 * Returns the anchor name and distance.
 */
export function findClosestAnchor(
  element: SlideElement,
  pointX: number, pointY: number
): { anchor: AnchorPosition; distance: number; x: number; y: number } {
  const anchors: AnchorPosition[] = ['top', 'bottom', 'left', 'right'];
  let best = { anchor: 'top' as AnchorPosition, distance: Infinity, x: 0, y: 0 };

  for (const anchor of anchors) {
    const pos = computeAnchorPosition(element, anchor);
    const dist = Math.sqrt((pos.x - pointX) ** 2 + (pos.y - pointY) ** 2);
    if (dist < best.distance) {
      best = { anchor, distance: dist, x: pos.x, y: pos.y };
    }
  }

  return best;
}

/**
 * Convert connector absolute endpoint coordinates to local SVG coordinates
 * within the bounding box.
 */
export function toLocalCoords(
  absX: number, absY: number,
  bbox: { x: number; y: number; width: number; height: number }
): { x: number; y: number } {
  return {
    x: ((absX - bbox.x) / bbox.width) * 100,
    y: ((absY - bbox.y) / bbox.height) * 100,
  };
}
