import * as vscode from 'vscode';
import { EnvFile, MissingKey, MissingKeyReport } from '../../models';
import { openFileCommand } from '../navigation';

type Node =
  | { kind: 'key'; missing: MissingKey }
  | { kind: 'file'; relativePath: string; present: boolean; missing: MissingKey };

/**
 * "Missing Keys" view: each inconsistent key at the root, expandable to
 * show which files lack it (error icon) and which define it (check icon).
 * Files that define the key open at the key's line.
 */
export class MissingKeysTreeProvider implements vscode.TreeDataProvider<Node> {
  private report: MissingKeyReport | undefined;
  private filesByPath = new Map<string, EnvFile>();
  private readonly changeEmitter = new vscode.EventEmitter<void>();
  public readonly onDidChangeTreeData = this.changeEmitter.event;

  public setReport(report: MissingKeyReport, files: EnvFile[]): void {
    this.report = report;
    this.filesByPath = new Map(files.map((f) => [f.relativePath, f]));
    this.changeEmitter.fire();
  }

  public getChildren(node?: Node): Node[] {
    if (!node) {
      return (this.report?.missingKeys ?? []).map((missing) => ({ kind: 'key', missing }));
    }
    if (node.kind === 'key') {
      return [
        ...node.missing.missingFrom.map<Node>((relativePath) => ({
          kind: 'file',
          relativePath,
          present: false,
          missing: node.missing,
        })),
        ...node.missing.presentIn.map<Node>((relativePath) => ({
          kind: 'file',
          relativePath,
          present: true,
          missing: node.missing,
        })),
      ];
    }
    return [];
  }

  public getTreeItem(node: Node): vscode.TreeItem {
    if (node.kind === 'key') {
      const count = node.missing.missingFrom.length;
      const item = new vscode.TreeItem(
        node.missing.key,
        vscode.TreeItemCollapsibleState.Collapsed,
      );
      item.description = `missing from ${count} file${count === 1 ? '' : 's'}`;
      item.iconPath = new vscode.ThemeIcon(
        'warning',
        new vscode.ThemeColor('list.warningForeground'),
      );
      item.contextValue = 'missingKey';
      return item;
    }

    const item = new vscode.TreeItem(node.relativePath, vscode.TreeItemCollapsibleState.None);
    const file = this.filesByPath.get(node.relativePath);
    if (node.present) {
      item.description = 'defines it';
      item.iconPath = new vscode.ThemeIcon(
        'check',
        new vscode.ThemeColor('testing.iconPassed'),
      );
      const line = file?.entries.find((e) => e.key === node.missing.key)?.line;
      if (file) {
        item.command = openFileCommand(file.fsPath, line);
      }
    } else {
      item.description = 'missing';
      item.iconPath = new vscode.ThemeIcon(
        'error',
        new vscode.ThemeColor('list.errorForeground'),
      );
      if (file) {
        item.command = openFileCommand(file.fsPath);
      }
    }
    return item;
  }
}
