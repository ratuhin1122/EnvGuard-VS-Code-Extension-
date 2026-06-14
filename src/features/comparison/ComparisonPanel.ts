import * as vscode from 'vscode';
import { ComparisonResult } from '../../models';

/**
 * Webview panel showing a full two-file comparison report.
 *
 * Static content only: scripts are disabled, so the webview has no attack
 * surface beyond rendering escaped HTML. One panel instance is reused
 * across comparisons.
 */
export class ComparisonPanel {
  private static current: vscode.WebviewPanel | undefined;

  public static show(result: ComparisonResult): void {
    if (ComparisonPanel.current) {
      ComparisonPanel.current.reveal(vscode.ViewColumn.Beside, true);
    } else {
      ComparisonPanel.current = vscode.window.createWebviewPanel(
        'envguard.comparisonReport',
        'EnvGuard Comparison',
        { viewColumn: vscode.ViewColumn.Beside, preserveFocus: true },
        { enableScripts: false },
      );
      ComparisonPanel.current.onDidDispose(() => {
        ComparisonPanel.current = undefined;
      });
    }

    ComparisonPanel.current.title = `EnvGuard: ${result.baseFile} vs ${result.targetFile}`;
    ComparisonPanel.current.webview.html = ComparisonPanel.render(result);
  }

  private static render(result: ComparisonResult): string {
    const esc = ComparisonPanel.escape;
    const base = esc(result.baseFile);
    const target = esc(result.targetFile);

    const missingRows = result.missingKeys
      .map((key) => `<tr><td class="key">${esc(key)}</td></tr>`)
      .join('');
    const extraRows = result.extraKeys
      .map((key) => `<tr><td class="key">${esc(key)}</td></tr>`)
      .join('');
    const diffRows = result.differences
      .map(
        (d) =>
          `<tr><td class="key">${esc(d.key)}</td><td>${esc(d.baseValue)}</td><td>${esc(d.targetValue)}</td></tr>`,
      )
      .join('');

    const clean =
      result.missingKeys.length === 0 &&
      result.extraKeys.length === 0 &&
      result.differences.length === 0;

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline';">
<style>
  body { font-family: var(--vscode-font-family); color: var(--vscode-foreground); padding: 0 1rem 2rem; }
  h1 { font-size: 1.2rem; font-weight: 600; }
  h2 { font-size: 1rem; margin-top: 1.5rem; border-bottom: 1px solid var(--vscode-panel-border); padding-bottom: 0.3rem; }
  .badge { display: inline-block; min-width: 1.4em; text-align: center; border-radius: 0.7em; padding: 0 0.4em; font-size: 0.85em; background: var(--vscode-badge-background); color: var(--vscode-badge-foreground); }
  .files { color: var(--vscode-descriptionForeground); }
  .files code { color: var(--vscode-textPreformat-foreground); }
  table { border-collapse: collapse; width: 100%; margin-top: 0.5rem; }
  th, td { text-align: left; padding: 0.25rem 0.75rem 0.25rem 0; border-bottom: 1px solid var(--vscode-panel-border); font-size: 0.9em; word-break: break-all; }
  th { color: var(--vscode-descriptionForeground); font-weight: 600; }
  td.key { font-family: var(--vscode-editor-font-family); white-space: nowrap; }
  .empty { color: var(--vscode-descriptionForeground); font-style: italic; }
  .clean { margin-top: 1rem; color: var(--vscode-testing-iconPassed, #2ea043); }
</style>
</head>
<body>
  <h1>Comparison Report</h1>
  <p class="files">Base: <code>${base}</code> &nbsp;·&nbsp; Target: <code>${target}</code></p>
  ${clean ? '<p class="clean">✔ Files are fully in sync — no missing keys, extra keys, or value differences.</p>' : ''}

  <h2>Missing Keys <span class="badge">${result.missingKeys.length}</span></h2>
  <p class="files">Present in <code>${base}</code> but absent from <code>${target}</code>.</p>
  ${missingRows ? `<table><tbody>${missingRows}</tbody></table>` : '<p class="empty">None</p>'}

  <h2>Extra Keys <span class="badge">${result.extraKeys.length}</span></h2>
  <p class="files">Present in <code>${target}</code> but absent from <code>${base}</code>.</p>
  ${extraRows ? `<table><tbody>${extraRows}</tbody></table>` : '<p class="empty">None</p>'}

  <h2>Different Values <span class="badge">${result.differences.length}</span></h2>
  ${
    diffRows
      ? `<table><thead><tr><th>Key</th><th>${base}</th><th>${target}</th></tr></thead><tbody>${diffRows}</tbody></table>`
      : '<p class="empty">None</p>'
  }
</body>
</html>`;
  }

  private static escape(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
