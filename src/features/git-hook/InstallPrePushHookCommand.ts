import * as vscode from 'vscode';
import { ICommand } from '../../types';
import { GitHookInstaller, GitHookMode } from './GitHookInstaller';

/** Read the configured hook mode, defaulting to the non-blocking `warn`. */
export function readGitHookMode(): GitHookMode {
  const value = vscode.workspace.getConfiguration('envguard').get<string>('gitHook.mode');
  return value === 'strict' ? 'strict' : 'warn';
}

/**
 * EnvGuard: Install Pre-Push Hook.
 * Writes a `.git/hooks/pre-push` that runs environment validation before each
 * push, in the mode configured by `envguard.gitHook.mode`.
 */
export class InstallPrePushHookCommand implements ICommand {
  public readonly id = 'envguard.installPrePushHook';

  public constructor(private readonly installer: GitHookInstaller) {}

  public async execute(): Promise<void> {
    const folder = vscode.workspace.workspaceFolders?.[0];
    if (!folder) {
      void vscode.window.showWarningMessage('EnvGuard: open a folder to install the git hook.');
      return;
    }

    let repoRoot: string;
    try {
      repoRoot = await this.installer.resolveRepoRoot(folder.uri.fsPath);
    } catch {
      void vscode.window.showWarningMessage(
        'EnvGuard: this folder is not a git repository — run "git init" first.',
      );
      return;
    }

    const mode = readGitHookMode();
    const result = await this.installer.install(repoRoot, mode);
    const detail = result.backedUp ? ' Existing pre-push hook backed up.' : '';
    void vscode.window.showInformationMessage(
      `EnvGuard: pre-push hook installed in "${mode}" mode.${detail}`,
    );
  }
}
