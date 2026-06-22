import * as path from 'path';
import * as vscode from 'vscode';
import { CompareCommand, ComparisonService } from './features/comparison';
import { EnvDiagnosticsService, isExampleName } from './features/diagnostics';
import { EnvironmentDiscoveryService } from './features/discovery';
import { ExportReportCommand, ReportService } from './features/export-report';
import {
  GitHookInstaller,
  InstallPrePushHookCommand,
  readGitHookMode,
  UninstallPrePushHookCommand,
} from './features/git-hook';
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
  const hookInstaller = new GitHookInstaller(context.extensionPath);
  const diagnostics = new EnvDiagnosticsService(parserService, comparison);

  // Commands
  const scan = new ScanCommand(discovery, comparison, trees, state);
  const compare = new CompareCommand(discovery, comparison, trees, state);
  const refresh = new RefreshCommand(scan);
  const exportReport = new ExportReportCommand(discovery, comparison, reports, state);
  const installHook = new InstallPrePushHookCommand(hookInstaller);
  const uninstallHook = new UninstallPrePushHookCommand(hookInstaller);
  new CommandRegistrar().register(context, [
    scan,
    compare,
    refresh,
    exportReport,
    installHook,
    uninstallHook,
  ]);

  context.subscriptions.push(output, trees, diagnostics);

  // Live editor diagnostics: lint dotenv files as they are opened and edited.
  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument((doc) => void diagnostics.refresh(doc)),
    vscode.workspace.onDidChangeTextDocument((event) => diagnostics.scheduleRefresh(event.document)),
    vscode.workspace.onDidSaveTextDocument((doc) => {
      // Saving the baseline can change every file's findings; re-lint them all.
      if (isExampleName(path.basename(doc.uri.fsPath))) {
        void diagnostics.refreshAll(vscode.workspace.textDocuments);
      } else {
        void diagnostics.refresh(doc);
      }
    }),
    vscode.workspace.onDidCloseTextDocument((doc) => diagnostics.clear(doc.uri)),
  );
  // Lint anything already open at activation.
  void diagnostics.refreshAll(vscode.workspace.textDocuments);

  // Keep settings-driven behavior in sync without a reload:
  // - `envguard.gitHook.mode` rewrites an installed pre-push hook.
  // - `envguard.diagnostics.*` re-lints all open documents.
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration(async (event) => {
      if (event.affectsConfiguration('envguard.diagnostics')) {
        void diagnostics.refreshAll(vscode.workspace.textDocuments);
      }
      if (!event.affectsConfiguration('envguard.gitHook.mode')) {
        return;
      }
      const folder = vscode.workspace.workspaceFolders?.[0];
      if (!folder) {
        return;
      }
      try {
        const repoRoot = await hookInstaller.resolveRepoRoot(folder.uri.fsPath);
        if (hookInstaller.isManaged(repoRoot)) {
          await hookInstaller.install(repoRoot, readGitHookMode());
          output.appendLine('[EnvGuard] pre-push hook mode updated to match settings.');
        }
      } catch {
        // No git repo or no managed hook — nothing to sync.
      }
    }),
  );

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
