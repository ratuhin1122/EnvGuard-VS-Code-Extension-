import * as vscode from 'vscode';
import { EnvFile } from '../../models';
import { IComparisonService, ICommand, IEnvironmentDiscoveryService } from '../../types';
import { SessionState, TreeViewService } from '../../shared';
import { ComparisonPanel } from './ComparisonPanel';

interface FilePickItem extends vscode.QuickPickItem {
  file: EnvFile;
}

/**
 * EnvGuard: Compare Files.
 * Lets the user pick a base and a target from the discovered files, runs
 * the comparison, updates the sidebar, and opens the report panel.
 */
export class CompareCommand implements ICommand {
  public readonly id = 'envguard.compare';

  public constructor(
    private readonly discovery: IEnvironmentDiscoveryService,
    private readonly comparison: IComparisonService,
    private readonly trees: TreeViewService,
    private readonly state: SessionState,
  ) {}

  public async execute(): Promise<void> {
    const files = await this.discovery.getEnvironmentFiles();
    if (files.length < 2) {
      void vscode.window.showWarningMessage(
        'EnvGuard: need at least two environment files to compare. Run "EnvGuard: Scan Environment Files" first.',
      );
      return;
    }

    const base = await this.pickFile(files, 'Select the BASE file (the reference, e.g. .env.example)');
    if (!base) {
      return;
    }

    const remaining = files.filter((f) => f !== base);
    const target = await this.pickFile(remaining, `Compare ${base.name} against…`);
    if (!target) {
      return;
    }

    const result = this.comparison.compare(base, target);
    this.state.comparison = { result, base, target };
    this.trees.showComparison(result, base, target);
    ComparisonPanel.show(result);
  }

  private async pickFile(files: EnvFile[], placeHolder: string): Promise<EnvFile | undefined> {
    const items: FilePickItem[] = files.map((file) => ({
      label: file.name,
      description: file.relativePath,
      detail: `${file.entries.length} keys · ${file.format}`,
      file,
    }));
    const picked = await vscode.window.showQuickPick(items, {
      placeHolder,
      matchOnDescription: true,
    });
    return picked?.file;
  }
}
