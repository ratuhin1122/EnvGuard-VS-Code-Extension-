# Feature: Environment File Discovery

## What It Does

Automatically finds all environment configuration files (`.env`, `.properties`, `.yaml`) across the entire workspace, parses them using the parsing feature, and displays them in the **Environment Files** sidebar panel.

## How It Works

1. **`EnvironmentDiscoveryService`** runs a VS Code glob search using `vscode.workspace.findFiles()`.
2. The glob pattern matches: `.env`, `.env.*`, `application*.properties`, `application*.yml/yaml`.
3. Excluded directories: `node_modules`, `vendor`, `dist`, `build`, `out`, `target`, `.git`, `venv`, `.venv`, `__pycache__`.
4. Each matching file is read and passed to `EnvironmentParserService` (from the parsing feature) to get normalized `EnvEntry[]`.
5. Results are **cached** in memory — tree redraws don't re-scan the filesystem until an explicit refresh.
6. **`EnvironmentFilesTreeProvider`** renders the results as a collapsible tree: files at the root level, keys underneath each file.

## Files

| File | Purpose |
|------|---------|
| `EnvironmentDiscoveryService.ts` | Glob scanning, file reading, caching |
| `EnvironmentFilesTreeProvider.ts` | Sidebar tree showing discovered files and their keys |
| `index.ts` | Barrel export |

## Data Flow

```
Workspace filesystem
  → vscode.workspace.findFiles(glob)
    → EnvironmentParserService.parse() [from parsing feature]
      → EnvFile[] (cached)
        → EnvironmentFilesTreeProvider (sidebar tree)
```

## Depends On

- **`features/parsing`** — to parse discovered files into `EnvEntry[]`
- **`features/navigation`** — for click-to-open on tree items

## Notes

- The discovery service is the **only place** in the codebase that touches the filesystem.
- The cache is invalidated by calling `refresh()` (triggered by the Scan or Refresh commands).
- Errors during file parsing are logged to the "EnvGuard" output channel but don't stop the scan.
