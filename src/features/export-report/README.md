# Feature: Export Report

## What It Does

Writes a `report.json` file to the workspace root containing all missing keys, extra keys, and value differences from the latest scan and comparison. Useful for CI pipelines, code review, or audit trails.

## How It Works

1. User runs the `EnvGuard: Export Report` command.
2. **`ExportReportCommand`** checks if a scan has already been run (via `SessionState.audit`).
   - If not, it runs a scan on the spot so the command always works.
3. **`buildReport()`** assembles a serializable `EnvReport` from the latest audit and (optionally) the latest two-file comparison.
4. **`ReportService.write()`** serializes the report to JSON and writes it to `report.json` in the workspace root.
5. A toast notification offers an "Open Report" action to view the file immediately.

## Files

| File | Purpose |
|------|---------|
| `reportBuilder.ts` | Pure function: assembles `EnvReport` from audit + comparison data |
| `ReportService.ts` | Calls `buildReport()` and writes the JSON file to disk |
| `ExportReportCommand.ts` | Command orchestrator: ensure audit exists → build → write → notify |
| `index.ts` | Barrel export |

## Data Flow

```
User → "EnvGuard: Export Report"
  → ExportReportCommand.execute()
    → (lazy scan if needed)
    → buildReport(audit, comparison?)
      → EnvReport { generatedAt, missingKeys, extraKeys, differences, comparison? }
    → ReportService.write(report)
      → workspace-root/report.json
    → Toast notification → "Open Report" action
```

## Output Format

```json
{
  "generatedAt": "2026-06-12T16:00:00.000Z",
  "missingKeys": [
    { "key": "APP_KEY", "presentIn": [".env"], "missingFrom": [".env.production"] }
  ],
  "extraKeys": ["DEBUG_MODE"],
  "differences": [
    { "key": "DB_HOST", "baseValue": "localhost", "targetValue": "prod-db.example.com" }
  ],
  "comparison": { "baseFile": ".env.example", "targetFile": ".env" }
}
```

## Depends On

- **`features/discovery`** — to get files if no scan has been run yet
- **`features/comparison`** — `ComparisonService.findMissingKeys()` for the audit data
- **`shared/SessionState`** — reads the latest audit and comparison results

## Notes

- `buildReport()` is **pure and VS Code-free** — testable in plain Node.js.
- The command is self-sufficient: if the user hasn't scanned yet, it runs the scan automatically.
- The `comparison` section in the report is only present if the user has run a two-file comparison.
