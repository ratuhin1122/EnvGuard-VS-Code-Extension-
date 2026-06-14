# Feature: Missing Key Detector

## What It Does

Audits all environment files of the same format against each other and flags keys that some files define but others lack. For example, if `APP_KEY` exists in `.env` but is missing from `.env.production`, it will be flagged.

## How It Works

1. User runs `EnvGuard: Scan Environment Files` (or the sidebar refreshes on activation).
2. **`ScanCommand`** calls `EnvironmentDiscoveryService.refresh()` to get all files, then calls `ComparisonService.findMissingKeys(files)`.
3. `findMissingKeys()` groups files **by format** (dotenv with dotenv, YAML with YAML) — cross-format comparisons would be noise.
4. Within each group, it collects a union of all keys and checks which files define each key.
5. Any key missing from at least one file is reported as a `MissingKey { key, presentIn[], missingFrom[] }`.
6. **`MissingKeysTreeProvider`** renders the results: each key at the root, expandable to show which files define it (✓) and which lack it (✗).
7. **`RefreshCommand`** is the silent variant — same workflow, no toast notification. Triggered by the ↻ toolbar button.

## Files

| File | Purpose |
|------|---------|
| `ScanCommand.ts` | Command orchestrator: refresh files → find missing keys → update views |
| `RefreshCommand.ts` | Silent version of ScanCommand (toolbar ↻ button) |
| `MissingKeysTreeProvider.ts` | Sidebar tree: keys → files with present/missing status |
| `index.ts` | Barrel export |

## Data Flow

```
User → "EnvGuard: Scan" / "Refresh" / Activation
  → ScanCommand.run(silent)
    → EnvironmentDiscoveryService.refresh() → EnvFile[]
    → ComparisonService.findMissingKeys(files)
      → MissingKeyReport { scannedFiles, missingKeys[] }
        → MissingKeysTreeProvider (sidebar tree)
        → SessionState.audit (for export-report)
```

## Depends On

- **`features/discovery`** — provides the `EnvFile[]` to audit
- **`features/comparison`** — `ComparisonService.findMissingKeys()` contains the audit logic
- **`features/navigation`** — tree items navigate to the file/line
- **`shared/SessionState`** — stores audit results for the export-report feature
- **`shared/TreeViewService`** — manages sidebar view updates

## Notes

- Files are grouped by format before auditing, so `.env` keys are never compared against `application.yml` keys.
- The scan runs automatically on extension activation (silently) so the sidebar is populated immediately.
- Requires at least 2 files of the same format to produce results.
