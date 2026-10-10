# StoryAura Land: Customer Rules

Plain-English rules for what customers can and can't do. The code that enforces them is in
`server/modules/plan-rules.js`. If you change a number here, change it there too (and the tests in
`tests/plan-rules.test.js`).

_Last updated: 2026-10-07. Status: **in force on dansprout.com**, paid plans **not yet on sale**._

> **The numbers in this file are the built-in defaults.** The live values are stored in the database table
> `app_settings` and can be changed from the owner-only admin page (`/admin`, Rules tab) or with SQL,
> without a deploy. See section 7. The admin page's **Rules** tab always shows what is live right now.

---

## 1. The short version

| | Free (Explorer) | Paid (when launched) |
|---|---|---|
| Needs an account with an email | Yes | Yes |
| How long | **14 days** from account start | Until cancelled |
| Learners (children) | **1** | Individual 1, Family up to 5, Classroom up to 30 |
| New stories | **5 in total** during the 14 days | No plan limit (see the monthly cap in section 6) |
| Read stories already created | **Always, forever** | Always |
| Read-aloud and word help on saved stories | **Always** | Always |

**After day 14** (or after story 5, whichever comes first) a free account can still **open and read everything it
already made**, but it can't create new stories until it has a paid plan.

---

## 2. Free Explorer, in detail

1. **Sign-up:** an adult (parent or teacher) opens an account with an email and password, accepts the
   guardian and AI-consent boxes, and verifies the email. No card is asked for.
2. **The 14 days** start the moment the account is created. They are calendar days; there's no pausing.
3. **One learner.** The account can hold 1 learner profile. Trying to add a second shows:
   _"Your free Explorer plan includes 1 learner. Paid plans are coming soon."_
4. **Five stories.** Every new story the account creates in the 14 days counts, whether the parent or the child
   created it. These do **not** count: stories copied from a sibling, and stories created before the free
   period started. Deleting a story does **not** give the story back.
5. **Revising** an existing story (asking the AI to change it) is allowed during the 14 days and does not use
   one of the 5. It stops when the 14 days end.
6. **What a child sees** when the limit is reached: _"Story creation is resting for now. Ask a grown-up to open
   Plans & billing."_ Children never see price or billing wording.
7. **What a parent sees** when the limit is reached:
   - 14 days over: _"Your 14-day free Explorer period has ended. Paid plans are coming soon. Your saved stories stay available to read."_
   - 5 stories used: _"You have used all 5 free Explorer stories. Paid plans are coming soon. Your saved stories stay available to read."_
8. The Plans & billing page shows the live count: _"Free Explorer: 9 days left, 2 of 5 stories used, 1 of 1 learner."_

---

## 3. What stays free forever

- Reading any story the account already created (on screen).
- Read-aloud and tapping a word for its meaning.
- The story shelf (favourite, rate, pick up where you stopped).
- Parent progress view, privacy tools, data export, and account deletion.
- Printing a saved story (if printing is available in the app; see section 8).

We never delete a family's learners or stories because their free period ended.

---

## 4. Paid plans (not on sale yet)

While `PRICING_COMING_SOON` is on (it is on in production), Individual and Family show **"Coming soon"**,
no prices are shown, and checkout is blocked on the server.

When pricing is launched, the plans in the code are:

| Plan | Price in the code | Learners |
|---|---|---|
| Individual | $8.99 / month, or $75 / year | 1 |
| Family | $14.99 / month | up to 5 |
| Classroom | Custom ("Contact us") | up to 30 |

**Paying unlocks everything:** unlimited story creation (subject to the monthly cap below) and the plan's
learner limit. Only a real, active subscription counts. A "demo" plan selection **never** unlocks paid access
in production.

---

## 5. Existing customers (grandfathering)

- When these rules went live, **every existing account's 14-day clock started that day**, so nobody was locked
  out the moment the rules arrived.
- Existing accounts with more than 1 learner, or more than 5 stories, **keep all of them.** The rules only stop
  _adding_ new learners and _creating_ new stories beyond the allowance.
- **Never limited:** the site owner (`OWNER_EMAIL`), any email in `PLAN_EXEMPT_EMAILS` (Railway variable),
  and any email on the **Never-limited accounts** list in the admin page (Rules tab, or the Customers tab's
  "Never limit" button).

---

## 6. Rules that apply to everyone

- **Monthly AI cap:** 100 AI actions per account per calendar month (`AI_MONTHLY_INVOCATION_LIMIT`). This is a
  cost safeguard, separate from the plan rules.
- **Parent control:** only the adult can create the account, add learners, enable sharing, change settings,
  cancel, or delete data. Sensitive actions ask the parent to confirm.
- **Sibling sharing:** off until a parent turns it on. A shared story gives the other child their own copy and
  their own progress.
- **Privacy promises:** no ads, no chat between users, no public story gallery, and no third-party trackers.
- **Cancellation:** the parent enters their password and confirms by email. It stops future renewal, does not
  delete learner profiles, stories, or progress, and is not an automatic refund.
- **Support:** questions, billing issues, and refund requests go through the Support form on the site.
  Never put passwords, card numbers, or secret keys in a message (the form rejects them).

---

## 7. How the settings work

Every number in this file is a **setting**. A setting's value comes from the first of these that has one:

1. **The database**, table `app_settings`. Set from the admin page (`/admin`, Rules tab) or with SQL. Takes effect
   within about 30 seconds, no deploy. This always wins.
2. **The config file** `config/settings.json` in the project. These are the project defaults. Changing it needs a
   deploy. Delete a line and that setting falls back to layer 3.
3. **The built-in default** in the code (`server/modules/settings.js`). A few also honor an old environment
   variable (`AI_MONTHLY_INVOCATION_LIMIT`, `STORY_GEN_RATE_LIMIT`) as their starting default.

| Setting key | Built-in default | What it does |
|---|---|---|
| `free_period_days` | 14 | Days a new account can create stories for free |
| `free_story_limit` | 5 | New stories allowed during the free period |
| `free_learner_limit` | 1 | Learners on a free account |
| `learner_limit_individual` / `_family` / `_classroom` | 1 / 5 / 30 | Learners per paid plan |
| `paid_story_limit_monthly` | 0 | New stories a paying account can create per calendar month. **0 = no plan limit** |
| `pricing_coming_soon` | `default` | `default` = on in production, off elsewhere; `on` = hide prices and block checkout; `off` = paid plans are sold |
| `plan_exempt_emails` | none | Emails that are never limited (the owner always is) |
| `ai_monthly_limit` | 100 | AI actions per account per month (cost safeguard, applies to everyone) |
| `story_requests_per_15min` | 30 | Story requests the whole site accepts per 15 minutes (abuse protection) |
| `roster_import_max` | 100 | Most learners one classroom CSV import can add |

### See every setting in SQL

The server keeps a readable catalog up to date at startup. Use the view `settings_overview`:

```sql
-- every setting: the value in effect, where it comes from, its default, and what it does
SELECT "group", key, effective_value, source, database_value, file_value, built_in_default, help
FROM settings_overview;
```

`source` is `database`, `file` or `default`. To change one:

```sql
INSERT INTO app_settings (key, value) VALUES ('paid_story_limit_monthly', '30')
  ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();
DELETE FROM app_settings WHERE key = 'paid_story_limit_monthly';   -- back to the file / default
```

Prefer the admin page: it checks the value is allowed, asks for your password, and records the change in the audit
log. A direct SQL edit is checked when the site reads it (an invalid value is ignored) but is **not** audit-logged.

Railway variables that still matter: `OWNER_EMAIL` (who the admin page belongs to; never limited),
`PLAN_EXEMPT_EMAILS`, and `PRICING_COMING_SOON`, all used only when no database or file value is set.

### The admin page (`/admin`)

- **Only the owner** (the account whose email is `OWNER_EMAIL`, signed in and email-verified) can use it. Everyone
  else, signed in or not, gets a "not found" response. Every change needs the owner's password again.
- **Overview:** customers, free-period status, learners, stories, reading time, story checks, AI usage and cost,
  daily trends, the sign-up-to-paying journey, what people use, payment and server health.
- **Customers:** search, sort, export CSV, give an account 7 more free days, never-limit an account. Shows counts only,
  never children's names or story text.
- **Rules**, **Audit log** (every change, who and when), **System** (version, database size, Stripe mode, email/AI setup).

---

## 8. Not decided yet / not verified

These are open, so please decide or confirm them before relying on them:

1. **Trial on paid plans.** The checkout code still gives paid plans a **7-day free trial**. With a 14-day free
   Explorer period first, you may not want a second trial. Decide before launch.
2. **Stripe is not live.** Production uses test keys, the Family price points at the wrong ($5) price, and the
   webhook listens to the wrong events. Payments cannot work until fixed.
3. **"We'll email you when paid plans are ready"** is **not** a promise the app makes, because there is no
   waiting-list email yet. The messages only say "coming soon".
4. **Printing.** Confirm there is a working Print button in the app before promising it publicly.
5. **Day-15 experience.** Right now, with paid plans off, a customer whose free period ended has nothing to
   buy. Consider a "notify me" sign-up, or extending the free period until pricing launches.
6. **Legal.** Terms, privacy, and refund wording are drafts and need review before paid launch.
7. **Math lessons** are not built; don't advertise them as available.
