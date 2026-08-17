# AICO-018 Structured Goal Intake Evidence

**Parent issue:** `duckvhuynh/aicompanyos#18`  
**Frontend issue:** `duckvhuynh/aico-web#3`  
**Evidence date:** 2026-08-17  
**Canonical command:** `npm run verify`

**Hosted PR SHA:** pending  
**Hosted Frontend CI:** pending

The founder intake form covers the US-002 fields, states prototype limits on
every visit, preserves draft values and uploaded attachment references through
client/server validation, submits idempotently, and routes to persisted run
status instead of optimistic generated narration.

## Scope

- `/goal` captures target user, problem, desired outcome, primary flow,
  must-haves, non-goals, visual direction, five-screen / one-flow / client-only
  / mock-or-local constraints, and up to five validated attachments.
- `422 goal_out_of_scope` stays on the form with field-associated warnings.
  Successful submit navigates to `/runs/{id}` and renders GET `/runs/{id}`.
- No AICO-019 qualification records (`qualified` / `needs_clarification` /
  `out_of_scope` as stored results).

## Acceptance reconciliation

| ID               | Parent criterion                                                                                          | Evidence                                      | Result  |
| ---------------- | --------------------------------------------------------------------------------------------------------- | --------------------------------------------- | ------- |
| A18-FORM-01      | Form covers the authoritative fields and persistently states one flow, five screens, client/mock, prototype-only limits. | Goal intake form, Playwright axe              | Pending |
| A18-VALIDATE-01  | Accessible client/server validation preserves values, attachment state, and actionable warnings.          | Vitest + Playwright 422 case                  | Pending |
| A18-SUBMIT-01    | Submit is idempotent and routes to persisted qualification status rather than optimistic narration.       | Playwright submit to run status               | Pending |
| A18-BOUND-01     | No AICO-019 qualification records, no AICO-020 analytics, no 23rd backend gate.                           | Status page reads GET `/runs/{id}` only       | Pending |

## Non-goals kept

- AICO-019 qualification-status persistence
- AICO-020 analytics events
- Run-overview expansion beyond submitted status
