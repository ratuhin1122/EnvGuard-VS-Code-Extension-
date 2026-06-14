import * as vscode from 'vscode';
import { ICommand } from '../types';

/**
 * Binds ICommand implementations to VS Code and owns error handling:
 * any uncaught command failure surfaces as an error toast instead of
 * dying silently in the extension host.
 */
export class CommandRegistrar {
  public register(context: vscode.ExtensionContext, commands: ICommand[]): void {
    for (const command of commands) {
      context.subscriptions.push(
        vscode.commands.registerCommand(command.id, async () => {
          try {
            await command.execute();
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            void vscode.window.showErrorMessage(`EnvGuard: ${message}`);
          }
        }),
      );
    }
  }
}
