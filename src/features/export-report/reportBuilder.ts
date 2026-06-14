import { ComparisonResult, EnvReport, MissingKeyReport } from '../../models';

/**
 * Assemble the serializable report shape from the latest audit and
 * (optionally) the latest two-file comparison.
 *
 * Pure and VS Code-free so it can be tested without an extension host;
 * ReportService owns the filesystem write.
 */
export function buildReport(
  audit: MissingKeyReport,
  comparison?: ComparisonResult,
): EnvReport {
  return {
    generatedAt: new Date().toISOString(),
    missingKeys: audit.missingKeys,
    extraKeys: comparison?.extraKeys ?? [],
    differences: comparison?.differences ?? [],
    ...(comparison && {
      comparison: {
        baseFile: comparison.baseFile,
        targetFile: comparison.targetFile,
      },
    }),
  };
}
