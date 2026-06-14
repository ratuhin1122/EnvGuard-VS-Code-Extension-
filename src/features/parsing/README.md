# Feature: Unified Parsing

## What It Does

Parses three different configuration file formats — **dotenv**, **Java properties**, and **YAML** — into a single normalized `EnvEntry[]` shape. This is the "universal currency" of the extension: every downstream feature (discovery, comparison, missing keys, export, navigation) consumes `EnvEntry` objects and never deals with raw file content.

## How It Works

1. **`EnvironmentParserService`** receives a file name and raw text content.
2. It checks each registered parser's `supports(fileName)` method in priority order.
3. The first matching parser runs `parse(content, filePath)` and returns `EnvEntry[]`.

### Parsers

| Parser | Files It Handles | Key Syntax Details |
|--------|------------------|--------------------|
| **DotEnvParser** | `.env`, `.env.*` (local, production, example, etc.) | `KEY=value`, `export KEY=value`, single/double quotes, `#` comments, empty values |
| **PropertiesParser** | `application*.properties` | `key=value`, `key: value`, `#` and `!` comments, `\` line continuations, escaped separators |
| **YamlParser** | `application*.yml`, `application*.yaml` | Flattens nested maps to dotted keys (`spring.datasource.url`), sequences to indexed keys (`servers[0]`), merges multi-document (`---`) files |

## Files

| File | Purpose |
|------|---------|
| `DotEnvParser.ts` | Parses `.env` and `.env.*` files |
| `PropertiesParser.ts` | Parses Java `.properties` files |
| `YamlParser.ts` | Parses YAML config files (Spring Boot style) |
| `EnvironmentParserService.ts` | Routes a file name to the correct parser |
| `index.ts` | Barrel export + `createParsers()` factory |

## Data Flow

```
Raw file content (string)
  → EnvironmentParserService.parse(fileName, content, filePath)
    → DotEnvParser / PropertiesParser / YamlParser
      → EnvEntry[] { key, value, file, line }
```

## Adding a New Format

1. Create a new parser class in this folder implementing `IEnvParser`.
2. Add it to the array in `createParsers()` in `index.ts`.
3. Nothing else in the codebase changes.

## Notes

- All parsers are **VS Code-free** and testable in plain Node.js.
- The `line` property on each entry enables the click-to-navigate feature.
- YAML uses the `yaml` npm package for robust parsing (aliases, multi-doc, line tracking).
