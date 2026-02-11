/**
 * Animation type definitions
 *
 * Common interfaces for animation effects used across the app.
 */

/**
 * Glitch Block
 *
 * Represents a rectangular block used in glitch/corruption animations.
 * Used by CorruptionEffect and DiscoverySequence components.
 */
export interface GlitchBlock {
  /** X position of the block */
  x: number;

  /** Y position of the block */
  y: number;

  /** Width of the block */
  w: number;

  /** Height of the block */
  h: number;

  /** Background color of the block (hex or rgba) */
  color: string;

  /** Opacity value (0-1) */
  opacity: number;
}

/**
 * Tear Block
 *
 * Represents a rectangular block used in tearing/redaction animations.
 * Similar to GlitchBlock but without opacity (always solid).
 */
export interface TearBlock {
  /** X position of the block */
  x: number;

  /** Y position of the block */
  y: number;

  /** Width of the block */
  w: number;

  /** Height of the block */
  h: number;

  /** Background color of the block (hex or rgba) */
  color: string;
}
