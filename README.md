# Story Sprout Web

Story Sprout is a personalized storybook and reading-support web app for
families, teachers, and children. It turns a child's interests and learning
goals into short illustrated story experiences, then helps adults notice
reading habits and begin useful conversations.

The project has two ways to run:

- **Local demo:** Open `index.html` in a browser and select **Continue with
	local demo**. It works without a server, Node.js, account, or database.
- **Authenticated app:** Start the Node.js server and connect PostgreSQL. An
	adult can create a parent or teacher account and store learners, stories,
	progress, and subscription selections in the database.

## What The App Does

### Child Reading Experience

- Generates stories with OpenAI through the authenticated API using selected
	grade level, reading domain, theme, and prompt.
- Applies grade-level tailoring rules (sentence complexity, vocabulary, and
	structure) plus curriculum objective alignment per story.
- Uses the supplied Maryland College and Career-Ready Standards (MCCRS) ELA
	benchmark hierarchy from Pre-K through Grade 8, including standard codes,
	strands, objectives, and evidence of learning.
- Offers age bands for ages `3-5`, `6-8`, and `9-11`.
- Supports learning focuses including kindness, bravery, big feelings,
	curiosity, and early literacy.
- Provides story worlds, vocabulary support, read-aloud controls, and
	open-ended discussion prompts.

### Curated Story Library

`story-library.js` is the current local story catalog. Each stored story has
age-band, learning-goal, theme, keyword-tag, page, and discussion-question
metadata. The browser ranks suitable stories in this order:

1. Matching learning goal.
2. Matching learner age band.
3. Matching keywords from the adult's adventure prompt.

This makes the reading experience predictable, reviewable, and inexpensive to
run. A production library can use the same metadata model in PostgreSQL while
placing illustrations in object storage/CDN rather than the database.

### Parent And Teacher Experience

- Parent/guardian and teacher registration and sign-in.
- Learner profiles with age band, interests, learning goals, and topics to
	avoid.
- Activity and progress views for stories created, stories completed, reading
	minutes, and learning-goal coverage.
- Adult controls for private local data and a guided conversation-first
	approach to progress.
- Explorer, Family, and Classroom plan selection as demo billing or Stripe
	Checkout (when configured).
- Onboarding funnel in the authenticated app: first learner, first story,
	first plan.
- Teacher pilot tools: CSV roster import and classroom progress PDF export.
- Business scorecard: pilot customers, 4-week retention, and teacher-pilot
	signal.

### Privacy And Safety

- The direct-file demo stores its data only in the current browser's local
	storage.
- The server mode protects API actions with an authenticated adult account.
- Public Privacy Policy and Terms of Service drafts are available before sign-in
	and from the authenticated workspace.
- Adult consent is required at registration, and the Privacy & data settings
	provide account deletion and JSON data export.
- Privacy disclosures identify OpenAI, Stripe, PostgreSQL, and Railway as
	service providers and describe retention and deletion behavior.
- Story prompts apply a basic local age-appropriateness screen in demo mode.
- The product intentionally has no public story gallery, child messaging, or
	advertising.
- The account screen requires an adult guardian-consent acknowledgement during
	registration.
- Privacy & data settings explain collection and consent, keep payment details
	with the payment provider, and provide subscription cancellation and account
	deletion controls.
- COPPA, FERPA, state privacy, and school procurement review remain required
	before public or school deployment; the app does not claim legal certification.

Operational health checks, migrations, backups, monitoring, and rollback guidance
are documented in `OPERATIONS.md`.

## Quick Start: Browser Demo

1. Open `index.html` in a web browser.
2. On the sign-in screen, select **Continue with local demo**.
3. Use Home to create a learning story.
4. Use Learners, Progress, Plans & billing, and Family settings to explore the
	 adult controls.

Demo data belongs only to the browser profile where it was created. Clearing
site data, using private browsing, or switching browsers may remove it.

## Authenticated PostgreSQL Setup

### Prerequisites


### Configuration

1. Create a PostgreSQL database named `story_sprout`.
2. Copy `.env.example` to `.env`.
3. Set a database connection string and a long random JWT secret:

	 ```env
	 DATABASE_URL=postgresql://story_sprout_user:replace_me@localhost:5432/story_sprout
	 JWT_SECRET=use-a-unique-random-secret-of-at-least-32-characters
	 PORT=3000
	 NODE_ENV=development
	 APP_BASE_URL=http://localhost:3000
	 EMAIL_PROVIDER=resend
	 RESEND_API_KEY=
	 EMAIL_FROM=Story Sprout <no-reply@yourdomain.com>
	 STRIPE_SECRET_KEY=
	 STRIPE_WEBHOOK_SECRET=
	 STRIPE_PRICE_FAMILY_500=
	 STRIPE_PRICE_FAMILY_800=
	 STRIPE_PRICE_FAMILY_1200=
	 STRIPE_PRICE_CLASSROOM_1800=
	 ```

4. From this folder, install packages and initialize the database:

	 ```powershell
	 & "C:\Program Files\nodejs\npm.cmd" install
	 & "C:\Program Files\nodejs\npm.cmd" run db:init
	 ```

5. Start the server:

	 ```powershell
	 & "C:\Program Files\nodejs\npm.cmd" start
	 ```

6. Open `http://localhost:3000` and create the first parent or teacher
	 account.

Use `npm.cmd run dev` instead of `npm.cmd start` during development to restart
the Node server when server files change.

## Data Model

The PostgreSQL schema in `server/schema.sql` contains:

| Table | Purpose |
|---|---|
| `accounts` | Adult parent, teacher, and administrator accounts |
| `learners` | Children owned by a single adult account |
| `learner_goals` | Learning goals for each learner |
| `stories` | Generated story content, prompts, goals, and completion time |
| `subscriptions` | Current and historical plan selections |

Database ownership is explicit: `account -> learner -> story`. API requests
verify that the authenticated account owns the learner or story before reading,
creating, completing, or deleting it.

## API Summary

| Endpoint | Purpose |
|---|---|
| `POST /api/auth/register` | Create a parent or teacher account |
| `POST /api/auth/login` | Sign in and receive a session token |
| `GET /api/me` | Get the signed-in account |
| `GET/POST /api/learners` | List or add the account's learners |
| `DELETE /api/learners/:learnerId` | Remove an owned learner and their stories |
| `GET /api/stories` | List owned learner stories |
| `POST /api/stories/generate` | Generate and store an OpenAI-tailored learner story using a selected standard code |
| `PATCH /api/stories/:storyId/complete` | Mark an owned story as completed |
| `GET /api/progress` | Retrieve learner progress summary |
| `GET /api/subscription` | Retrieve the current plan |
| `GET /api/subscription/offer` | Retrieve account pricing variant offer |
| `POST /api/subscription/demo` | Save a non-billing demo plan selection |
| `POST /api/subscription/checkout` | Create a Stripe Checkout session |
| `POST /api/billing/webhook` | Stripe webhook to persist subscription updates |
| `POST /api/subscription/cancel` | Cancel the current subscription |
| `POST /api/account/privacy-ack` | Save privacy policy acknowledgement version |
| `GET/POST /api/reminders/preferences` | Manage weekly reminder preference |
| `GET /api/learners/:learnerId/next-story` | Get next-best story suggestion |
| `POST /api/classroom/roster/import` | Teacher CSV learner import |
| `GET /api/classroom/progress-summary.pdf` | Teacher classroom progress report |
| `GET /api/business/scorecard` | Revenue and retention benchmark status |
| `DELETE /api/account` | Delete the account and cascaded learner data |

All endpoints except registration and login require an `Authorization: Bearer
<token>` header.

## Project Layout

```text
story-sprout-web/
	index.html             Browser entry point
	auth.js / auth.css     Parent/teacher registration and sign-in screen
	enterprise.js / .css   Local browser demonstration workspace
	api-app.js             Authenticated PostgreSQL-backed workspace
	story-preview.js/.css  Child-facing story-preview experience
	server/
		server.js            Express API and static-file server
		db.js                PostgreSQL connection pool
		init-db.js           Database initialization command
		schema.sql           PostgreSQL tables and indexes
```

## Security Boundaries

	must live in environment variables, never in browser JavaScript.
	 audit logged.

## Before A Production Launch

The current project is a strong functional foundation, but the following work
is required before handling real families, schools, money, or child data:

1. Use a managed, encrypted PostgreSQL service with backups and access logs.
2. Replace the demo billing endpoint with Stripe Checkout or another
	 PCI-compliant hosted payment flow and webhook-based subscription updates.
3. Add email verification, password reset, refresh-token/session revocation,
	 and audit logging.
4. Complete production moderation policy tuning and monitoring for the
	 server-side AI generation endpoint and safety filters.
5. Build privacy, retention, parental-consent, and deletion processes that meet
	 the legal requirements for the countries where the product is offered.
6. Add automated tests, database migrations, monitoring, error tracking, and a
	 deployment pipeline.

| `POST /api/stories/:storyId/safety-report` | Report unsafe, incorrect, or privacy-sensitive story content |
| `GET /api/ops/metrics` | Owner-only operational, AI usage, and webhook metrics |
	api-app.js             Authenticated PostgreSQL-backed workspace
