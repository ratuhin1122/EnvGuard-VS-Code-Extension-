import { EnvEntry, EnvFileFormat } from '../../models';
import { IEnvParser } from '../../types';
import { splitLines } from '../../utils/text';

/**
 * Parses Java-style `.properties` files (e.g. `application.properties`).
 *
 * Supported syntax:
 * - `key=value` and `key: value`
 * - `#` and `!` comment lines
 * - backslash line continuations
 * - escaped separators inside keys (`a\=b=value`)
 */
export class PropertiesParser implements IEnvParser {
  public readonly format: EnvFileFormat = 'properties';

  public supports(fileName: string): boolean {
    return fileName.endsWith('.properties');
  }

  public parse(content: string, filePath: string): EnvEntry[] {
    const entries: EnvEntry[] = [];
    const lines = splitLines(content);

    for (let i = 0; i < lines.length; i++) {
      const startLine = i + 1;
      let logical = lines[i];

      // A line ending with an odd number of backslashes continues onto the
      // next physical line (leading whitespace of the next line is ignored).
      while (this.continuesOnNextLine(logical) && i + 1 < lines.length) {
        logical = logical.slice(0, -1) + lines[++i].replace(/^\s+/, '');
      }

      const trimmed = logical.trim();
      if (trimmed === '' || trimmed.startsWith('#') || trimmed.startsWith('!')) {
        continue;
      }

      const separator = this.findSeparator(trimmed);
      if (separator <= 0) {
        continue;
      }

      const key = this.unescape(trimmed.slice(0, separator).trim());
      const value = trimmed.slice(separator + 1).trim();
      if (key === '') {
        continue;
      }

      entries.push({ key, value, file: filePath, line: startLine });
    }

    return entries;
  }

  /** Index of the first unescaped `=` or `:`, or -1 when absent. */
  private findSeparator(line: string): number {
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '\\') {
        i++; // skip the escaped character
        continue;
      }
      if (ch === '=' || ch === ':') {
        return i;
      }
    }
    return -1;
  }

  private continuesOnNextLine(line: string): boolean {
    let backslashes = 0;
    for (let i = line.length - 1; i >= 0 && line[i] === '\\'; i--) {
      backslashes++;
    }
    return backslashes % 2 === 1;
  }

  private unescape(text: string): string {
    return text.replace(/\\([=:#! \\])/g, '$1');
  }
}
