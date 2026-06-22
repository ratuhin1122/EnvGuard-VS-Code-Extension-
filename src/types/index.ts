/**
 * Service contracts for EnvGuard.
 *
 * Every service in `src/services/` implements one of these interfaces, and
 * consumers depend on the interface — never the concrete class. This is what
 * lets Phase 2 swap in new sources (AWS, Vault, Docker), transformers
 * (encryption), or sinks (sync targets) without touching existing code.
 */

import {
  ComparisonResult,
  EnvEntry,
  EnvFile,
  EnvFileFormat,
  EnvReport,
  MissingKeyReport,
  ValidationResult,
} from '../models';

/**
 * Parses one configuration file format into normalized entries.
 * Implementations live in `src/parsers/` and contain ALL format-specific
 * logic — nothing outside a parser may inspect file content.
 */
export interface IEnvParser {
  /** Format this parser produces; used for labeling discovered files. */
  readonly format: EnvFileFormat;
  /** Whether this parser can handle the given base file name. */
  supports(fileName: string): boolean;
  /**
   * Parse raw file content into normalized entries.
   * @param content   Full text of the file.
   * @param filePath  Workspace-relative path, stamped onto each entry.
   */
  parse(content: string, filePath: string): EnvEntry[];
}

/**
 * A provider of environment files. Phase 1 ships a single implementation
 * (the local workspace). Phase 2 sources — remote servers, Docker,
 * Kubernetes secrets, AWS Parameter Store, Azure Key Vault, HashiCorp
 * Vault — implement this same contract and plug into the existing
 * comparison, report, and tree layers unchanged.
 */
export interface IEnvironmentSource {
  /** Stable identifier, e.g. `workspace`, `aws-parameter-store`. */
  readonly id: string;
  /** Human-readable name for UI display. */
  readonly label: string;
  /** Discover and return fully parsed environment files. */
  getEnvironmentFiles(): Promise<EnvFile[]>;
}

/** Discovers environment files in the local workspace. */
export interface IEnvironmentDiscoveryService extends IEnvironmentSource {
  /** Re-scan the workspace, bypassing any cached results. */
  refresh(): Promise<EnvFile[]>;
}

/** Routes file content to the correct parser. */
export interface IEnvironmentParserService {
  /** Whether any registered parser supports the given file name. */
  supports(fileName: string): boolean;
  /** Format the file would be parsed as, or undefined if unsupported. */
  formatOf(fileName: string): EnvFileFormat | undefined;
  /** Parse content using the first parser that supports the file name. */
  parse(fileName: string, content: string, filePath: string): EnvEntry[];
}

/** All comparison and cross-file audit logic. */
export interface IComparisonService {
  /** Diff two files: missing keys, extra keys, value differences. */
  compare(base: EnvFile, target: EnvFile): ComparisonResult;
  /** Audit many files for keys that some define and others lack. */
  findMissingKeys(files: EnvFile[]): MissingKeyReport;
}

/**
 * Validates discovered env files for the pre-push hook: missing required
 * keys, empty required values, and cross-file consistency. Pure — operates
 * only on EnvFile models, so the same logic runs in the extension and the
 * standalone CLI.
 */
export interface IPrePushValidationService {
  validate(files: EnvFile[]): ValidationResult;
}

/** Builds and persists report.json in the workspace root. */
export interface IReportService {
  build(audit: MissingKeyReport, comparison?: ComparisonResult): EnvReport;
  /** Write the report to the workspace root. Returns the absolute path written. */
  write(report: EnvReport): Promise<string>;
}

/**
 * A user-facing command. Implementations are thin orchestrators: they call
 * services and push results into views, never containing business logic.
 * The CommandRegistrar binds them to VS Code and owns error handling.
 */
export interface ICommand {
  /** Command ID as declared in package.json `contributes.commands`. */
  readonly id: string;
  execute(): Promise<void>;
}

/**
 * Phase 2 seam: transforms entry values on read/write.
 * Phase 1 uses an implicit identity transform (no implementation needed).
 * Secret encryption/decryption will implement this without touching
 * parsers or services.
 */
export interface IValueTransformer {
  onRead(entry: EnvEntry): EnvEntry;
  onWrite(entry: EnvEntry): EnvEntry;
}
