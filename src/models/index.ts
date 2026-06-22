/**
 * Core data models for EnvGuard.
 *
 * Everything in this file is a plain, serializable data shape with no
 * behavior. Service contracts that operate on these shapes live in
 * `src/types/`.
 */

/** File formats EnvGuard understands. Extend this union to support more. */
export type EnvFileFormat = 'dotenv' | 'properties' | 'yaml';

/**
 * A single key/value entry, normalized regardless of the source format.
 * This is the universal currency of the extension: every parser produces
 * it and every service consumes it.
 */
export interface EnvEntry {
  /** Normalized key. Nested YAML keys are flattened with dots (e.g. `spring.datasource.url`). */
  key: string;
  /** Raw string value with surrounding quotes stripped. */
  value: string;
  /** Workspace-relative path of the file this entry came from. */
  file: string;
  /** 1-based line number of the entry in its source file, when known. */
  line?: number;
}

/** A discovered environment file plus its parsed entries. */
export interface EnvFile {
  /** Absolute filesystem path. */
  fsPath: string;
  /** Workspace-relative path, used for display and reports. */
  relativePath: string;
  /** Base file name (e.g. `.env.production`). */
  name: string;
  format: EnvFileFormat;
  entries: EnvEntry[];
}

/** A key whose value differs between two compared files. */
export interface ValueDifference {
  key: string;
  /** Value in the base (left) file. */
  baseValue: string;
  /** Value in the target (right) file. */
  targetValue: string;
}

/** Result of comparing a base file against a target file. */
export interface ComparisonResult {
  /** Relative path of the base (left) file. */
  baseFile: string;
  /** Relative path of the target (right) file. */
  targetFile: string;
  /** Keys present in base but absent from target. */
  missingKeys: string[];
  /** Keys present in target but absent from base. */
  extraKeys: string[];
  /** Keys present in both but with different values. */
  differences: ValueDifference[];
}

/** A key that exists in at least one env file but is absent from others. */
export interface MissingKey {
  key: string;
  /** Relative paths of files that contain the key. */
  presentIn: string[];
  /** Relative paths of files that lack the key. */
  missingFrom: string[];
}

/** Cross-file audit result over a whole workspace. */
export interface MissingKeyReport {
  /** Files included in the audit (relative paths). */
  scannedFiles: string[];
  missingKeys: MissingKey[];
}

/**
 * Outcome of the pre-push validation run (also used by the standalone CLI).
 * VS Code-free: a plain data shape produced from EnvFile models so it works
 * both inside the extension and in the git-hook CLI.
 */
export interface ValidationResult {
  /** Required keys (from `.env.example`) absent from one or more env files. */
  missing: string[];
  /** Required keys present but with an empty value in one or more env files. */
  empty: string[];
  /** Keys some env files define and others lack (cross-file consistency). */
  inconsistencies: MissingKey[];
  /** True when any of the above lists is non-empty. */
  hasFindings: boolean;
}

/** Serializable shape written to report.json by the ReportService. */
export interface EnvReport {
  generatedAt: string;
  missingKeys: MissingKey[];
  extraKeys: string[];
  differences: ValueDifference[];
  /** Present when the report includes a two-file comparison. */
  comparison?: {
    baseFile: string;
    targetFile: string;
  };
}
