import * as vscode from 'vscode';
import { IComparisonService, ICommand, IEnvironmentDiscoveryService, IReportService } from '../../types';
import { SessionState } from '../../shared';

/**
 * EnvGuard: Export Report.
 * Writes report.json (missing keys, extra keys, value differences) to the
 * workspace root. Runs the cross-file audit on the spot if the user hasn't
 * scanned yet, so the command always works.
 */
export class ExportReportCommand implements ICommand {
  public readonly id = 'envguard.exportReport';

  public constructor(
    private readonly discovery: IEnvironmentDiscoveryService,
    private readonly comparison: IComparisonService,
    private readonly reports: IReportService,
    private readonly state: SessionState,
  ) {}

  public async execute(): Promise<void> {
    if (!this.state.audit) {
      const files = await this.discovery.getEnvironmentFiles();
      this.state.files = files;
      this.state.audit = this.comparison.findMissingKeys(files);
    }

    const report = this.reports.build(this.state.audit, this.state.comparison?.result);
    const writtenPath = await this.reports.write(report);

    const action = await vscode.window.showInformationMessage(
      `EnvGuard: report exported to ${writtenPath}`,
      'Open Report',
    );
    if (action === 'Open Report') {
      const document = await vscode.workspace.openTextDocument(writtenPath);
      await vscode.window.showTextDocument(document, { preview: false });
    }
  }
}
