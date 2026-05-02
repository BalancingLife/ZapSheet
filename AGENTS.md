# AGENTS.md

## Core Principle: Compound Engineering

This repository follows a compound engineering workflow.

Every task should not only solve the current problem, but also make future work easier, safer, and faster.

Agents must optimize for:
- reusable patterns
- clear abstractions
- small safe changes
- automated verification
- accumulated project knowledge
- reduced future ambiguity

Do not treat each task as isolated. Treat each task as an opportunity to improve the system.

---

## Working Loop

For every non-trivial task, follow this loop:

1. Understand
2. Plan
3. Implement
4. Verify
5. Explain
6. Leave reusable knowledge

Do not jump directly into code unless the change is very small.

---

## 1. Understand

Before editing code, inspect the relevant files and existing patterns.

Identify:
- the current architecture
- related components, hooks, stores, APIs, types, and styles
- naming conventions
- existing reusable utilities
- potential side effects

Prefer extending existing patterns over inventing new ones.

If the request is ambiguous, make the safest reasonable assumption and state it in the plan.

---

## 2. Plan Before Coding

Before implementation, provide a short plan containing:

- What will be changed
- Why this approach fits the existing codebase
- Files likely to be touched
- Risks or edge cases
- How the result will be verified

Do not over-plan. Keep the plan practical and execution-oriented.

---

## 3. Implement Small, Composable Changes

Make changes that are easy to review.

Prefer:
- small functions over large functions
- clear names over clever code
- existing components over new components
- existing state management patterns over new ones
- explicit types over implicit assumptions
- predictable data flow over hidden side effects

Avoid:
- unrelated refactoring
- broad rewrites
- changing public APIs without need
- mixing feature work and cleanup in the same change
- adding dependencies unless clearly justified

---

## 4. Compound the Codebase

When solving a problem, look for reusable improvements.

If the same pattern appears multiple times, consider extracting:
- a utility function
- a custom hook
- a shared component
- a shared type
- a constants file
- a validation helper
- a test helper

However, do not abstract too early. Only extract when it clearly reduces duplication or future risk.

Each completed task should leave the codebase easier to modify next time.

---

## 5. Verification Required

After implementation, verify the change.

Use the strongest available checks for this repository:

- type check
- lint
- unit tests
- integration tests
- build
- manual behavior check

If a check cannot be run, explain why.

Never claim something works unless it has been verified or clearly marked as unverified.

---

## 6. Self-Review Before Final Answer

Before finishing, review the diff as if you are reviewing a pull request.

Check:
- Does this solve the actual request?
- Did I change anything unrelated?
- Are names clear?
- Are edge cases handled?
- Are types safe?
- Is the UI behavior consistent?
- Is the code easier to work with than before?
- Is there any duplicated logic that should be extracted?
- Did I leave unnecessary console logs, comments, or dead code?

Fix obvious issues before responding.

---

## 7. Leave Knowledge Behind

At the end of a task, provide a short summary that helps future work.

Include:
- what changed
- why it changed
- how it was verified
- any new reusable pattern introduced
- remaining risks or follow-up ideas

If the task reveals an important project convention, suggest adding it to this file.

---

## 8. Multi-Agent / Parallel Work Rules

When multiple agents work in parallel:

- each agent must work on a separate branch
- each agent must own a clearly separated task
- avoid editing the same files unless necessary
- each agent must summarize touched files and risks
- each agent must provide verification results
- final integration must be done by a human or a dedicated integration pass

Recommended roles:

### Planner Agent
- Reads the codebase
- Produces implementation plan
- Identifies files, risks, and verification strategy
- Does not write production code unless asked

### Builder Agent
- Implements the planned change
- Keeps the diff small
- Follows existing project conventions
- Adds or updates tests when appropriate

### Reviewer Agent
- Reviews the diff
- Looks for bugs, regressions, unnecessary complexity, and missed edge cases
- Suggests concrete fixes
- Does not rewrite everything unless necessary

### Refactor Agent
- Improves structure after behavior is working
- Extracts reusable patterns
- Removes duplication
- Preserves existing behavior

### Test Agent
- Adds or improves tests
- Checks important user flows
- Looks for failure cases
- Confirms that the change is safe

---

## 9. Branch Strategy

Use separate branches for separate tasks.

Branch naming examples:

- feature/add-user-profile
- fix/header-layout-shift
- refactor/extract-carousel-hook
- test/add-auth-flow-tests
- chore/update-agent-rules

Do not stack multiple unrelated tasks in one branch.

If a branch contains unrelated work, split it before opening a pull request.

---

## 10. Commit Style

Use this commit format:

gitmoji: concise summary

- 1
- 2

Example:

✨: 장소 저장 탭 UI 추가

- 저장한 장소와 인기 장소 탭 전환 구조 추가
- 탭 상태에 따라 아이콘과 리스트 데이터를 분리

---

## 11. Pull Request Summary Format

When preparing a PR or final response, use this format:

## Summary

- 

## Why

- 

## Changes

- 

## Verification

- [ ] Type check
- [ ] Lint
- [ ] Test
- [ ] Build
- [ ] Manual check

## Risks

- 

## Follow-up

- 

---

## 12. Code Style Preferences

Follow the existing style of the repository.

General preferences:

- Use TypeScript safely.
- Prefer readable code over clever code.
- Avoid unnecessary comments.
- Comments should explain why, not what.
- Keep functions focused.
- Keep component logic separated from UI when complexity grows.
- Prefer custom hooks for reusable stateful logic.
- Prefer shared types for API response/request contracts.
- Avoid console logs in committed code.
- Avoid magic numbers and unexplained constants.

---

## 13. Frontend Guidelines

When working on frontend code:

- Preserve existing UI/UX patterns.
- Keep components reusable but not over-abstracted.
- Separate business logic from rendering when possible.
- Prefer controlled state flow.
- Keep responsive behavior in mind.
- Avoid layout changes outside the requested scope.
- Check loading, empty, error, and success states.
- Make interaction states clear: disabled, active, selected, pending.

For React:

- Use hooks intentionally.
- Avoid unnecessary useEffect.
- Avoid unnecessary memoization.
- Use useMemo/useCallback only when there is a real reason.
- Keep derived state derived instead of duplicating it in state.
- Prefer functional state updates when next state depends on previous state.

---

## 14. Backend / API Guidelines

When working on backend or API-related code:

- Keep DTOs aligned with frontend usage.
- Validate inputs at boundaries.
- Return predictable response shapes.
- Use clear status codes.
- Keep business logic out of controllers when possible.
- Avoid leaking database details directly to the client.
- Handle error cases explicitly.
- Keep API contracts documented through types or examples.

---

## 15. Database Guidelines

When changing database or Prisma schema:

- Explain why the schema change is needed.
- Consider migration impact.
- Keep relations explicit.
- Use indexes when query patterns justify them.
- Avoid unnecessary nullable fields.
- Keep naming consistent.
- Check whether the frontend DTO needs to change.

Do not modify schema casually.

---

## 16. AI Agent Behavior Rules

Agents should act like careful senior collaborators.

Agents must:
- inspect before editing
- plan before large changes
- explain tradeoffs
- preserve existing behavior
- minimize unnecessary diff
- verify work
- document reusable learnings

Agents must not:
- hallucinate files or APIs
- invent project conventions
- silently skip verification
- make broad rewrites without reason
- add dependencies without justification
- hide uncertainty
- claim completion without evidence

---

## 17. Definition of Done

A task is done only when:

- the requested behavior is implemented
- the code follows existing patterns
- important edge cases are handled
- verification has been run or clearly marked as not run
- the final summary explains what changed and why
- future maintainers can understand the change quickly

The goal is not just to finish the task.

The goal is to make the next task easier.
