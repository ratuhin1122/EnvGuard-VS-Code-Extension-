import * as vscode from 'vscode';
import { IComparisonService, ICommand, IEnvironmentDiscoveryService } from '../../types';
import { SessionState, TreeViewService } from '../../shared';

/**
 * EnvGuard: Scan Environment Files.
 * Re-discovers all environment files, runs the cross-file missing-key
 * audit, and refreshes the sidebar.
 */
export class ScanCommand implements ICommand {
  public readonly id = 'envguard.scan';

  public constructor(
    private readonly discovery: IEnvironmentDiscoveryService,
    private readonly comparison: IComparisonService,
    private readonly trees: TreeViewService,
    private readonly state: SessionState,
  ) {}

  public async execute(): Promise<void> {
    await this.run(false);
  }

  /** Shared workflow; `silent` suppresses the summary toast (used by Refresh). */
  public async run(silent: boolean): Promise<void> {
    const files = await this.discovery.refresh();
    const audit = this.comparison.findMissingKeys(files);

    this.state.files = files;
    this.state.audit = audit;
    this.trees.showFiles(files);
    this.trees.showMissingKeys(audit, files);

    if (!silent) {
      const keyCount = audit.missingKeys.length;
      void vscode.window.showInformationMessage(
        `EnvGuard: found ${files.length} environment file${files.length === 1 ? '' : 's'}, ` +
          `${keyCount} inconsistent key${keyCount === 1 ? '' : 's'}.`,
      );
    }
  }
}
