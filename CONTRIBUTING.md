# Contributing to AI Company OS Web

Frontend delivery is governed by the parent `duckvhuynh/aicompanyos` product and delivery baseline. This repository implements that plan; it does not create a parallel roadmap.

## Source-of-truth order

1. [`MVP_SCOPE.md`](https://github.com/duckvhuynh/aicompanyos/blob/main/docs/product/MVP_SCOPE.md)
2. [`PRD.md`](https://github.com/duckvhuynh/aicompanyos/blob/main/docs/product/PRD.md)
3. [`SRS.md`](https://github.com/duckvhuynh/aicompanyos/blob/main/docs/product/SRS.md)
4. [`BACKLOG.md`](https://github.com/duckvhuynh/aicompanyos/blob/main/docs/delivery/BACKLOG.md), sprint plan, and roadmap
5. [GitHub Project 2](https://github.com/users/duckvhuynh/projects/2)
6. This repository's `DESIGN.md` and app contracts refine implementation without widening parent scope

## Before starting a change

Every feature must have one parent `aicompanyos` issue that exists in the delivery backlog and GitHub Project, plus acceptance criteria that can be demonstrated.

## Branches, commits, and pull requests

- Use `feat/{featname}` for implementation branches. Examples: `feat/company-setup`, `feat/aico-018-intake`.
- Do not start branches with `agent/` or `codex/`.
- Include `Refs duckvhuynh/aicompanyos#<number>` in commit messages.
- Close a local frontend issue when it is the implementation record for the change.
- Complete every section of the pull request template.

## Stack

- Public landing: Next.js
- Founder webapp: Vite, React, Tailwind CSS
- Accessibility target for control-plane core flows: WCAG 2.2 AA

## Definition of done

A frontend change is done only when the implementation stays inside the cited parent issue, keyboard and screen-reader smoke pass for the authorized flow, and GitHub Project status reflects the actual delivery state.
