import * as vscode from 'vscode';

/**
 * Build a TreeItem command that opens a file, optionally at a 1-based line.
 * Uses the built-in `vscode.open` command so no custom command registration
 * is needed for navigation.
 */
export function openFileCommand(fsPath: string, line?: number): vscode.Command {
  const uri = vscode.Uri.file(fsPath);
  if (line === undefined) {
    return { command: 'vscode.open', title: 'Open File', arguments: [uri] };
  }
  const position = new vscode.Position(line - 1, 0);
  const options: vscode.TextDocumentShowOptions = {
    selection: new vscode.Range(position, position),
  };
  return { command: 'vscode.open', title: 'Open File', arguments: [uri, options] };
}
