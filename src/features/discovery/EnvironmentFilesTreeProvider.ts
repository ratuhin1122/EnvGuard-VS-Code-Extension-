import * as path from 'path';
import * as vscode from 'vscode';
import { EnvEntry, EnvFile } from '../../models';
import { truncate } from '../../utils/text';
import { openFileCommand } from '../navigation';

type Node =
  | { kind: 'file'; file: EnvFile }
  | { kind: 'entry'; entry: EnvEntry; file: EnvFile };

/**
 * "Environment Files" view: every discovered file at the root, expandable
 * to show its parsed keys. Clicking a file opens it; clicking a key jumps
 * to its line.
 */
export class EnvironmentFilesTreeProvider implements vscode.TreeDataProvider<Node> {
  private files: EnvFile[] = [];
  private readonly changeEmitter = new vscode.EventEmitter<void>();
  public readonly onDidChangeTreeData = this.changeEmitter.event;

  public setFiles(files: EnvFile[]): void {
    this.files = files;
    this.changeEmitter.fire();
  }

  public getChildren(node?: Node): Node[] {
    if (!node) {
      return this.files.map((file) => ({ kind: 'file', file }));
    }
    if (node.kind === 'file') {
      return node.file.entries.map((entry) => ({ kind: 'entry', entry, file: node.file }));
    }
    return [];
  }

  public getTreeItem(node: Node): vscode.TreeItem {
    if (node.kind === 'file') {
      const item = new vscode.TreeItem(
        node.file.name,
        vscode.TreeItemCollapsibleState.Collapsed,
      );
      const dir = path.dirname(node.file.relativePath);
      const location = dir === '.' ? '' : `${dir} · `;
      item.description = `${location}${node.file.entries.length} keys`;
      item.tooltip = `${node.file.relativePath} (${node.file.format})`;
      item.iconPath = new vscode.ThemeIcon('settings-gear');
      item.command = openFileCommand(node.file.fsPath);
      item.contextValue = 'envFile';
      return item;
    }

    const item = new vscode.TreeItem(node.entry.key, vscode.TreeItemCollapsibleState.None);
    item.description = truncate(node.entry.value);
    item.tooltip = `${node.entry.key} = ${node.entry.value}`;
    item.iconPath = new vscode.ThemeIcon('symbol-key');
    item.command = openFileCommand(node.file.fsPath, node.entry.line);
    item.contextValue = 'envEntry';
    return item;
  }
}
