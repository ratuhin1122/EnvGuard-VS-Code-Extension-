import { ValidationResult } from '../models';
// Import the concrete classes directly (not via barrels) so this CLI never
// pulls in the VS Code-dependent command/view modules — it runs under plain
// Node from a git pre-push hook, where the `vscode` module does not exist.
import { ComparisonService } from '../features/comparison/ComparisonService';
import { PrePushValidationService } from '../features/git-hook/PrePushValidationService';
import { createParsers, EnvironmentParserService } from '../features/parsing';
import { FileSystemDiscovery } from './FileSystemDiscovery';

type Mode = 'warn' | 'strict';

function parseArgs(argv: string[]): { root: string; mode: Mode } {
  let root = process.cwd();
  let mode: Mode = 'warn';
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--root') {
      root = argv[++i] ?? root;
    } else if (argv[i] === '--mode') {
      mode = argv[++i] === 'strict' ? 'strict' : 'warn';
    }
  }
  return { root, mode };
}

function report(result: ValidationResult): void {
  if (!result.hasFindings) {
    console.log('EnvGuard: ✓ Environment files valid');
    return;
  }
  if (result.missing.length > 0) {
    console.log('EnvGuard: ⚠ Missing variables:');
    for (const key of result.missing) {
      console.log(`  - ${key}`);
    }
  }
  if (result.empty.length > 0) {
    console.log('EnvGuard: ⚠ Empty values:');
    for (const key of result.empty) {
      console.log(`  - ${key}`);
    }
  }
  if (result.inconsistencies.length > 0) {
    console.log('EnvGuard: ⚠ Inconsistent keys across env files:');
    for (const item of result.inconsistencies) {
      console.log(`  - ${item.key} (missing from: ${item.missingFrom.join(', ')})`);
    }
  }
}

async function main(): Promise<void> {
  const { root, mode } = parseArgs(process.argv.slice(2));

  const parserService = new EnvironmentParserService(createParsers());
  const discovery = new FileSystemDiscovery(root, parserService);
  const validator = new PrePushValidationService(new ComparisonService());

  const files = await discovery.getEnvironmentFiles();
  const result = validator.validate(files);
  report(result);

  if (result.hasFindings && mode === 'strict') {
    console.error(
      'EnvGuard: push blocked (strict mode). Fix the issues above, or set ' +
        '"envguard.gitHook.mode" to "warn" to push anyway.',
    );
    process.exit(1);
  }

  if (result.hasFindings) {
    console.log('EnvGuard: warnings only (warn mode) — push continues.');
  }
  process.exit(0);
}

void main().catch((error: unknown) => {
  // A crash in the validator must never block a legitimate push.
  const message = error instanceof Error ? error.message : String(error);
  console.error(`EnvGuard: validation skipped due to error: ${message}`);
  process.exit(0);
});
