/** Strip null bytes and non-printable control characters (keep newlines/tabs). */
export function stripControlChars(value: string): string {
  // Remove null bytes and C0 control chars except tab (9), LF (10), CR (13)
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
}

/** Trim + strip control chars. Use before sending any string to Supabase. */
export function sanitizeText(value: string): string {
  return stripControlChars(value).trim();
}

/** Validate a string is within a byte-safe length (avoids very large payloads). */
export function withinMaxLength(value: string, max: number): boolean {
  return value.length <= max;
}
