# Feature: Click-to-Navigate

## What It Does

Provides a single helper function (`openFileCommand`) that every tree view in the extension uses to turn tree items into clickable links. When a user clicks any key or file in the sidebar, it opens the source file **at the exact line** where that key is defined.

## How It Works

1. **`openFileCommand(fsPath, line?)`** builds a VS Code `Command` object using the built-in `vscode.open` command.
2. If a `line` number is provided (1-based), it creates a `Range` selection so the cursor lands on that line.
3. If no line is given, it simply opens the file at the top.

## Files

| File | Purpose |
|------|---------|
| `navigation.ts` | The `openFileCommand()` helper function |
| `index.ts` | Barrel export |

## Used By

- `features/discovery/` — file nodes and key nodes in the Environment Files tree
- `features/comparison/` — missing/extra/different key nodes in the Comparison Results tree
- `features/missing-keys/` — file nodes in the Missing Keys tree

## Data Flow

```
TreeItem click → openFileCommand(fsPath, line)
               → vscode.Command { command: 'vscode.open', arguments: [uri, options] }
               → VS Code opens the file at the target line
```

## Notes

- Uses the built-in `vscode.open` command — no custom command registration needed.
- Line numbers come from `EnvEntry.line`, which parsers populate during file parsing.
