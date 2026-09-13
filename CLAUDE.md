# Moments — Employee Celebration Autopilot

Codename `hilalaziz32`. Standalone product. **Not** part of `scaletopiaCentre` —
conventions were copied from it, code is not shared.

## What it is

HR uploads an employee list once and sets a PKR budget per moment type, then forgets
about it. For each upcoming celebration the system runs a fixed pipeline:

```
T-7  verify address/details (tokenised self-serve link, no login)
T-4  select a gift within budget
T-2  optional approval to HR/manager (one tap)
T-0  gift delivered
T-0 09:00 PKT  personalised announcement to Slack / WhatsApp / email
T-0 09:05      manager gets a pre-written personal message
            HR dashboard marks it completed
```

Revenue: software subscription **plus margin on every fulfilled gift**.

Market: Pakistan. Incumbent corporate gifting suppliers sell merchandise in bulk with
10–25 piece minimums; nobody owns the recurring, one-employee-at-a-time workflow.

## Locked decisions

- **Data access: supabase-js (PostgREST) + RLS** against the `moments` schema. No ORM.
  Anything PostgREST cannot express is a `SECURITY DEFINER` RPC.
- **Channels at launch: Email + WhatsApp Business API + Slack.** No MS Teams.
- **v1 fulfillment is ops-assisted**: real order records plus an internal ops queue
  where our staff place the vendor order by hand. No vendor API, no vendor portal.
- Project context stays in this repo. Nothing goes to global `~/.claude` memory.

## Status

| Phase | State |
|---|---|
| 1 — `moments` schema | **Done.** 51 tables, 4 views, 25 functions, 95 RLS policies, 160 indexes. Applied and smoke-tested. |
| 2 — Repo skeleton + onboarding | Not started |
| 3 — Detector + poller | Not started |
| 4 — Channels | Not started |

Full plan: `~/.claude/plans/fucker-dont-use-mcp-cozy-hearth.md`.

## Database

**Read `docs/database/README.md` before touching SQL.** The non-obvious parts:

- This Supabase project is **shared** — `public` belongs to an unrelated tours/bookings
  app. Never create objects in `public`. `auth.users` is shared too.
- Connect with `psql` and the direct connection string. **Do not use the Supabase MCP
  server** — it points at a different project and is unauthorized.
- `statement_timeout = 8s` on `authenticator`: CSV import and bulk writes must chunk.
- Money is `bigint` paisa everywhere, suffix `_paisa`.
- Timezone is an IANA name (`Asia/Karachi`), never a `+05:00` offset.

## Stack (planned, matching house conventions)

pnpm workspaces + Turborepo · Next.js 16 App Router · React 19 · TypeScript strict ·
Tailwind v4 (CSS-first, no config file) · shadcn/ui `new-york` / neutral / lucide ·
`@supabase/ssr` four-file setup · Server Actions taking `FormData`, returning
`{success} | {error}` · zod at the four trust boundaries (CSV rows, webhooks, public
token bodies, task payloads) · node-cron worker at `Asia/Karachi` · Railway, two
services from one image via `PROCESS_ROLE`.

## The three risks to keep in view

1. **WhatsApp cannot post to groups.** Pakistani companies assume it can. Email +
   Slack must be a complete product; WhatsApp stays behind a flag. Ship the "Copy for
   WhatsApp group" button.
2. **Ops-assisted fulfillment is a human bottleneck.** The `order_fallback` handler
   (T-0 08:00, substitute a digital gift if the physical one is not in transit) is the
   single most important handler in the product.
3. **Scheduling bugs are silent.** All scheduling math must be pure, injected-clock,
   and fixture-tested. Database constraints are the last line: a logic bug should
   produce a loud conflict, not a quiet duplicate.

## Git identity

Every commit is authored as **Muhammad Hilal Aziz <janjeejan740@gmail.com>** (pinned in this repo's local git config).
Never use team@scaletopia-agency.com for anything in this project. Never override the author with `-c user.email`.
