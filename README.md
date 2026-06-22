# EnvGuard

Framework-agnostic environment file manager for VS Code. Discover, parse, compare, and audit configuration files across Laravel, Node.js, Express, NestJS, Next.js, React, Vue, Spring Boot, Django, Flask, Rails, Go, and .NET projects.

Everything runs locally. No telemetry, no network calls, no accounts.

## This is the view after the extension

![EnvGuard in action](https://raw.githubusercontent.com/ratuhin1122/EnvGuard-VS-Code-Extension-/main/views/demo.gif)

## Features

- **Environment File Discovery** — finds `.env`, `.env.*` (local/development/production/staging/test/example/…), `application*.properties`, and `application*.yml|yaml` anywhere in the workspace, skipping `node_modules`, `vendor`, build output, and virtualenvs.
- **Unified parsing** — dotenv, Java properties, and YAML files all normalize to flat `key = value` entries. Nested YAML flattens to dotted keys (`spring.datasource.url`), so a Spring config is directly comparable to a properties file.
- **Comparison Tool** — pick any two files (e.g. `.env.example` vs `.env`) and get missing keys, extra keys, and value differences in the sidebar plus a full report panel.
- **Missing Key Detector** — audits all files of the same format against each other and flags keys that some environments define and others lack (e.g. `APP_KEY` present in `.env` but missing from `.env.production`).
- **Inline Diagnostics** — lints `.env` files live in the editor: missing and empty required variables get squiggles on the exact line plus Problems-panel entries, updating as you type. See [Inline Diagnostics](#inline-diagnostics) below.
- **Export Report** — writes `report.json` (missing keys, extra keys, differences) to the workspace root.
- **Pre-Push Validation Hook** — installs a git `pre-push` hook that validates your environment files on every `git push`, in either a non-blocking `warn` mode or a blocking `strict` mode. See [Pre-Push Validation](#pre-push-validation) below.
- **Click-to-navigate** — every key in every view opens its file at the exact line.

## Commands

| Command | What it does |
| --- | --- |
| `EnvGuard: Scan Environment Files` | Discover files, run the missing-key audit, refresh the sidebar |
| `EnvGuard: Compare Files` | Pick a base and target file, see the diff |
| `EnvGuard: Refresh` | Silent re-scan (also the ↻ button on the Environment Files view) |
| `EnvGuard: Export Report` | Write `report.json` to the workspace root |
| `EnvGuard: Install Pre-Push Hook` | Install the git `pre-push` validation hook (also the 🛡 button on the Environment Files view) |
| `EnvGuard: Uninstall Pre-Push Hook` | Remove the EnvGuard hook and restore any hook it replaced |

## Inline Diagnostics

Like ESLint, but for your `.env` files — validation appears **directly in the editor** as you type, not just in a sidebar. Open any `.env` / `.env.*` file and EnvGuard underlines problems and lists them in the Problems panel.

### What it checks

Treating `.env.example` (in the same directory) as the source of truth for **required** keys:

- **Missing required variable** — a key from `.env.example` is absent → squiggle on the first line.
- **Empty required value** — a required key is present but blank (`KEY=`) → squiggle on that key's line.

Findings update live (no save needed). Editing `.env.example` re-lints every open env file. The `.env.example` template itself and non-dotenv files (`.properties`, `.yml`) are never linted.

> Like the pre-push hook, this validates **keys (structure)**, not **values** — different values across environments are expected and never flagged.

### Settings

| Setting | Default | Description |
| --- | --- | --- |
| `envguard.diagnostics.enabled` | `true` | Turn inline diagnostics on/off |
| `envguard.diagnostics.severity` | `warning` | `error`, `warning`, `information`, or `hint` |

## Pre-Push Validation

Catch missing, empty, or inconsistent environment variables **before they reach the remote** — like ESLint, but for your config files. EnvGuard installs a git `pre-push` hook that runs automatically on every `git push`.

### What it checks

Treating `.env.example` as the source of truth for which keys are **required**:

- **Missing variables** — a required key is absent from an env file.
- **Empty values** — a required key is present but has no value (`KEY=`).
- **Consistency** — a key exists in some env files but is missing from others (e.g. `REDIS_HOST` defined in `.env` but not `.env.production`).

> EnvGuard validates **keys (structure)**, not **values**. Different values for the same key across environments (e.g. `APP_ENV=development` vs `APP_ENV=production`) are expected and never flagged.

### Modes

Set `envguard.gitHook.mode` in Settings:

| Mode | Behavior on findings |
| --- | --- |
| `warn` (default) | Prints warnings, **push continues** |
| `strict` | Prints warnings, **push is blocked** (exit code 1) |

Changing the mode automatically updates an already-installed hook — no need to re-install.

### Usage

1. Run **EnvGuard: Install Pre-Push Hook** from the Command Palette (or the 🛡 button on the Environment Files view). This must be done from the extension, as the hook references the bundled validator.
2. `git push` as usual — the hook runs and reports any issues.
3. To remove it, run **EnvGuard: Uninstall Pre-Push Hook**.

If a non-EnvGuard `pre-push` hook already exists, it is backed up to `pre-push.envguard-backup` and restored on uninstall.

## Getting started (development)

```bash
npm install
npm run compile
```

Press **F5** in VS Code to launch the Extension Development Host, then open the bundled `sample-workspace/` folder — it contains deliberate inconsistencies that exercise every feature.

Run the logic smoke tests (no VS Code required):

```bash
node scripts/smoke-parsers.js
```

## Architecture

```
src/
├── extension.ts      # Composition root — the only file that wires concrete classes
├── types/            # Service contracts (IEnvParser, IComparisonService, …)
├── models/           # Pure data shapes (EnvEntry, ComparisonResult, …)
├── parsers/          # ALL format knowledge: DotEnvParser, PropertiesParser, YamlParser
├── services/         # Discovery, parsing facade, comparison, reports, tree state
├── commands/         # Thin orchestrators bound by CommandRegistrar
├── tree/             # Three TreeDataProviders (pure renderers)
├── views/            # ComparisonPanel webview (scripts disabled)
└── utils/            # Small shared helpers
```

Rules the codebase follows:

- Commands contain no business logic — they call services and push results into views.
- Parsing logic lives only in `parsers/`; comparison logic only in `ComparisonService`.
- Pure logic (`parsers`, `ComparisonService`, `EnvironmentParserService`, `reportBuilder`) never imports `vscode`, so it is testable in plain Node.
- Dependency injection happens once, by hand, in `extension.ts`.



## License

MIT
