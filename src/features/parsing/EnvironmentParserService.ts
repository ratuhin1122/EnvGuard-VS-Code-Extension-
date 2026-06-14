import { EnvEntry, EnvFileFormat } from '../../models';
import { IEnvParser, IEnvironmentParserService } from '../../types';

/**
 * Routes file content to the correct parser.
 *
 * Deliberately VS Code-free: it knows nothing about the filesystem or the
 * editor, only how to match a file name to a registered parser. Parsers are
 * injected, so adding a format never requires touching this class.
 */
export class EnvironmentParserService implements IEnvironmentParserService {
  public constructor(private readonly parsers: IEnvParser[]) {}

  public supports(fileName: string): boolean {
    return this.parserFor(fileName) !== undefined;
  }

  public formatOf(fileName: string): EnvFileFormat | undefined {
    return this.parserFor(fileName)?.format;
  }

  public parse(fileName: string, content: string, filePath: string): EnvEntry[] {
    const parser = this.parserFor(fileName);
    if (!parser) {
      throw new Error(`No parser registered for file: ${fileName}`);
    }
    return parser.parse(content, filePath);
  }

  private parserFor(fileName: string): IEnvParser | undefined {
    return this.parsers.find((p) => p.supports(fileName));
  }
}
