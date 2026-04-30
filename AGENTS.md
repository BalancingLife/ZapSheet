# AGENTS.md

## Project

ZapSheet is a lightweight spreadsheet-like web app built with React, TypeScript, Zustand, and Supabase.

The project is used by a real user, so preserving existing behavior is more important than large rewrites.

## Rules

- Do not rewrite the whole app.
- Do not remove existing features.
- Do not change the database schema unless explicitly asked.
- Do not introduce a new state management library.
- Prefer small, reviewable diffs.
- Prefer pure utility extraction before store-level refactoring.
- Before editing risky logic, explain the risk first.

## High-Risk Areas

Be careful with:

- Supabase sync
- Autosave
- Undo / Redo
- Multi-sheet behavior
- Clipboard copy / paste
- Formula evaluation
- Cell merge behavior

## Refactoring Preference

Preferred order:

1. Coordinate and range utilities
2. Clipboard utilities
3. Auto-fill utilities
4. Type cleanup
5. Autosave status improvement
6. Store responsibility separation

## Validation

After changes, check:

- TypeScript typecheck
- Lint
- Build
- Core spreadsheet manual flows
