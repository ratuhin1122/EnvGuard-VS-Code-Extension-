import * as vscode from 'vscode';
import { ComparisonResult, EnvFile, ValueDifference } from '../../models';
import { truncate } from '../../utils/text';
import { openFileCommand } from '../navigation';

type SectionId = 'missing' | 'extra' | 'different';

type Node =
  | { kind: 'section'; section: SectionId }
  | { kind: 'missingKey'; key: string }
  | { kind: 'extraKey'; key: string }
  | { kind: 'difference'; diff: ValueDifference };

interface ComparisonState {
  result: ComparisonResult;
  base: EnvFile;
  target: EnvFile;
}

/**
 * "Comparison Results" view: three sections (Missing Keys, Extra Keys,
 * Different Values) for the most recent two-file comparison. Missing keys
 * open the base file at the key; extra keys and differences open the target.
 */
export class ComparisonResultsTreeProvider implements vscode.TreeDataProvider<Node> {
  private state: ComparisonState | undefined;
  private readonly changeEmitter = new vscode.EventEmitter<void>();
  public readonly onDidChangeTreeData = this.changeEmitter.event;

  public setComparison(result: ComparisonResult, base: EnvFile, target: EnvFile): void {
    this.state = { result, base, target };
    this.changeEmitter.fire();
  }

  public getChildren(node?: Node): Node[] {
    if (!this.state) {
      return [];
    }
    const { result } = this.state;

    if (!node) {
      return [
        { kind: 'section', section: 'missing' },
        { kind: 'section', section: 'extra' },
        { kind: 'section', section: 'different' },
      ];
    }

    if (node.kind === 'section') {
      switch (node.section) {
        case 'missing':
          return result.missingKeys.map((key) => ({ kind: 'missingKey', key }));
        case 'extra':
          return result.extraKeys.map((key) => ({ kind: 'extraKey', key }));
        case 'different':
          return result.differences.map((diff) => ({ kind: 'difference', diff }));
      }
    }

    return [];
  }

  public getTreeItem(node: Node): vscode.TreeItem {
    if (node.kind === 'section') {
      return this.sectionItem(node.section);
    }

    const { base, target } = this.stateOrThrow();

    if (node.kind === 'missingKey') {
      const item = new vscode.TreeItem(node.key, vscode.TreeItemCollapsibleState.None);
      item.description = `only in ${base.name}`;
      item.iconPath = new vscode.ThemeIcon('circle-slash');
      item.command = openFileCommand(base.fsPath, this.lineOf(base, node.key));
      return item;
    }

    if (node.kind === 'extraKey') {
      const item = new vscode.TreeItem(node.key, vscode.TreeItemCollapsibleState.None);
      item.description = `only in ${target.name}`;
      item.iconPath = new vscode.ThemeIcon('diff-added');
      item.command = openFileCommand(target.fsPath, this.lineOf(target, node.key));
      return item;
    }

    const item = new vscode.TreeItem(node.diff.key, vscode.TreeItemCollapsibleState.None);
    item.description = `${truncate(node.diff.baseValue, 18)} ≠ ${truncate(node.diff.targetValue, 18)}`;
    item.tooltip = [
      node.diff.key,
      `${base.relativePath}: ${node.diff.baseValue}`,
      `${target.relativePath}: ${node.diff.targetValue}`,
    ].join('\n');
    item.iconPath = new vscode.ThemeIcon('diff-modified');
    item.command = openFileCommand(target.fsPath, this.lineOf(target, node.diff.key));
    return item;
  }

  private sectionItem(section: SectionId): vscode.TreeItem {
    const { result } = this.stateOrThrow();
    const config: Record<SectionId, { label: string; count: number; icon: string }> = {
      missing: { label: 'Missing Keys', count: result.missingKeys.length, icon: 'warning' },
      extra: { label: 'Extra Keys', count: result.extraKeys.length, icon: 'diff-added' },
      different: {
        label: 'Different Values',
        count: result.differences.length,
        icon: 'diff-modified',
      },
    };

    const { label, count, icon } = config[section];
    const item = new vscode.TreeItem(
      label,
      count > 0
        ? vscode.TreeItemCollapsibleState.Expanded
        : vscode.TreeItemCollapsibleState.None,
    );
    item.description = String(count);
    item.iconPath = new vscode.ThemeIcon(icon);
    item.contextValue = 'comparisonSection';
    return item;
  }

  private lineOf(file: EnvFile, key: string): number | undefined {
    return file.entries.find((e) => e.key === key)?.line;
  }

  private stateOrThrow(): ComparisonState {
    if (!this.state) {
      throw new Error('Comparison tree rendered without state');
    }
    return this.state;
  }
}
