import {
  ComparisonResult,
  EnvFile,
  EnvFileFormat,
  MissingKey,
  MissingKeyReport,
  ValueDifference,
} from '../../models';
import { IComparisonService } from '../../types';

/**
 * All comparison and cross-file audit logic for EnvGuard.
 *
 * Pure and VS Code-free: operates only on EnvFile models, so it works
 * unchanged against any IEnvironmentSource (workspace today; vaults and
 * remote stores in Phase 2).
 */
export class ComparisonService implements IComparisonService {
  /**
   * Diff two files. `base` is the reference (e.g. `.env.example`), `target`
   * is the file being checked against it (e.g. `.env`).
   */
  public compare(base: EnvFile, target: EnvFile): ComparisonResult {
    const baseMap = this.toMap(base);
    const targetMap = this.toMap(target);

    const missingKeys: string[] = [];
    const differences: ValueDifference[] = [];

    for (const [key, baseValue] of baseMap) {
      const targetValue = targetMap.get(key);
      if (targetValue === undefined) {
        missingKeys.push(key);
      } else if (targetValue !== baseValue) {
        differences.push({ key, baseValue, targetValue });
      }
    }

    const extraKeys = [...targetMap.keys()].filter((key) => !baseMap.has(key));

    missingKeys.sort();
    extraKeys.sort();
    differences.sort((a, b) => a.key.localeCompare(b.key));

    return {
      baseFile: base.relativePath,
      targetFile: target.relativePath,
      missingKeys,
      extraKeys,
      differences,
    };
  }

  /**
   * Audit many files for keys that some define and others lack.
   *
   * Files are audited within their format group only: dotenv keys
   * (`APP_KEY`) and Spring YAML keys (`spring.datasource.url`) live in
   * different namespaces, so cross-format "missing" findings would be
   * noise rather than signal.
   */
  public findMissingKeys(files: EnvFile[]): MissingKeyReport {
    const groups = new Map<EnvFileFormat, EnvFile[]>();
    for (const file of files) {
      const group = groups.get(file.format) ?? [];
      group.push(file);
      groups.set(file.format, group);
    }

    const missingKeys: MissingKey[] = [];
    for (const group of groups.values()) {
      missingKeys.push(...this.auditGroup(group));
    }
    missingKeys.sort((a, b) => a.key.localeCompare(b.key));

    return {
      scannedFiles: files.map((f) => f.relativePath).sort(),
      missingKeys,
    };
  }

  private auditGroup(files: EnvFile[]): MissingKey[] {
    if (files.length < 2) {
      return [];
    }

    const allKeys = new Set<string>();
    const keysByFile = new Map<string, Set<string>>();
    for (const file of files) {
      const keys = new Set(file.entries.map((e) => e.key));
      keysByFile.set(file.relativePath, keys);
      for (const key of keys) {
        allKeys.add(key);
      }
    }

    const result: MissingKey[] = [];
    for (const key of allKeys) {
      const presentIn: string[] = [];
      const missingFrom: string[] = [];
      for (const file of files) {
        (keysByFile.get(file.relativePath)?.has(key) ? presentIn : missingFrom).push(
          file.relativePath,
        );
      }
      if (missingFrom.length > 0) {
        result.push({ key, presentIn: presentIn.sort(), missingFrom: missingFrom.sort() });
      }
    }

    return result;
  }

  /** Key→value map where the last occurrence of a duplicate key wins. */
  private toMap(file: EnvFile): Map<string, string> {
    const map = new Map<string, string>();
    for (const entry of file.entries) {
      map.set(entry.key, entry.value);
    }
    return map;
  }
}
