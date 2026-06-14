# Changelog

All notable changes to the "EnvGuard" extension will be documented in this file.

## [1.0.0] - Initial Release

Welcome to EnvGuard 1.0! Here are the 6 core features included in this release:

1. **Environment File Discovery**: Automatically finds `.env`, `.properties`, and `.yml`/`.yaml` files across your workspace, intelligently skipping build output, virtualenvs, and `node_modules`.
2. **Unified Parsing**: Flattens nested YAML and standardizes properties/dotenv files into simple `key = value` pairs for seamless comparison.
3. **Comparison Tool**: Visually compare any two environment files side-by-side to detect missing keys, extra keys, and differing values.
4. **Missing Key Detector**: Automatically audits all files of the same format in your project to flag any keys that are defined in one environment but missing in another.
5. **Export Report**: Export a comprehensive `report.json` to your workspace root to easily share inconsistencies with your team.
6. **Click-to-Navigate**: Click on any missing or mismatched key in the sidebar to jump directly to the exact file and line number.
