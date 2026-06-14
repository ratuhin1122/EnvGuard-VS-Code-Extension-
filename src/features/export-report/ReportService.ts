import * as vscode from 'vscode';
import { ComparisonResult, EnvReport, MissingKeyReport } from '../../models';
import { IReportService } from '../../types';
import { buildReport } from './reportBuilder';

const REPORT_FILE_NAME = 'report.json';

/**
 * Builds the EnvGuard report and persists it as `report.json` in the
 * workspace root.
 */
export class ReportService implements IReportService {
  public build(audit: MissingKeyReport, comparison?: ComparisonResult): EnvReport {
    return buildReport(audit, comparison);
  }

  public async write(report: EnvReport): Promise<string> {
    const root = vscode.workspace.workspaceFolders?.[0];
    if (!root) {
      throw new Error('Open a folder before exporting a report.');
    }

    const uri = vscode.Uri.joinPath(root.uri, REPORT_FILE_NAME);
    const content = new TextEncoder().encode(JSON.stringify(report, null, 2) + '\n');
    await vscode.workspace.fs.writeFile(uri, content);
    return uri.fsPath;
  }
}
