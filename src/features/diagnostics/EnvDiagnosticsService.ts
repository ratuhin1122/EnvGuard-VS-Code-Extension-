import * as path from 'path';
import * as vscode from 'vscode';
import { EnvFile } from '../../models';
import { IComparisonService, IEnvironmentParserService } from '../../types';

/** Template files that define the required-key baseline (never linted themselves). */
const EXAMPLE_NAMES = ['.env.example', '.env.sample', '.env.template'];

/** Whether a file name is a required-key baseline template. */
export function isExampleName(name: string): boolean {
  return EXAMPLE_NAMES.includes(name);
}

/** Debounce window for re-linting while the user types. */
const DEBOUNCE_MS = 300;

/**
 * Publishes editor diagnostics (squiggles + Problems panel) for dotenv files.
 *
 * Reuses the existing parser and ComparisonService — no validation logic is
 * duplicated. Operates on the *live* document text so findings update as the
 * user types, comparing against the on-disk `.env.example` baseline that sits
 * in the same directory as the file being edited.
 */
export class EnvDiagnosticsService implements vscode.Disposable {
  private readonly collection = vscode.languages.createDiagnosticCollection('envguard');
  private readonly decoder = new TextDecoder('utf-8');
  private readonly pending = new Map<string, NodeJS.Timeout>();

  public constructor(
    private readonly parserService: IEnvironmentParserService,
    private readonly comparison: IComparisonService,
  ) {}

  /** Debounced refresh — use for high-frequency events (typing). */
  public scheduleRefresh(document: vscode.TextDocument): void {
    const key = document.uri.toString();
    const existing = this.pending.get(key);
    if (existing) {
      clearTimeout(existing);
    }
    this.pending.set(
      key,
      setTimeout(() => {
        this.pending.delete(key);
        void this.refresh(document);
      }, DEBOUNCE_MS),
    );
  }

  /** Re-lint every currently open dotenv document (e.g. baseline changed). */
  public async refreshAll(documents: readonly vscode.TextDocument[]): Promise<void> {
    await Promise.all(documents.map((doc) => this.refresh(doc)));
  }

  /** Compute and publish diagnostics for a single document. */
  public async refresh(document: vscode.TextDocument): Promise<void> {
    const name = path.basename(document.uri.fsPath);

    // Only lint real dotenv files, never the template itself.
    if (
      !this.isEnabled() ||
      this.parserService.formatOf(name) !== 'dotenv' ||
      isExampleName(name)
    ) {
      this.collection.delete(document.uri);
      return;
    }

    const example = await this.loadBaseline(document.uri);
    if (!example) {
      this.collection.delete(document.uri);
      return;
    }

    const current = this.toEnvFile(document, name);
    const exampleKeys = new Set(example.entries.map((e) => e.key));
    const severity = this.severity();
    const diagnostics: vscode.Diagnostic[] = [];

    // 1. Missing required variables → anchor to line 1 (absent from this file).
    for (const key of this.comparison.compare(example, current).missingKeys) {
      const diagnostic = new vscode.Diagnostic(
        this.firstLineRange(document),
        `Missing required variable "${key}" (defined in .env.example).`,
        severity,
      );
      diagnostic.source = 'EnvGuard';
      diagnostics.push(diagnostic);
    }

    // 2. Empty required values → anchor to the key's own line.
    for (const entry of current.entries) {
      if (entry.value !== '' || !exampleKeys.has(entry.key) || entry.line === undefined) {
        continue;
      }
      const diagnostic = new vscode.Diagnostic(
        this.keyRange(document, entry.line, entry.key),
        `"${entry.key}" is empty but required by .env.example.`,
        severity,
      );
      diagnostic.source = 'EnvGuard';
      diagnostics.push(diagnostic);
    }

    this.collection.set(document.uri, diagnostics);
  }

  /** Drop diagnostics for a closed document. */
  public clear(uri: vscode.Uri): void {
    this.collection.delete(uri);
  }

  public dispose(): void {
    for (const timeout of this.pending.values()) {
      clearTimeout(timeout);
    }
    this.pending.clear();
    this.collection.dispose();
  }

  /** Read and parse the `.env.example` sitting beside the edited file. */
  private async loadBaseline(target: vscode.Uri): Promise<EnvFile | undefined> {
    const dir = path.dirname(target.fsPath);
    for (const candidate of EXAMPLE_NAMES) {
      const uri = vscode.Uri.file(path.join(dir, candidate));
      try {
        const bytes = await vscode.workspace.fs.readFile(uri);
        const content = this.decoder.decode(bytes);
        const relativePath = vscode.workspace.asRelativePath(uri, false);
        return {
          fsPath: uri.fsPath,
          relativePath,
          name: candidate,
          format: 'dotenv',
          entries: this.parserService.parse(candidate, content, relativePath),
        };
      } catch {
        // Candidate not present — try the next name.
      }
    }
    return undefined;
  }

  /** Build an EnvFile from the live (possibly unsaved) document text. */
  private toEnvFile(document: vscode.TextDocument, name: string): EnvFile {
    const relativePath = vscode.workspace.asRelativePath(document.uri, false);
    return {
      fsPath: document.uri.fsPath,
      relativePath,
      name,
      format: 'dotenv',
      entries: this.parserService.parse(name, document.getText(), relativePath),
    };
  }

  private firstLineRange(document: vscode.TextDocument): vscode.Range {
    const end = Math.max(1, document.lineAt(0).text.length);
    return new vscode.Range(0, 0, 0, end);
  }

  /** Range over the key token on its line; falls back to the whole line. */
  private keyRange(document: vscode.TextDocument, line1Based: number, key: string): vscode.Range {
    const lineIndex = Math.min(Math.max(line1Based - 1, 0), document.lineCount - 1);
    const text = document.lineAt(lineIndex).text;
    const start = text.indexOf(key);
    if (start >= 0) {
      return new vscode.Range(lineIndex, start, lineIndex, start + key.length);
    }
    return document.lineAt(lineIndex).range;
  }

  private isEnabled(): boolean {
    return vscode.workspace.getConfiguration('envguard').get<boolean>('diagnostics.enabled', true);
  }

  private severity(): vscode.DiagnosticSeverity {
    const value = vscode.workspace
      .getConfiguration('envguard')
      .get<string>('diagnostics.severity', 'warning');
    switch (value) {
      case 'error':
        return vscode.DiagnosticSeverity.Error;
      case 'information':
        return vscode.DiagnosticSeverity.Information;
      case 'hint':
        return vscode.DiagnosticSeverity.Hint;
      default:
        return vscode.DiagnosticSeverity.Warning;
    }
  }
}
