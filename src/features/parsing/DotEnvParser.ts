import { EnvEntry, EnvFileFormat } from '../../models';
import { IEnvParser } from '../../types';
import { splitLines, stripQuotes } from '../../utils/text';

/** Valid dotenv key: letters, digits, underscores; must not start with a digit. */
const KEY_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;

/**
 * Parses dotenv-style files: `.env`, `.env.local`, `.env.production`,
 * `.env.example`, and any other `.env.*` variant.
 *
 * Supported syntax:
 * - `KEY=value`
 * - `export KEY=value` (shell-sourceable files)
 * - single- and double-quoted values
 * - `#` full-line and trailing comments (trailing only for unquoted values)
 * - empty values (`KEY=`)
 */
export class DotEnvParser implements IEnvParser {
  public readonly format: EnvFileFormat = 'dotenv';

  public supports(fileName: string): boolean {
    return fileName === '.env' || fileName.startsWith('.env.');
  }

  public parse(content: string, filePath: string): EnvEntry[] {
    const entries: EnvEntry[] = [];
    const lines = splitLines(content);

    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim();
      if (trimmed === '' || trimmed.startsWith('#')) {
        continue;
      }

      const line = trimmed.startsWith('export ')
        ? trimmed.slice('export '.length).trim()
        : trimmed;

      const separator = line.indexOf('=');
      if (separator <= 0) {
        continue;
      }

      const key = line.slice(0, separator).trim();
      if (!KEY_PATTERN.test(key)) {
        continue;
      }

      const value = this.parseValue(line.slice(separator + 1).trim());
      entries.push({ key, value, file: filePath, line: i + 1 });
    }

    return entries;
  }

  private parseValue(raw: string): string {
    if (raw === '') {
      return '';
    }

    const quote = raw[0];
    if (quote === '"' || quote === "'") {
      // Quoted value: take everything up to the closing quote and ignore
      // anything after it (e.g. a trailing comment).
      const closing = raw.indexOf(quote, 1);
      if (closing > 0) {
        return raw.slice(1, closing);
      }
      // Unterminated quote: fall through and treat as a plain value.
      return stripQuotes(raw);
    }

    // Unquoted value: a ` #` starts a trailing comment.
    const comment = raw.search(/\s#/);
    return (comment >= 0 ? raw.slice(0, comment) : raw).trim();
  }
}
