# Architecture Decision Records

Short records of the important technical decisions made for StoryAura Land, and why. Newest at the bottom.

**How to use this file**
- One decision per entry, numbered. Don't rewrite an old decision. If we change our mind, add a new ADR and mark the old one `Superseded by ADR-00N`.
- Add an entry when a decision is made, not months later. Keep it short.
- Status values: `Accepted`, `Proposed`, `Superseded`.

Plain-English customer rules live in `CustomerRules.md`. This file explains the *engineering* choices behind them.

---

## ADR-001: Keep plan rules and pricing switches in a database table

- **Status:** Accepted (2026-10-07)
- **Context:** The free-plan numbers (days, stories, learners), the pricing switch, and the exempt-account list needed to change without a code deploy, and the owner is comfortable with SQL. Railway rebuilds the server on every deploy, so a file on the server would be lost. Environment variables need a redeploy to change.
- **Decision:** Store them in `app_settings` (`key`, `value` JSONB, `updated_by`, `updated_at`; migration `012_admin_settings.sql`). Every key has a built-in default in code (`server/modules/settings.js`), so an empty table is valid. The server re-reads the table about every 30 seconds.
- **Alternatives considered:** a config file in the repo (needs a deploy); environment variables only (needs a redeploy and has no history); a hard-coded constants file (same problems).
- **Consequences:**
  - Rules can be changed from SQL or the admin page and take effect within about 30 seconds.
  - Values are validated before use. An invalid saved value is ignored and the default applies.
  - Environment variables still work, but only as the starting default when no database value exists.
  - A direct SQL edit is not written to the audit log (see ADR-003).

## ADR-002: Free Explorer is time- and quantity-limited; reading stays free

- **Status:** Accepted (2026-10-07)
- **Context:** The goal is "free to try with an email, then pay to unlock". Before this change the server treated every account the same, so the plans page promised limits that were not enforced and paying unlocked nothing.
- **Decision:** Free Explorer is **14 days** from `accounts.free_started_at`, **1 learner**, **5 new stories** in that period. Limits are enforced on the server (`server/modules/plan-rules.js`) at parent story creation, child story creation, story revision, learner creation, and CSV roster import. Reading existing stories, read-aloud, word help, the shelf, privacy tools and data export are never limited. Sibling-shared copies do not count toward the 5. The owner and any exempt email are never limited.
- **Decision (grandfathering):** The column was added with `DEFAULT NOW()`, so every existing account's 14 days started on the day it first ran (2026-10-07). Nobody was locked out and no data was deleted.
- **Decision (demo plans):** In production, only a real `active` subscription unlocks paid access. The old "demo" plan selection never does. It still works in local development so the plan switcher stays testable.
- **Alternatives considered:** limits only in the front end (easy to bypass); a monthly story quota (a free-forever tier, which is not the goal); blocking reading after the free period (hostile and loses trust).
- **Consequences:**
  - Plan rules are a pure function (`computeEntitlement`) with unit tests, separate from the database.
  - **Open problem:** while paid plans are "coming soon", a customer whose free period ends has nothing to buy. This is listed in `CustomerRules.md` section 8 and needs a decision.

## ADR-003: Owner-only admin page that is invisible to everyone else

- **Status:** Accepted (2026-10-07)
- **Context:** The owner needs site-wide reporting and a way to edit rules, and nobody else may see or discover it.
- **Decision:** `/admin` serves a data-free page shell. All data comes from `/api/admin/*` (`server/modules/admin.js`), which requires a signed-in, email-verified adult account whose email equals `OWNER_EMAIL`. **Everyone else gets 404, not 403**, on every route and method, so the area does not advertise itself. Any change also requires the owner's password again and is written to `admin_audit_log`. Reports show counts and account emails only, never children's names or story text.
- **Alternatives considered:** a separate admin app or domain (more to run); hiding the link only (not security); a role column in the database (an extra moving part for a single owner).
- **Consequences:**
  - There is no two-step login yet. This is the main remaining weakness (`Proposed`: add authenticator-code login).
  - The owner is set by an environment variable. In production it is `daninets@gmail.com`.
  - The page is served with `noindex` and is not in the public file allowlist (it has its own route).

## ADR-004: "Coming soon" pricing is a switch that blocks the server, not just hides buttons

- **Status:** Accepted (2026-10-06)
- **Context:** Stripe is still in test mode, the Family price in Railway points at the wrong ($5) price, and the webhook listens to the wrong events. Paid plans must not be purchasable yet.
- **Decision:** `pricing_coming_soon` (database setting; falls back to the `PRICING_COMING_SOON` environment variable; default **on in production, off elsewhere**). When on: the plans screen shows "Coming soon" with no prices, `/api/subscription/checkout` and non-Explorer `/api/subscription/demo` return 403, and `/api/subscription/offer` returns no offer. The browser learns the state from `/pricing-config.js`.
- **Alternatives considered:** deleting the paid-plan code (loses working work); hiding buttons only (a logged-in user could still call the API).
- **Consequences:** Turning pricing on is one setting change. Existing subscribers and the Stripe webhook are not affected by the switch. Launching still requires the Stripe fixes first.

## ADR-005: Only an allowlist of files is public; new assets go under `/images/`

- **Status:** Accepted (discovered 2026-10-06, already enforced by `server/modules/public-files.js` and `tests/public-files.test.js`)
- **Context:** The server serves the project folder statically, which would expose source, logs and secrets if left open.
- **Decision:** Only named root files, image folders (`/images`, `/imagesAI`, `/story-illustrations`), `/story-audio/*.mp3`, and `/video/<name>.mp4` (one level deep) are served. Everything else returns 404. Dotfiles are denied.
- **Consequences:**
  - A new file at the project root returns 404 in production unless it is added to the allowlist. New brand assets (favicon, share image) therefore live in `images/brand/`.
  - Nested folders such as `video/reel/` and `video/social/` are not public. They are also excluded from the Docker image through `.dockerignore`.
  - The landing-page video must sit directly in `video/`.

## ADR-006: The Individual plan supports monthly and yearly billing; Family stays monthly

- **Status:** Accepted (2026-10-06); not live while ADR-004 is on
- **Context:** The owner wanted Individual at $8.99/month or $75/year.
- **Decision:** `/api/subscription/checkout` accepts `interval` (`month` or `year`, default `month`). Yearly is allowed only for Individual and is rejected for Family. If no saved Stripe price ID is set, the code creates the price inline with the requested interval. The interval is stored in the checkout and subscription metadata.
- **Consequences:** The webhook still records only the plan name (`individual` / `family`), so monthly and yearly look identical in the database. The yearly price is about 17% below twelve monthly payments, and the plans page says so.

## ADR-007: The contact flow reuses the in-site Support form

- **Status:** Accepted (2026-10-07)
- **Context:** The Classroom "Contact us" button used `mailto:`, which does nothing for people without a configured mail app.
- **Decision:** It opens the existing Support form (`/api/support`, which sends through the email provider to the configured support address and rejects passwords, card numbers and keys), pre-filled for a classroom inquiry. `window.openSupportForm` (in `legal.js`) lets other code open that form with a preset title, category and message.
- **Consequences:** No new endpoint or email path to maintain. The destination address is a Railway setting, not code.

## ADR-008: The brand logo is drawn in CSS and SVG, not an uploaded image

- **Status:** Accepted (2026-10-06)
- **Context:** The site draws its logo (a coral rounded square with a white leaf and a gold dot) in CSS in several places. The old mark was a dots-and-hand design and the new one had to replace it everywhere.
- **Decision:** One SVG, embedded as a `data:` URI background on `.en-mark` and `.auth-mark` in `api-app.js`, `auth.js`, `enterprise.css` and `auth.css`. A standalone `images/brand/favicon.svg`, a touch icon and a share image cover the tab, home-screen and link previews.
- **Consequences:** The logo scales sharply at any size with no extra request. The same drawing exists in four places, so a future change must update all four.

## ADR-009: The demo video is click-to-play and served from `video/`

- **Status:** Accepted (2026-10-08)
- **Context:** The landing page needed the demo reel, but it is about 19 MB.
- **Decision:** A native `<video controls playsinline preload="none">` with a poster image, placed above "How it works". There is no autoplay. The file downloads only when someone presses play. It is served from `video/StoryAura_Land_Reel.mp4` (see ADR-005 for why it must be in that folder).
- **Alternatives considered:** autoplay (data cost on phones, unwanted sound); a third-party host (adds a tracker and a vendor, which conflicts with the privacy promises).
- **Consequences:** The page stays fast, and there is no analytics on plays because the site has no analytics. Re-editing the video means replacing one file and redeploying.

## ADR-010: Settings have three layers: database, config file, built-in default

- **Status:** Accepted (2026-10-10). Extends ADR-001.
- **Context:** The owner wanted many more limits and rules to be adjustable, a settings file the server reads, and the ability to see every setting from SQL. With only the `app_settings` table, an empty table showed nothing, and the defaults lived only in code.
- **Decision:** A setting's value is the first of: the `app_settings` row (admin page or SQL, applies within about 30 seconds), `config/settings.json` (project defaults, needs a deploy), the built-in default in `server/modules/settings.js`. Values from the file are validated the same way as database values, and an invalid one is ignored with a warning. At startup the server writes `app_settings_catalog` (key, group, label, help, type, min, max, built-in default, file value). The view `settings_overview` joins it to `app_settings` so one `SELECT` shows the live value and its source. New settings in this change: `paid_story_limit_monthly`, `story_requests_per_15min` (the site-wide rate limit now follows the setting), `roster_import_max`.
- **Alternatives considered:** seeding every setting into `app_settings` (then the file could never act as the default, and a code change to a default would not reach the database); a file only (needs a deploy for every change); environment variables only (no admin page, no history).
- **Consequences:**
  - To add a setting, add one entry to `SETTING_DEFS` (and use `settingsStore.get('key')` where it applies). It then appears in the admin page, the catalog and the view automatically.
  - `config/settings.json` is not public (it is outside the file allowlist), and it ships in the Docker image.
  - The monthly paid limit counts stories created this calendar month (UTC), excluding sibling copies.

---

## Not decided yet

These came up and have no decision. When one is made, add an ADR.

- **After the free period ends:** what customers do while paid plans are not on sale (extend the free period, a "notify me" list, or launch pricing).
- **Trial on paid plans:** the checkout code still gives paid plans a 7-day trial, on top of the 14-day free Explorer period.
- **Two-step login** for the admin page (see ADR-003).
- **Staging environment, error alerts, and a tested database restore.**
