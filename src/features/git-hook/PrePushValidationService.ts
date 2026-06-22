import { EnvFile, ValidationResult } from '../../models';
import { IComparisonService, IPrePushValidationService } from '../../types';

/**
 * Common names a project uses for its "required keys" template. `.env.example`
 * is the convention; the others are accepted as drop-in equivalents.
 */
const EXAMPLE_NAMES = ['.env.example', '.env.sample', '.env.template'];

/**
 * Pre-push validation, shared by the extension command and the standalone CLI.
 *
 * Pure and VS Code-free: it consumes EnvFile models and reuses the existing
 * ComparisonService for all diffing, so no validation logic is duplicated.
 * The three checks are:
 *   1. missing  — required keys (from `.env.example`) absent from an env file.
 *   2. empty    — required keys present but blank in an env file.
 *   3. inconsistencies — keys some env files define and others lack.
 */
export class PrePushValidationService implements IPrePushValidationService {
  public constructor(private readonly comparison: IComparisonService) {}

  public validate(files: EnvFile[]): ValidationResult {
    const example = files.find((f) => EXAMPLE_NAMES.includes(f.name));
    const targets = files.filter(
      (f) => f.format === 'dotenv' && !EXAMPLE_NAMES.includes(f.name),
    );

    const missing = new Set<string>();
    const empty = new Set<string>();

    if (example) {
      const requiredKeys = new Set(example.entries.map((e) => e.key));
      for (const target of targets) {
        for (const key of this.comparison.compare(example, target).missingKeys) {
          missing.add(key);
        }
        for (const entry of target.entries) {
          if (requiredKeys.has(entry.key) && entry.value === '') {
            empty.add(entry.key);
          }
        }
      }
    }

    const inconsistencies = this.comparison.findMissingKeys(files).missingKeys;

    return {
      missing: [...missing].sort(),
      empty: [...empty].sort(),
      inconsistencies,
      hasFindings: missing.size > 0 || empty.size > 0 || inconsistencies.length > 0,
    };
  }
}
