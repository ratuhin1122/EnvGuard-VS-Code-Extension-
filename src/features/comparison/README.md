# Feature: Comparison Tool

## What It Does

Lets you pick any two environment files (e.g. `.env.example` vs `.env`) and see a full diff: **missing keys**, **extra keys**, and **value differences**. Results are shown in both the sidebar tree and a dedicated webview panel.

## How It Works

1. User runs the `EnvGuard: Compare Files` command.
2. **`CompareCommand`** shows two sequential QuickPick dialogs to select a **base** (reference) and **target** file.
3. **`ComparisonService.compare(base, target)`** diffs the two files:
   - **Missing keys** — present in base, absent from target
   - **Extra keys** — present in target, absent from base
   - **Value differences** — same key exists in both, but values differ
4. Results are pushed to **`ComparisonResultsTreeProvider`** (sidebar) and **`ComparisonPanel`** (webview).

## Files

| File | Purpose |
|------|---------|
| `ComparisonService.ts` | Pure diff logic (also contains `findMissingKeys()` used by the missing-keys feature) |
| `CompareCommand.ts` | Command orchestrator: QuickPick UI → diff → update views |
| `ComparisonResultsTreeProvider.ts` | Sidebar tree with 3 sections: Missing, Extra, Different |
| `ComparisonPanel.ts` | Webview panel rendering a full HTML comparison report |
| `index.ts` | Barrel export |

## Data Flow

```
User → "EnvGuard: Compare Files"
  → CompareCommand (QuickPick base → QuickPick target)
    → ComparisonService.compare(base, target)
      → ComparisonResult { missingKeys, extraKeys, differences }
        → ComparisonResultsTreeProvider (sidebar tree)
        → ComparisonPanel (webview HTML report)
```

## Depends On

- **`features/navigation`** — tree items open files at the correct line
- **`shared/SessionState`** — stores the latest comparison for the export-report feature
- **`shared/TreeViewService`** — manages sidebar view registration

## Notes

- `ComparisonService` is **pure and VS Code-free** — testable in plain Node.js.
- The webview has `enableScripts: false` — it's static HTML with no JS, zero attack surface.
- The panel is a singleton: running Compare again reuses the same panel.
- `ComparisonService` also contains `findMissingKeys()`, which is used by the missing-keys feature. It lives here because all comparison logic is centralized.
