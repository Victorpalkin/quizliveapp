import type { SlideElement, SlideBackground, PresentationSlide } from './presentation';

/**
 * Default frame dimensions in canvas pixels (16:9).
 * A frame is a viewport region on the infinite canvas.
 */
export const FRAME_WIDTH = 1280;
export const FRAME_HEIGHT = 720;
/** Horizontal gap between frames in the default left-to-right layout. */
export const FRAME_GAP = 160;
/** Id of the default sequence created during migration. */
export const DEFAULT_SEQUENCE_ID = 'main';

/**
 * A frame is a named rectangular viewport on the infinite canvas.
 *
 * v1 simplification: a frame CONTAINS its elements, and element
 * coordinates (x/y/width/height) remain percentages relative to the
 * frame — identical to the legacy slide model. This keeps the
 * slide<->canvas round-trip lossless. Free-floating elements that span
 * frames are a future enhancement.
 */
export interface Frame {
  id: string;
  name: string;
  /** Absolute X position of the frame on the infinite canvas, in px. */
  canvasX: number;
  /** Absolute Y position of the frame on the infinite canvas, in px. */
  canvasY: number;
  /** Frame width in canvas px. */
  width: number;
  /** Frame height in canvas px. */
  height: number;
  /** Elements with frame-relative percentage coordinates. */
  elements: SlideElement[];
  background?: SlideBackground;
  notes?: string;
  /** Reuses the legacy slide transition union for lossless v1 migration. */
  transition?: PresentationSlide['transition'];
  /** AI-assigned topic grouping (set by later AI features). */
  topicCluster?: string;
}

/** An ordered path through frames. Defines navigation order. */
export interface Sequence {
  id: string;
  name: string;
  frameIds: string[];
}

/** The infinite canvas: all frames plus the sequences that order them. */
export interface Canvas {
  frames: Frame[];
  sequences: Sequence[];
  defaultSequenceId: string;
}
