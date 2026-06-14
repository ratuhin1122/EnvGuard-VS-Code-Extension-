import * as path from 'path';
import * as vscode from 'vscode';
import { EnvFile } from '../../models';
import { IEnvironmentDiscoveryService, IEnvironmentParserService } from '../../types';

/**
 * Glob for candidate files. Deliberately conservative: `application*` for
 * properties/YAML so unrelated Java resources (log4j.properties,
 * messages_en.properties, docker-compose.yml, …) don't pollute the tree.
 * Every hit is still filtered through the parser service, which remains the
 * single source of truth for what EnvGuard understands.
 */
const INCLUDE_GLOB =
  '**/{.env,.env.*,application*.properties,application*.yml,application*.yaml}';

/** Directories that never contain project-owned environment config. */
const EXCLUDE_GLOB =
  '**/{node_modules,vendor,dist,build,out,target,.git,venv,.venv,__pycache__}/**';

/**
 * Phase 1 implementation of IEnvironmentSource: discovers environment files
 * in the local workspace. Results are cached until refresh() so tree
 * redraws don't re-read the filesystem.
 */
export class EnvironmentDiscoveryService implements IEnvironmentDiscoveryService {
  public readonly id = 'workspace';
  public readonly label = 'Workspace';

  private cache: EnvFile[] | undefined;
  private readonly decoder = new TextDecoder('utf-8');

  public constructor(
    private readonly parserService: IEnvironmentParserService,
    private readonly output: vscode.OutputChannel,
  ) {}

  public async getEnvironmentFiles(): Promise<EnvFile[]> {
    if (!this.cache) {
      this.cache = await this.scan();
    }
    return this.cache;
  }

  public async refresh(): Promise<EnvFile[]> {
    this.cache = await this.scan();
    return this.cache;
  }

  private async scan(): Promise<EnvFile[]> {
    if (!vscode.workspace.workspaceFolders?.length) {
      return [];
    }

    const uris = await vscode.workspace.findFiles(INCLUDE_GLOB, EXCLUDE_GLOB);
    const files: EnvFile[] = [];

    for (const uri of uris) {
      const name = path.basename(uri.fsPath);
      const format = this.parserService.formatOf(name);
      if (!format) {
        continue;
      }

      const relativePath = vscode.workspace.asRelativePath(uri, false);
      try {
        const bytes = await vscode.workspace.fs.readFile(uri);
        const entries = this.parserService.parse(name, this.decoder.decode(bytes), relativePath);
        files.push({ fsPath: uri.fsPath, relativePath, name, format, entries });
      } catch (error) {
        this.output.appendLine(
          `[EnvGuard] Skipped ${relativePath}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    files.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
    return files;
  }
}
