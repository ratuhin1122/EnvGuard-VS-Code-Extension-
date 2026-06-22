# Changelog

All notable changes to the "EnvGuard" extension will be documented in this file.

## [2.0.0]

Two new layers of protection that catch broken environment files *before* they cause problems — while you type, and before you push.

### Added

1. **Inline Diagnostics**: `.env` files are now linted live in the editor, like ESLint. Treating `.env.example` (in the same directory) as the contract for required keys, EnvGuard underlines two problems and lists them in the Problems panel:
   - **Missing required variable** — a key from `.env.example` is absent (squiggle on the first line).
   - **Empty required value** — a required key is present but blank, e.g. `KEY=` (squiggle on that key's line).

   Findings update as you type (no save needed), and editing `.env.example` re-lints every open env file. Configurable via `envguard.diagnostics.enabled` and `envguard.diagnostics.severity`.

2. **Pre-Push Validation Hook**: Install a git `pre-push` hook (**EnvGuard: Install Pre-Push Hook**) that validates all discovered environment files automatically on every `git push` — checking for missing variables, empty values, and keys that are inconsistent across env files. Two modes via `envguard.gitHook.mode`:
   - **`warn`** (default) — prints warnings but lets the push continue.
   - **`strict`** — blocks the push (non-zero exit) when validation finds problems.

   Changing the mode rewrites an already-installed hook automatically. Any pre-existing `pre-push` hook is backed up to `pre-push.envguard-backup` and restored on uninstall. The validator runs through a standalone, VS Code-free CLI, so the same engine powers both the editor and the hook.

> EnvGuard validates **keys (structure)**, not **values** — different values for the same key across environments (e.g. `APP_ENV=development` vs `APP_ENV=production`) are expected and never flagged.

## [1.0.0] - Initial Release

Welcome to EnvGuard 1.0! Here are the 6 core features included in this release:

1. **Environment File Discovery**: Automatically finds `.env`, `.properties`, and `.yml`/`.yaml` files across your workspace, intelligently skipping build output, virtualenvs, and `node_modules`.
2. **Unified Parsing**: Flattens nested YAML and standardizes properties/dotenv files into simple `key = value` pairs for seamless comparison.
3. **Comparison Tool**: Visually compare any two environment files side-by-side to detect missing keys, extra keys, and differing values.
4. **Missing Key Detector**: Automatically audits all files of the same format in your project to flag any keys that are defined in one environment but missing in another.
5. **Export Report**: Export a comprehensive `report.json` to your workspace root to easily share inconsistencies with your team.
6. **Click-to-Navigate**: Click on any missing or mismatched key in the sidebar to jump directly to the exact file and line number.
