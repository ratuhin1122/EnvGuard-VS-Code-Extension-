import { ComparisonResult, EnvFile, MissingKeyReport } from '../models';

/** The most recent two-file comparison, kept with its source files. */
export interface ComparisonSnapshot {
  result: ComparisonResult;
  base: EnvFile;
  target: EnvFile;
}

/**
 * Holds the latest results of the current session so commands can build on
 * each other's output (e.g. Export Report reads the last scan and
 * comparison). A plain mutable holder — no events; commands that change
 * state are also responsible for updating the views.
 */
export class SessionState {
  public files: EnvFile[] = [];
  public audit: MissingKeyReport | undefined;
  public comparison: ComparisonSnapshot | undefined;
}
