import { ICommand } from '../../types';
import { ScanCommand } from './ScanCommand';

/**
 * EnvGuard: Refresh.
 * Identical workflow to Scan but silent — meant for the tree toolbar button.
 */
export class RefreshCommand implements ICommand {
  public readonly id = 'envguard.refresh';

  public constructor(private readonly scan: ScanCommand) {}

  public async execute(): Promise<void> {
    await this.scan.run(true);
  }
}
