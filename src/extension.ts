import * as vscode from 'vscode';
import { CompareCommand, ComparisonService } from './features/comparison';
import { EnvironmentDiscoveryService } from './features/discovery';
import { ExportReportCommand, ReportService } from './features/export-report';
import { RefreshCommand, ScanCommand } from './features/missing-keys';
import { createParsers, EnvironmentParserService } from './features/parsing';
import { CommandRegistrar, SessionState, TreeViewService } from './shared';

/**
 * Composition root. The ONLY place in the codebase that knows concrete
 * service types and wires them together — everything else depends on the
 * interfaces in src/types. Swapping or adding implementations (Phase 2
 * sources, transformers) happens here and nowhere else.
 */
export function activate(context: vscode.ExtensionContext): void {
  const output = vscode.window.createOutputChannel('EnvGuard');

  // Services
  const parserService = new EnvironmentParserService(createParsers());
  const discovery = new EnvironmentDiscoveryService(parserService, output);
  const comparison = new ComparisonService();
  const reports = new ReportService();
  const trees = new TreeViewService();
  const state = new SessionState();

  // Commands
  const scan = new ScanCommand(discovery, comparison, trees, state);
  const compare = new CompareCommand(discovery, comparison, trees, state);
  const refresh = new RefreshCommand(scan);
  const exportReport = new ExportReportCommand(discovery, comparison, reports, state);
  new CommandRegistrar().register(context, [scan, compare, refresh, exportReport]);

  context.subscriptions.push(output, trees);

  // Populate the sidebar on activation without a noisy toast.
  void scan.run(true).catch((error: unknown) => {
    output.appendLine(
      `[EnvGuard] Initial scan failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  });
}

export function deactivate(): void {
  // All resources are disposed via context.subscriptions.
}
