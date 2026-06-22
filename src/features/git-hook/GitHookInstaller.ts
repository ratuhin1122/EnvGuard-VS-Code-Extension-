import { exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';

const execAsync = promisify(exec);

/** Hook modes: `warn` prints and allows the push; `strict` blocks it. */
export type GitHookMode = 'warn' | 'strict';

/** Marker that identifies a pre-push hook as EnvGuard-managed. */
const MARKER = '# EnvGuard managed pre-push hook';

export interface InstallResult {
  hookPath: string;
  /** Set when a pre-existing, non-managed hook was backed up. */
  backedUp?: string;
}

export interface UninstallResult {
  removed: boolean;
  /** Set when a backed-up hook was restored. */
  restored?: string;
}

/**
 * Installs, refreshes, and removes the EnvGuard pre-push hook in a repo's
 * `.git/hooks` directory. The generated hook shells out to the compiled CLI
 * (`out/cli/validate.js`) located inside the extension install, so it must be
 * constructed with the extension's path.
 */
export class GitHookInstaller {
  public constructor(private readonly extensionPath: string) {}

  /** Resolve the repo root that owns `cwd`, throwing if it is not a git repo. */
  public async resolveRepoRoot(cwd: string): Promise<string> {
    const { stdout } = await execAsync('git rev-parse --show-toplevel', { cwd });
    return stdout.trim();
  }

  /** Whether the repo currently has an EnvGuard-managed pre-push hook. */
  public isManaged(repoRoot: string): boolean {
    const hookPath = this.hookPath(repoRoot);
    return fs.existsSync(hookPath) && fs.readFileSync(hookPath, 'utf-8').includes(MARKER);
  }

  public async install(repoRoot: string, mode: GitHookMode): Promise<InstallResult> {
    const hooksDir = path.join(repoRoot, '.git', 'hooks');
    await fs.promises.mkdir(hooksDir, { recursive: true });
    const hookPath = this.hookPath(repoRoot);

    let backedUp: string | undefined;
    if (fs.existsSync(hookPath)) {
      const existing = await fs.promises.readFile(hookPath, 'utf-8');
      if (!existing.includes(MARKER)) {
        backedUp = `${hookPath}.envguard-backup`;
        await fs.promises.copyFile(hookPath, backedUp);
      }
    }

    await fs.promises.writeFile(hookPath, this.script(mode), { mode: 0o755 });
    await fs.promises.chmod(hookPath, 0o755);
    return { hookPath, backedUp };
  }

  public async uninstall(repoRoot: string): Promise<UninstallResult> {
    const hookPath = this.hookPath(repoRoot);
    if (!this.isManaged(repoRoot)) {
      return { removed: false };
    }

    await fs.promises.rm(hookPath);

    const backup = `${hookPath}.envguard-backup`;
    if (fs.existsSync(backup)) {
      await fs.promises.copyFile(backup, hookPath);
      await fs.promises.chmod(hookPath, 0o755);
      await fs.promises.rm(backup);
      return { removed: true, restored: hookPath };
    }
    return { removed: true };
  }

  private hookPath(repoRoot: string): string {
    return path.join(repoRoot, '.git', 'hooks', 'pre-push');
  }

  private script(mode: GitHookMode): string {
    // Forward-slash the path so it is safe inside the POSIX hook script that
    // git runs even on Windows (via the bundled sh).
    const cli = path
      .join(this.extensionPath, 'out', 'cli', 'validate.js')
      .split(path.sep)
      .join('/');

    return [
      '#!/bin/sh',
      MARKER,
      '# Re-installed automatically by the EnvGuard extension. Manual edits will be overwritten.',
      'ROOT="$(git rev-parse --show-toplevel)"',
      `node "${cli}" --root "$ROOT" --mode ${mode}`,
      'exit $?',
      '',
    ].join('\n');
  }
}
