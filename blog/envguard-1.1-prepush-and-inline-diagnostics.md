---
title: "EnvGuard Update: Catch Broken .env Files Before They Ever Reach Production"
published: false
description: "Two new features in EnvGuard — live inline diagnostics in the editor and a git pre-push validation hook — turn 'works on my machine' env bugs into errors you see before you push."
tags: vscode, productivity, devtools, opensource
series: EnvGuard
cover_image: https://raw.githubusercontent.com/ratuhin1122/EnvGuard-VS-Code-Extension-/main/views/demo.gif
---

> **Catching up?** I introduced EnvGuard in an earlier post — a framework-agnostic environment file manager for VS Code that discovers, parses, compares, and audits your `.env`, `.properties`, and `.yml` config across Laravel, Node, Spring Boot, Django, Rails, Go, .NET and more. Everything runs locally: no telemetry, no network calls, no accounts.
>
> This post is about what's new. 👇

If you've ever shipped a deploy that fell over because `.env.production` was missing a key that existed in your local `.env`, this update is for you.

The latest release adds **two new lines of defense** so a missing or empty environment variable stops being a runtime surprise and becomes something you see *while you're typing* and *before you push*:

1. **Inline Diagnostics** — live, ESLint-style squiggles right inside your `.env` files.
2. **Pre-Push Validation Hook** — a git `pre-push` hook that validates your environment files automatically on every `git push`.

Both are built on the same idea EnvGuard has always had: **`.env.example` is your contract.** It declares which keys are *required*. Everything else is checked against it.

> One important principle throughout: **EnvGuard validates keys (structure), not values.** `APP_ENV=development` locally and `APP_ENV=production` on the server is *expected* — that's never flagged. We only care that the *keys* are present and filled in.

---

## 1. Inline Diagnostics — like ESLint, but for your `.env`

Until now, EnvGuard surfaced problems in the sidebar and report panel. Useful, but you had to go look. The new diagnostics service brings validation **directly into the editor**, the same way a linter underlines your code.

Open any `.env` / `.env.*` file and EnvGuard treats the `.env.example` sitting in the **same directory** as the source of truth for required keys, then underlines two kinds of problems:

- **Missing required variable** — a key defined in `.env.example` is absent → squiggle on the first line.
- **Empty required value** — a required key is present but blank (`KEY=`) → squiggle on that key's exact line, with the key token highlighted.

```env
# .env.example  (the contract)
DATABASE_URL=
REDIS_HOST=
STRIPE_KEY=

# .env  (what you actually have)
DATABASE_URL=postgres://localhost/dev
REDIS_HOST=            # ⚠ "REDIS_HOST" is empty but required by .env.example
                       # ⚠ Missing required variable "STRIPE_KEY"
```

### It updates as you type

Findings refresh **live** — no save required. The service parses the *live document text*, debounced at 300ms so it stays smooth while you type. And because the baseline matters too, **editing `.env.example` re-lints every open env file**: add a key to the template and every `.env` that's now missing it lights up instantly.

The `.env.example` template itself is never linted (it's the contract, not a target), and non-dotenv files (`.properties`, `.yml`) are left alone.

### Configurable

| Setting | Default | Description |
| --- | --- | --- |
| `envguard.diagnostics.enabled` | `true` | Turn inline diagnostics on/off |
| `envguard.diagnostics.severity` | `warning` | `error`, `warning`, `information`, or `hint` |

Change the severity and every open file re-lints immediately — set it to `error` if you want missing env vars to scream at you in red.

---

## 2. Pre-Push Validation Hook — stop bad config at the gate

Inline diagnostics help *you*. But what about the teammate who didn't notice the squiggle, or the CI config that drifted? That's what the **pre-push hook** is for: a last automatic checkpoint that runs on **every `git push`**, before anything reaches the remote.

Run **`EnvGuard: Install Pre-Push Hook`** from the Command Palette (or click the 🛡 button on the Environment Files view) and EnvGuard writes a `.git/hooks/pre-push` for you. From then on, `git push` runs three checks across all your discovered env files:

- **Missing variables** — a required key (from `.env.example`) is absent from an env file.
- **Empty values** — a required key is present but has no value (`KEY=`).
- **Consistency** — a key exists in some env files but is missing from others (e.g. `REDIS_HOST` defined in `.env` but not in `.env.production`).

```
$ git push
EnvGuard: ⚠ Missing variables:
  - STRIPE_KEY
EnvGuard: ⚠ Empty values:
  - REDIS_HOST
EnvGuard: ⚠ Inconsistent keys across env files:
  - SESSION_SECRET (missing from: .env.production)
```

### Two modes: nudge or block

Set `envguard.gitHook.mode` in Settings:

| Mode | Behavior on findings |
| --- | --- |
| `warn` (default) | Prints warnings, **push continues** |
| `strict` | Prints warnings, **push is blocked** (exit code 1) |

Start in `warn` to build trust, flip to `strict` once your team is ready to enforce it. And you don't have to reinstall to switch — **changing the mode automatically rewrites the installed hook**. EnvGuard watches the setting and updates the script in place.

### It plays nicely with your existing hooks

If you already have a `pre-push` hook, EnvGuard backs it up to `pre-push.envguard-backup` before installing, and **restores it on uninstall**. Run `EnvGuard: Uninstall Pre-Push Hook` and you're exactly back where you started.

---

## The interesting part: one validator, two homes

Here's the architecture detail I'm proud of. A git hook runs in **plain Node**, from a shell, *outside* the VS Code extension host — there's no `vscode` module to import. The extension, obviously, runs *inside* it. So how do you avoid writing the validation logic twice?

You don't duplicate it. The actual validation lives in a small, **VS Code-free `PrePushValidationService`** that only consumes plain `EnvFile` data models and reuses the existing `ComparisonService` for all the diffing. No new comparison logic was written — the pre-push checks are the same engine that powers the sidebar audit.

That pure service is then driven by two thin entry points:

- Inside the extension, it's wired up in `extension.ts` like every other feature.
- For the hook, a tiny standalone **CLI (`out/cli/validate.js`)** walks the repo with Node's `fs` (mirroring the extension's discovery include/exclude rules), runs the same validator, and prints results.

The generated hook is just:

```sh
#!/bin/sh
# EnvGuard managed pre-push hook
ROOT="$(git rev-parse --show-toplevel)"
node "/path/to/extension/out/cli/validate.js" --root "$ROOT" --mode warn
exit $?
```

A couple of deliberate safety choices baked into that CLI:

- **A hook must never crash a legitimate push.** Unreadable or unparseable files are skipped silently, and any unexpected error in the validator exits `0` (push proceeds) rather than blocking you over a bug in *my* code. Only an actual finding in `strict` mode exits non-zero.
- **Cross-platform paths.** The hook script is POSIX `sh` (git runs it via the bundled shell even on Windows), so the CLI path is forward-slashed regardless of OS.

This is the same "pure logic never imports `vscode`" rule EnvGuard has followed from day one — and it's exactly what made shipping a CLI a small addition instead of a rewrite.

---

## Try it

1. Install / update **EnvGuard** from the VS Code Marketplace.
2. Open a project with a `.env.example` and a `.env`.
3. Watch the inline squiggles appear as you edit.
4. Run **`EnvGuard: Install Pre-Push Hook`**, then `git push` and see it validate.

Everything still runs **100% locally** — no telemetry, no network, no accounts. Your secrets never leave your machine.

The project is open source. If pre-push validation or live diagnostics save you one broken deploy, that's a win. Try it out, and let me know what you'd want guarded next. 🛡️

*— Tuhin*
