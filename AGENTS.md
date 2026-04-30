# AGENTS.md

## Project Context

ZapSheet is a lightweight spreadsheet-like web app built with React, TypeScript, Zustand, and Supabase.

This project is not a toy clone. It is used by a real user, so preserving existing behavior and saved data is more important than aggressive refactoring.

ZapSheet includes spreadsheet-like features such as:

- Cell editing
- Cell selection
- Range selection
- Drag-based auto fill
- Merged cells
- Cell styles
- Formula evaluation
- Undo / Redo history
- Clipboard copy and paste with TSV conversion
- Multi-sheet support
- Sheet metadata management
- Row / column insertion and deletion
- Row / column resizing
- Autosave
- Supabase remote sync

The current goal is to improve maintainability, reliability, and portfolio readiness without breaking existing behavior.

---

## Core Principle

Do not rewrite the whole app.

Prefer small, safe, incremental, reviewable changes.

The best refactor is one that:

- Preserves current behavior
- Reduces responsibility in large files
- Improves type safety
- Makes logic easier to test
- Makes the project easier to explain in interviews
- Does not break existing Supabase data

---

## Before Editing Files

Before editing any files, always write a proposal first.

Do not modify code until the user approves the plan.

Use this format:

# Change Proposal

## 1. Summary

Briefly summarize what you want to change.

## 2. Target Area

Explain which area you are targeting:

- Coordinate/range utilities
- Selection logic
- Cell editing
- Cell styles
- Clipboard copy/paste
- Auto-fill
- Undo/redo
- Formula evaluation
- Multi-sheet logic
- Autosave/Supabase sync
- UI/UX improvement
- Type cleanup

Also list the files likely to be affected.

## 3. Current Problem

Explain the current issue in the existing code.

Look for:

- Too much responsibility in one file
- Store logic that can become pure utility functions
- Duplicated logic
- Unclear names
- Weak types or `any`
- Coupled logic that is hard to test
- Risky side effects
- UI and business logic mixed together

## 4. Proposed Change

Explain exactly what you propose to do.

Be specific:

- Functions to extract
- Types to create or improve
- Files to create
- Files to modify
- Logic to keep unchanged
- Behavior to preserve

## 5. Why This Change

Explain why this change is worth doing.

Connect it to:

- Maintainability
- Readability
- Type safety
- Testability
- Smaller store responsibility
- Safer future feature development
- Better portfolio/interview explanation

## 6. Risk Analysis

Explain what could break.

Pay special attention to:

- Supabase sync
- Autosave
- Undo/redo
- Copy/paste
- Merged cells
- Formula evaluation
- Multi-sheet data isolation
- Existing saved data compatibility

Classify the risk as:

- Low
- Medium
- High

And explain why.

## 7. Risk Mitigation Plan

Explain how you will reduce risk.

Use principles like:

- Small diff
- Pure function extraction first
- Preserve existing public function signatures where possible
- Avoid DB schema changes
- Avoid UI redesign
- Avoid changing persisted data shape
- Add or preserve fallback behavior

## 8. Execution Steps

Break the work into small steps.

Use this format:

### Step 1

- Work:
- Reason:
- Risk:
- Files touched:

### Step 2

- Work:
- Reason:
- Risk:
- Files touched:

### Step 3

- Work:
- Reason:
- Risk:
- Files touched:

## 9. Acceptance Criteria

The change is acceptable only if:

- Existing spreadsheet behavior still works
- TypeScript passes
- Build passes
- No core feature is removed
- Existing Supabase data remains compatible
- Undo/redo still works if touched
- Copy/paste still works if touched
- Multi-sheet behavior still works if touched
- The diff is reviewable
- The code is easier to explain after the change

## 10. Manual Test Checklist

Provide a checklist the user can run manually after the change.

Include only relevant tests, but consider:

- Cell editing
- Cell selection
- Range selection
- Drag auto-fill
- Copy/paste
- Undo/redo
- Sheet add/delete/rename/switch
- Autosave
- Refresh persistence
- Formula evaluation
- Merged cells
- Row/column resize
- Row/column insertion/deletion

## 11. Do Not Touch

List files or behavior that should not be touched in this change.

## 12. Approval Request

End with exactly this sentence:

"Please review this proposal. I will not edit files until you approve the plan."

---

## High-Risk Areas

Be extra careful with the following areas:

- Supabase sync
- Autosave
- Undo / Redo
- Multi-sheet behavior
- Clipboard copy / paste
- Formula evaluation
- Cell merge behavior
- Row / column insertion and deletion
- Existing persisted data shape

Do not change the database schema unless explicitly requested.

Do not change the saved data format unless explicitly requested.

Do not introduce migrations unless explicitly requested.

---

## Refactoring Priority

Preferred order:

1. Coordinate and range utilities
2. Clipboard utilities
3. Auto-fill utilities
4. Type cleanup
5. UI state cleanup
6. Autosave status improvement
7. Store responsibility separation
8. Undo/redo internal cleanup
9. Supabase sync cleanup

Start with the safest extraction target.

Good first candidates:

- Pure utility functions
- Coordinate helpers
- Range helpers
- TSV parsing/serialization helpers
- Auto-fill pattern inference helpers
- Type definitions

Avoid starting with:

- Autosave rewrite
- Undo/redo rewrite
- Supabase schema change
- Large UI redesign
- Full store rewrite

---

## Coding Guidelines

Follow the existing project style.

Keep changes small.

Prefer explicit names over clever abstractions.

Prefer pure functions when extracting logic.

Avoid unnecessary abstractions.

Avoid introducing new libraries unless clearly justified.

Avoid `any`.

Improve types gradually.

Add comments only when the reason is not obvious from the code.

Preserve existing behavior by default.

If behavior changes are needed, explain them in the proposal first.

---

## State Management Guidelines

The Zustand store should not become a dumping ground for every feature.

When possible, separate:

- Domain types
- Pure utility functions
- Store actions
- Supabase persistence logic
- UI-only state
- Derived calculations

However, do not split everything at once.

Prefer incremental extraction.

Do not change public store APIs unless necessary.

If changing store APIs, update all call sites carefully and explain the risk.

---

## Supabase Guidelines

Supabase-related changes are high-risk.

Before modifying Supabase sync or autosave logic, explain:

- What data is currently saved
- When it is saved
- Which tables are affected
- Whether the persisted data shape changes
- How refresh persistence will be tested

Do not change table names, column names, or schema shape unless explicitly requested.

Existing user data must remain compatible.

---

## Autosave Guidelines

Autosave improvements should prioritize reliability and user trust.

Recommended save statuses:

- idle
- saving
- saved
- error

If implementing or changing autosave status, ensure:

- The UI does not lie about saved state
- Failed saves do not crash the app
- Retry behavior is clear
- Duplicate saves are avoided where reasonable
- Existing save behavior is preserved unless explicitly changed

---

## UI/UX Guidelines

Do not do large visual redesigns unless explicitly requested.

Small practical improvements are preferred:

- Save status indicator
- Error message
- Retry button
- Better empty state
- Better loading state
- Keyboard shortcut guide
- CSV export button
- Clearer sheet rename UX

Any UI change should support real user stability, not just decoration.

---

## Portfolio Readiness

When making changes, try to make the project easier to explain in interviews.

Good explanations include:

- Responsibility separation
- Store complexity reduction
- Pure function extraction
- Type safety improvement
- Autosave reliability improvement
- Real-user UX improvement
- Data structure reasoning
- Performance consideration

After each approved change, summarize:

- What changed
- Why it changed
- What risk was avoided
- How to test it
- How to explain it in an interview

---

## Validation Commands

After code changes, run the appropriate checks based on the project setup.

Prefer commands such as:

- npm run typecheck
- npm run lint
- npm run build
- npm run test

If a command does not exist, do not invent a new setup unless requested.

Instead, report that the command is unavailable.

---

## Manual Testing Requirement

After every change, provide a manual test checklist.

At minimum, consider:

- Can the app load?
- Can a cell be edited?
- Can a range be selected?
- Can copy/paste still work?
- Can undo/redo still work?
- Can sheets be switched?
- Does data persist after refresh?
- Does autosave still work?
- Did any touched feature regress?

---

## Forbidden Actions

Do not:

- Rewrite the entire app
- Replace Zustand with another state library
- Replace Supabase with another backend
- Change the DB schema without explicit approval
- Remove existing features
- Remove existing data compatibility
- Introduce a large design system rewrite
- Make broad formatting-only changes across unrelated files
- Mix multiple unrelated refactors in one diff
- Hide risky behavior changes inside a refactor

---

## Preferred Working Style

Work like a careful senior engineer.

For each task:

1. Inspect the current code
2. Propose the change
3. Wait for approval
4. Make a small diff
5. Explain what changed
6. Explain how to test it
7. Mention any remaining risk

When uncertain, choose the safer option.
