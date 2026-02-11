/**
 * Input Sanitization & Validation (P1.9)
 *
 * Provides security-focused input validation and sanitization for user-generated content.
 * Prevents injection attacks, hidden characters, and malformed input.
 */

const MAX_MESSAGE_LENGTH = 2000;
const MAX_PASSCODE_LENGTH = 10;
const MAX_GAME_INPUT_LENGTH = 500;

/**
 * Sanitize user input by removing dangerous/invisible characters
 * @param input - Raw user input
 * @returns Cleaned string
 */
export function sanitizeInput(input: string): string {
  let cleaned = input;

  // Remove control characters (except newline, tab, carriage return)
  cleaned = cleaned.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, '');

  // Remove RTL/LTR override characters (text spoofing prevention)
  cleaned = cleaned.replace(/[\u202A-\u202E]/g, '');

  // Remove zero-width characters (hidden text prevention)
  cleaned = cleaned.replace(/[\u200B-\u200D\uFEFF]/g, '');

  // Normalize whitespace (collapse multiple spaces, trim)
  cleaned = cleaned.trim().replace(/\s+/g, ' ');

  return cleaned;
}

/**
 * Validate and sanitize message input
 * @param input - Raw message text
 * @returns Validation result with sanitized text or error
 */
export function validateMessageInput(input: string): {
  valid: boolean;
  error?: string;
  sanitized?: string;
} {
  const sanitized = sanitizeInput(input);

  if (sanitized.length === 0) {
    return { valid: false, error: 'Message cannot be empty' };
  }

  if (sanitized.length > MAX_MESSAGE_LENGTH) {
    return {
      valid: false,
      error: `Message too long (max ${MAX_MESSAGE_LENGTH} characters)`,
    };
  }

  return { valid: true, sanitized };
}

/**
 * Validate passcode input (numeric only)
 * @param input - Raw passcode string
 * @returns Validation result
 */
export function validatePasscodeInput(input: string): {
  valid: boolean;
  error?: string;
  sanitized?: string;
} {
  // Passcode should be numeric only
  const sanitized = input.replace(/\D/g, ''); // Remove non-digits

  if (sanitized.length === 0) {
    return { valid: false, error: 'Passcode cannot be empty' };
  }

  if (sanitized.length > MAX_PASSCODE_LENGTH) {
    return {
      valid: false,
      error: `Passcode too long (max ${MAX_PASSCODE_LENGTH} digits)`,
    };
  }

  return { valid: true, sanitized };
}

/**
 * Validate game input (commands, answers, etc.)
 * @param input - Raw game input
 * @returns Validation result
 */
export function validateGameInput(input: string): {
  valid: boolean;
  error?: string;
  sanitized?: string;
} {
  const sanitized = sanitizeInput(input);

  if (sanitized.length === 0) {
    return { valid: false, error: 'Input cannot be empty' };
  }

  if (sanitized.length > MAX_GAME_INPUT_LENGTH) {
    return {
      valid: false,
      error: `Input too long (max ${MAX_GAME_INPUT_LENGTH} characters)`,
    };
  }

  return { valid: true, sanitized };
}

/**
 * Validate custom decoy message input
 * @param input - Raw decoy message
 * @returns Validation result
 */
export function validateDecoyMessageInput(input: string): {
  valid: boolean;
  error?: string;
  sanitized?: string;
} {
  // Decoy messages use same rules as regular messages
  return validateMessageInput(input);
}

/**
 * Sanitize display text (for rendering, not storage)
 * More permissive than input sanitization
 * @param text - Text to display
 * @returns Safe display text
 */
export function sanitizeDisplayText(text: string): string {
  // Only remove the most dangerous characters
  // Keep most unicode for international support

  // Remove control characters (except newline, tab)
  let cleaned = text.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, '');

  // Remove zero-width characters (hidden text)
  cleaned = cleaned.replace(/[\u200B-\u200D\uFEFF]/g, '');

  return cleaned;
}
