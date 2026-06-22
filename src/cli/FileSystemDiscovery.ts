import * as fs from 'fs';
import * as path from 'path';
import { EnvFile } from '../models';
import { IEnvironmentParserService, IEnvironmentSource } from '../types';

/** Directories that never contain project-owned environment config. */
const EXCLUDE_DIRS = new Set([
  'node_modules',
  'vendor',
  'dist',
  'build',
  'out',
  'target',
  '.git',
  'venv',
  '.venv',
  '__pycache__',
]);

/**
 * Name gate mirroring EnvironmentDiscoveryService's INCLUDE_GLOB:
 * `.env` / `.env.*`, and `application*` config files. The parser service
 * still has the final say on whether a candidate is actually understood.
 */
function isCandidate(name: string): boolean {
  return name === '.env' || name.startsWith('.env.') || name.startsWith('application');
}

/**
 * Filesystem-backed discovery for the standalone git-hook CLI.
 *
 * Mirrors EnvironmentDiscoveryService's include/exclude rules but walks the
 * repo with Node `fs` instead of `vscode.workspace.findFiles`, so it runs
 * outside the extension host. Reuses the parser service unchanged.
 */
export class FileSystemDiscovery implements IEnvironmentSource {
  public readonly id = 'filesystem';
  public readonly label = 'Filesystem';

  public constructor(
    private readonly root: string,
    private readonly parserService: IEnvironmentParserService,
  ) {}

  public async getEnvironmentFiles(): Promise<EnvFile[]> {
    const files: EnvFile[] = [];
    await this.walk(this.root, files);
    files.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
    return files;
  }

  private async walk(dir: string, out: EnvFile[]): Promise<void> {
    let entries: fs.Dirent[];
    try {
      entries = await fs.promises.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!EXCLUDE_DIRS.has(entry.name)) {
          await this.walk(full, out);
        }
        continue;
      }
      if (!entry.isFile() || !isCandidate(entry.name)) {
        continue;
      }

      const format = this.parserService.formatOf(entry.name);
      if (!format) {
        continue;
      }

      const relativePath = path.relative(this.root, full).split(path.sep).join('/');
      try {
        const content = await fs.promises.readFile(full, 'utf-8');
        const parsed = this.parserService.parse(entry.name, content, relativePath);
        out.push({ fsPath: full, relativePath, name: entry.name, format, entries: parsed });
      } catch {
        // Unreadable/unparseable file: skip silently — a hook must never crash a push.
      }
    }
  }
}
