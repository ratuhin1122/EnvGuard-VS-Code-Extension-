import { IEnvParser } from '../../types';
import { DotEnvParser } from './DotEnvParser';
import { PropertiesParser } from './PropertiesParser';
import { YamlParser } from './YamlParser';

export { DotEnvParser } from './DotEnvParser';
export { EnvironmentParserService } from './EnvironmentParserService';
export { PropertiesParser } from './PropertiesParser';
export { YamlParser } from './YamlParser';

/**
 * The full set of parsers known to EnvGuard, in match-priority order.
 * Adding a new format = write the parser class, add it here. Nothing else
 * in the codebase changes.
 */
export function createParsers(): IEnvParser[] {
  return [new DotEnvParser(), new PropertiesParser(), new YamlParser()];
}
