# Customer journey

Who uses Moments, what they are trying to get done, and where each moment's
information comes from. Read this before adding a feature: if it doesn't make one
of these jobs easier, it probably isn't the next thing to build.

## The people

| Person | Logs in? | What they want | What they must never have to do |
|---|---|---|---|
| **HR admin** (the buyer) | Yes | Nobody's day forgotten, inside a budget, without thinking about it | Remember dates, chase addresses, place orders |
| **Finance** | Yes | One predictable monthly invoice with tax done right | Reconcile per-gift receipts |
| **Manager** | No, texts and links | To say something personal on the day | Write it from scratch, or be impersonated |
| **Employee** | No, texts and links | Their gift at the right address; privacy respected | Create an account |
| **Our ops team** | Yes (`/ops`) | Every order placed on time | Guess an address |

## Where each moment's information comes from

This is the core answer to "how will we know?". Only two moments come from the
spreadsheet. The rest need someone to tell us, so the product has to make telling
us take seconds.

| Moment | Source | How it reaches Moments |
|---|---|---|
| Birthday | Sheet: date of birth | Import. Automatic every year. |
| Work anniversary | Sheet: joining date | Import. Automatic every year, milestone budgets. |
| New hire | Joining date | **Add a person** on their first day (or re-import). Past hire dates never fire. |
| Farewell | Last working day | **Mark as leaving** on the person's page. Never for "terminated for cause". |
| Promotion | Nobody's sheet | **Share news** on the person's page. |
| Wedding | Nobody's sheet | **Share news**. Logged up to 7 days late still counts. |
| New baby | Nobody's sheet | **Share news**. Private by default: no public announcement unless they want one. |
| Eid / Ramadan | Moon-sighting calendar | Automatic. Provisional until confirmed, and logistics wait for it. |

### Built

- Person page (`/employees/[id]`): upcoming moments, **Share news** (promotion,
  wedding, new baby), **Mark as leaving**, and a history of what was logged.
- **Add a person** (`/employees/new`) for someone joining without a re-import.
- The detector plans logged news (`evt:<id>`) and farewells from the exit date
  (`exit:<date>`), and runs right after news is logged when the worker is reachable.

- **Monthly SMS to HR** (1st, 10:00): "Any promotions, weddings, babies or people
  leaving this month?" with a link to the Team page. Plus a Monday 09:30 summary of the
  week's celebrations and anything stuck.

### Next, in order of how much they reduce "we didn't know"

1. **"Share good news" link for managers.** A company link HR can pin in Slack or a
   WhatsApp group. Anyone submits "Ayesha got married on Friday"; HR approves in one tap.
   Needs a `news_submissions` table and an anonymous RPC.
2. **Re-import notices a changed job title** and asks "was this a promotion?" instead of
   silently updating it.

## What a paying customer can do today

| Journey | Where |
|---|---|
| Sign up, confirm, reset a forgotten password | `/signup`, `/check-email`, `/forgot-password` |
| Set up: company → team → budgets → messages → go live, resumable | `/setup/*` |
| See this fortnight, the next 90 days, and what needs them | `/dashboard` |
| Follow one moment end to end, with word-for-word message previews | `/moments/[id]` |
| Add, edit, remove a person; log news; set a last day | `/employees/*` |
| Invite HR, finance and managers with a shareable link; change roles | `/settings/team`, `/join/[token]` |
| Company, tax, announcement time and rules | `/settings/company` |
| Budgets with what each amount buys | `/settings/moments` |
| SMS on/off, test phone, test text, every text previewed | `/settings/messages` |
| Who changed what, append-only | `/settings/activity` |
| Plan, invoices, report a bank transfer | `/billing` |

Moments are planned the instant HR goes live, imports, changes budgets or people, not
only by the nightly worker.

## The HR admin's journey

1. **Sign up, name the company** (15 seconds).
2. **Upload the sheet.** Birthdays, joining dates, phones, managers. Excel dates and
   Pakistani phone formats handled.
3. **Budgets.** Seven moments, pre-filled, with a live 90-day cost.
4. **Messages.** Switch on SMS, set a test phone, send a test text.
5. **Go live in dry run.** For 7 days every text goes to the test phone with
   `[PREVIEW]`, so HR sees exactly what employees will get.
6. **Then nothing.** Weekly they might log a promotion or a last day. The Today page
   shows what's coming and anything stuck.

## Channels

| Message | SMS (Twilio) | Email |
|---|---|---|
| Address confirmation link + reminder | Yes, when SMS is on and the person has a phone | On hold |
| Manager's suggested note | Yes | On hold |
| Approval request and its code | Yes, to approvers with a phone on their profile | On hold |
| Company-wide announcement | **No.** A text to 300 phones is spam, not a celebration | On hold; Slack is the planned home |

Email is on hold until there are paying customers. Messages on hold are still
recorded in the message log, so nothing is lost when a transport is switched on.
