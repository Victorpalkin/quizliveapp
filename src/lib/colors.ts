/**
 * Shared color constants for the application.
 * Single source of truth for color gradients used across components.
 */

/**
 * Color gradient definitions for answer buttons and similar UI elements.
 * Each color includes:
 * - bg: Subtle background gradient (15% opacity)
 * - border: Border color with dark mode variant
 * - badge: Solid gradient for badges/icons
 * - selectedBg: Enhanced background when selected
 * - selectedBorder: Gradient border for selected state
 */
export const ANSWER_COLOR_GRADIENTS = [
  {
    bg: 'from-purple-500/15 to-purple-500/8',
    border: 'border-purple-200 dark:border-purple-900',
    badge: 'from-purple-500 to-purple-600',
    selectedBg: 'from-purple-500/20 to-transparent',
    selectedBorder: 'before:from-purple-500 before:to-purple-600',
  },
  {
    bg: 'from-blue-500/15 to-blue-500/8',
    border: 'border-blue-200 dark:border-blue-900',
    badge: 'from-blue-500 to-blue-600',
    selectedBg: 'from-blue-500/20 to-transparent',
    selectedBorder: 'before:from-blue-500 before:to-blue-600',
  },
  {
    bg: 'from-green-500/15 to-green-500/8',
    border: 'border-green-200 dark:border-green-900',
    badge: 'from-green-500 to-green-600',
    selectedBg: 'from-green-500/20 to-transparent',
    selectedBorder: 'before:from-green-500 before:to-green-600',
  },
  {
    bg: 'from-amber-500/15 to-amber-500/8',
    border: 'border-amber-200 dark:border-amber-900',
    badge: 'from-amber-500 to-amber-600',
    selectedBg: 'from-amber-500/20 to-transparent',
    selectedBorder: 'before:from-amber-500 before:to-amber-600',
  },
  {
    bg: 'from-rose-500/15 to-rose-500/8',
    border: 'border-rose-200 dark:border-rose-900',
    badge: 'from-rose-500 to-rose-600',
    selectedBg: 'from-rose-500/20 to-transparent',
    selectedBorder: 'before:from-rose-500 before:to-rose-600',
  },
  {
    bg: 'from-cyan-500/15 to-cyan-500/8',
    border: 'border-cyan-200 dark:border-cyan-900',
    badge: 'from-cyan-500 to-cyan-600',
    selectedBg: 'from-cyan-500/20 to-transparent',
    selectedBorder: 'before:from-cyan-500 before:to-cyan-600',
  },
  {
    bg: 'from-indigo-500/15 to-indigo-500/8',
    border: 'border-indigo-200 dark:border-indigo-900',
    badge: 'from-indigo-500 to-indigo-600',
    selectedBg: 'from-indigo-500/20 to-transparent',
    selectedBorder: 'before:from-indigo-500 before:to-indigo-600',
  },
  {
    bg: 'from-pink-500/15 to-pink-500/8',
    border: 'border-pink-200 dark:border-pink-900',
    badge: 'from-pink-500 to-pink-600',
    selectedBg: 'from-pink-500/20 to-transparent',
    selectedBorder: 'before:from-pink-500 before:to-pink-600',
  },
];

/**
 * Tile colors for thought/card displays.
 * Uses slightly stronger opacity (20%) for tile backgrounds.
 */
export const TILE_COLORS = [
  { bg: 'from-purple-500/20 to-purple-500/10', border: 'border-purple-300 dark:border-purple-800' },
  { bg: 'from-blue-500/20 to-blue-500/10', border: 'border-blue-300 dark:border-blue-800' },
  { bg: 'from-pink-500/20 to-pink-500/10', border: 'border-pink-300 dark:border-pink-800' },
  { bg: 'from-cyan-500/20 to-cyan-500/10', border: 'border-cyan-300 dark:border-cyan-800' },
  { bg: 'from-amber-500/20 to-amber-500/10', border: 'border-amber-300 dark:border-amber-800' },
  { bg: 'from-emerald-500/20 to-emerald-500/10', border: 'border-emerald-300 dark:border-emerald-800' },
  { bg: 'from-rose-500/20 to-rose-500/10', border: 'border-rose-300 dark:border-rose-800' },
  { bg: 'from-indigo-500/20 to-indigo-500/10', border: 'border-indigo-300 dark:border-indigo-800' },
];

export type ColorGradient = typeof ANSWER_COLOR_GRADIENTS[number];
export type TileColor = typeof TILE_COLORS[number];
