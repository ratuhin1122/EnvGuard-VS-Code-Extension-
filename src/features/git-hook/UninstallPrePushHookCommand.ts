import * as vscode from 'vscode';
import { ICommand } from '../../types';
import { GitHookInstaller } from './GitHookInstaller';

/**
 * EnvGuard: Uninstall Pre-Push Hook.
 * Removes the EnvGuard-managed `.git/hooks/pre-push`, restoring any hook that
 * was backed up at install time. Leaves non-managed hooks untouched.
 */
export class UninstallPrePushHookCommand implements ICommand {
  public readonly id = 'envguard.uninstallPrePushHook';

  public constructor(private readonly installer: GitHookInstaller) {}

  public async execute(): Promise<void> {
    const folder = vscode.workspace.workspaceFolders?.[0];
    if (!folder) {
      void vscode.window.showWarningMessage('EnvGuard: open a folder to manage the git hook.');
      return;
    }

    let repoRoot: string;
    try {
      repoRoot = await this.installer.resolveRepoRoot(folder.uri.fsPath);
    } catch {
      void vscode.window.showWarningMessage('EnvGuard: this folder is not a git repository.');
      return;
    }

    const result = await this.installer.uninstall(repoRoot);
    if (!result.removed) {
      void vscode.window.showInformationMessage('EnvGuard: no EnvGuard pre-push hook to remove.');
      return;
    }
    const detail = result.restored ? ' Previous hook restored.' : '';
    void vscode.window.showInformationMessage(`EnvGuard: pre-push hook removed.${detail}`);
  }
}
