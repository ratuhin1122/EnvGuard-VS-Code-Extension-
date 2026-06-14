import * as vscode from 'vscode';
import { ComparisonResult, EnvFile, MissingKeyReport } from '../models';
import { EnvironmentFilesTreeProvider } from '../features/discovery/EnvironmentFilesTreeProvider';
import { ComparisonResultsTreeProvider } from '../features/comparison/ComparisonResultsTreeProvider';
import { MissingKeysTreeProvider } from '../features/missing-keys/MissingKeysTreeProvider';

/**
 * Owns the three EnvGuard sidebar views: registers them, pushes new state
 * into the providers, and maintains empty-state messages.
 *
 * Providers are pure renderers — they never run discovery or comparison
 * themselves. Commands orchestrate services and hand results to this class.
 */
export class TreeViewService implements vscode.Disposable {
  private readonly filesProvider = new EnvironmentFilesTreeProvider();
  private readonly missingKeysProvider = new MissingKeysTreeProvider();
  private readonly comparisonProvider = new ComparisonResultsTreeProvider();

  private readonly filesView: vscode.TreeView<unknown>;
  private readonly missingKeysView: vscode.TreeView<unknown>;
  private readonly comparisonView: vscode.TreeView<unknown>;

  public constructor() {
    this.filesView = vscode.window.createTreeView('envguard.environmentFiles', {
      treeDataProvider: this.filesProvider as vscode.TreeDataProvider<unknown>,
    });
    this.missingKeysView = vscode.window.createTreeView('envguard.missingKeys', {
      treeDataProvider: this.missingKeysProvider as vscode.TreeDataProvider<unknown>,
    });
    this.comparisonView = vscode.window.createTreeView('envguard.comparisonResults', {
      treeDataProvider: this.comparisonProvider as vscode.TreeDataProvider<unknown>,
    });

    this.filesView.message = 'Run "EnvGuard: Scan Environment Files" to discover files.';
    this.missingKeysView.message = 'Scan results will appear here.';
    this.comparisonView.message = 'Run "EnvGuard: Compare Files" to compare two files.';
  }

  /** Update the Environment Files view after a scan. */
  public showFiles(files: EnvFile[]): void {
    this.filesProvider.setFiles(files);
    this.filesView.message =
      files.length === 0 ? 'No environment files found in this workspace.' : undefined;
  }

  /** Update the Missing Keys view after a cross-file audit. */
  public showMissingKeys(report: MissingKeyReport, files: EnvFile[]): void {
    this.missingKeysProvider.setReport(report, files);
    if (report.missingKeys.length === 0) {
      this.missingKeysView.message =
        report.scannedFiles.length < 2
          ? 'Need at least two files of the same format to audit.'
          : 'No missing keys — all files are consistent.';
    } else {
      this.missingKeysView.message = undefined;
    }
  }

  /** Update the Comparison Results view after a two-file comparison. */
  public showComparison(result: ComparisonResult, base: EnvFile, target: EnvFile): void {
    this.comparisonProvider.setComparison(result, base, target);
    this.comparisonView.message = `${result.baseFile}  vs  ${result.targetFile}`;
  }

  public dispose(): void {
    this.filesView.dispose();
    this.missingKeysView.dispose();
    this.comparisonView.dispose();
  }
}
