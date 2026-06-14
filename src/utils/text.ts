/** Small text helpers shared by parsers. */

/**
 * Strip one matching pair of surrounding single or double quotes.
 * Leaves unbalanced or interior quotes untouched.
 */
export function stripQuotes(value: string): string {
  if (value.length >= 2) {
    const first = value[0];
    const last = value[value.length - 1];
    if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
      return value.slice(1, -1);
    }
  }
  return value;
}

/** Shorten a value for one-line tree display. */
export function truncate(value: string, maxLength = 40): string {
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}…` : value;
}

/** Split file content into lines, tolerating both LF and CRLF endings. */
export function splitLines(content: string): string[] {
  return content.split(/\r?\n/);
}
