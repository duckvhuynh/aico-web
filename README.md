# AI Company OS Web

Invite-only founder control plane for [AI Company OS](https://github.com/duckvhuynh/aicompanyos).

This repository is a single Next.js app: the public landing page plus authenticated company setup. The parent delivery backlog remains the product authority. The NestJS API lives in [`aico-backend`](https://github.com/duckvhuynh/aico-backend).

## Surfaces

- `/` — public landing. Invite-only. No public registration.
- `/enter` — redeem an invite token.
- `/company` — accessible company profile create and update against `/api/v1`.

## Delivery governance

Every change must trace to an approved parent issue in the [AI Company OS delivery backlog](https://github.com/duckvhuynh/aicompanyos/blob/main/docs/delivery/BACKLOG.md) and [GitHub Project 2](https://github.com/users/duckvhuynh/projects/2).

Read [CONTRIBUTING.md](CONTRIBUTING.md) before starting work. Pull requests must reference a parent issue as `Refs duckvhuynh/aicompanyos#<number>` and complete the MVP scope check.

## Local development

Prerequisites: Node.js 24.18.0 and a running local API from `aico-backend` at `http://localhost:3000`.

```bash
npm install
npm run dev
```

The app listens on `http://localhost:3001` and rewrites `/api` to the backend.

Issue a local invite from the API (`AUTH_MODE=development`, `APP_ENV=local|test`):

```bash
curl -s -X POST http://localhost:3000/api/v1/auth/invites \
  -H "content-type: application/json" \
  -d "{\"email\":\"founder@example.com\",\"display_name\":\"Founder\"}"
```

Open `/enter` and redeem the `invite_token`.

## Verify

```bash
npm run verify
```
