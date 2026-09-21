# Story Sprout Technology Stack

This document explains the technologies used in Story Sprout in beginner-friendly language. It also explains which files power each user-facing page or view.

## 1. The Big Picture

Story Sprout is a traditional web application with:

- A browser frontend written in HTML, CSS, and JavaScript.
- A Node.js backend written in JavaScript.
- An Express web server and API.
- A PostgreSQL database.
- External services for AI stories, email, and payments.
- Railway used for production hosting and deployment.

A simple request flows like this:

```text
Browser page
  -> JavaScript fetch() request
  -> Express API route
  -> PostgreSQL or external service
  -> JSON response
  -> Browser updates the page
```

The application does not use React, Vue, Angular, Next.js, or TypeScript at this time. The frontend uses vanilla JavaScript, which means browser APIs are used directly without a frontend framework.

## 2. Main Programming Languages

### HTML

HTML defines the structure of a page:

- Headings
- Forms
- Buttons
- Inputs
- Navigation
- Dialogs
- Sections and cards

Main HTML entry point:

- `index.html`

The authenticated workspace markup is created by JavaScript inside `api-app.js`.

### CSS

CSS controls the visual appearance:

- Colors
- Typography
- Spacing
- Grids
- Mobile layouts
- Buttons
- Cards
- Modals
- Progress bars

Main stylesheet files:

- `app.css`: local demo styles
- `enterprise.css`: authenticated family and teacher workspace styles
- `workspace.css`: workspace layout adjustments
- `auth.css`: sign-in and registration styles
- `privacy.css`: Privacy & data and legal modal styles
- `assessment.css`: assessment and story-check styles
- `reader.css`: story reading styles
- `story-preview.css`: story preview styles
- `mobile-nav.css`: small-screen navigation styles

### JavaScript

JavaScript controls behavior in the browser:

- Form submission
- Navigation between views
- API calls
- Authentication state
- Story creation
- Story reading
- Assessments
- Privacy controls
- Support form
- Subscription actions

The project uses modern JavaScript modules on the server. The browser files are loaded as regular scripts from `index.html`.

## 3. Browser Entry Point

### `index.html`

This is the main browser entry point. In a simple website, this is the first HTML file the browser loads.

It loads the CSS and JavaScript files used by the application:

```text
app.css
enterprise.css
workspace.css
reader.css
mobile-nav.css
story-preview.css
auth.css
privacy.css
assessment.css

app.js
auth.js
api-app.js
privacy.js
legal.js
```

The page contains the initial local story-demo layout. The JavaScript files can then replace or enhance the visible content depending on whether the visitor is:

- Using the local browser demo.
- Signing in or registering.
- Already authenticated.
- Opening a password-reset link.
- Opening an account-deletion confirmation link.
- Opening a subscription-cancellation confirmation link.

There are not separate HTML files for every screen. Several screens are views or modals created inside the same document.

## 4. User-Facing Pages And Views

### Local Demo Story Creator

Files:

- `index.html`
- `app.js`
- `app.css`
- `story-library.js`

Purpose:

- Lets someone try the product without an account or database.
- Stores demo stories in browser `localStorage`.
- Lets the visitor choose a reader, story world, adventure, and reading goal.
- Shows a local story shelf and story reader.

Important limitation:

- Local demo data belongs only to that browser.
- It is not the same as authenticated PostgreSQL account data.
- Clearing browser data can remove local demo stories.

### Sign-In And Registration

Files:

- `auth.js`
- `auth.css`
- `legal.js`

Purpose:

- Sign in an adult parent, guardian, teacher, or authorized educator.
- Register a parent or teacher account.
- Collect adult consent during registration.
- Handle forgot-password requests.
- Handle password-reset links.
- Handle email-verification links.
- Handle one-time account-deletion confirmation links.
- Handle one-time subscription-cancellation confirmation links.

The browser sends authentication requests to routes such as:

```text
POST /api/auth/register
POST /api/auth/login
POST /api/auth/forgot-password
POST /api/auth/reset-password
POST /api/auth/resend-verification
```

After a successful login, the browser stores a signed session token in local storage and uses it in an `Authorization: Bearer <token>` header.

### Authenticated Family Workspace

Files:

- `api-app.js`
- `enterprise.css`
- `workspace.css`
- `mobile-nav.css`
- `privacy.js`
- `legal.js`

This is the main signed-in application. It includes these views:

#### Home

The Home view lets an adult:

- Choose a learner.
- Choose a grade level.
- Choose a reading practice objective.
- Choose a story world.
- Enter an adventure idea.
- Choose a story length.
- Generate a story.
- See a Welcome back activity summary.
- Review learner progress.
- Open saved stories.

The story creator also displays an AI-generated content notice. Adults are told to review each story before sharing it with a child.

#### Learners

The Learners view lets an adult:

- Add a learner.
- Edit a learner profile.
- Change the learner's first name.
- Change the age range.
- Change interests.
- Change topics to avoid.
- Remove a learner and related child data.

The Edit action loads the saved profile into the same form used to add a learner.

#### Progress

The Progress view contains adult, teacher, or site-owner tools depending on the account role. It can include:

- Learner progress summaries.
- Teacher roster tools.
- Classroom progress export.
- Owner operational scorecards.

Story checks are story-specific feedback. They are not a formal reading diagnosis or automatic proof of overall mastery.

#### Plans & billing

The Plans & billing view contains:

- Explorer demo plan.
- Family plan, intended at $15/month.
- Classroom plan, intended at $18/month.
- Stripe Checkout when live configuration is available.
- Current subscription status.
- Cancellation request flow.
- Link to Privacy & data.

Cancellation is parent-protected. The parent must enter the current password and then confirm through a one-time email link. Cancellation does not delete learner profiles, stories, or reading progress.

#### Parent guide

The Parent guide explains:

- How adults create stories.
- How grade and reading objectives work.
- How to discuss stories with children.
- Why adults should review AI-generated content.
- Why story scores do not represent complete reading mastery.

### Privacy & data

Files:

- `privacy.js`
- `privacy.css`
- `legal.js`

The Privacy & data interface contains:

- Data export.
- Learner deletion information.
- Account deletion.
- Retention and deletion explanations.
- AI, Stripe, Railway, PostgreSQL, and vendor disclosures.
- A link back to Plans & billing.
- Separation between subscription cancellation and data deletion.

Full account deletion requires:

1. Current password.
2. Typed `DELETE` confirmation.
3. One-time email confirmation.

Learner deletion uses an in-page confirmation dialog and typed `DELETE` confirmation.

### Legal modals

File:

- `legal.js`

The legal content is displayed in modals so it can appear before sign-in and inside the authenticated workspace.

The current legal content includes:

- Privacy Policy.
- Terms of Service.
- Effective date.
- Controlled-pilot draft status.
- AI-generated content disclosure.
- Child-data and school-use review warning.
- Support form link.

The legal text is not a legal certification. Qualified legal, privacy, child-data, and education review is still required before public advertising or school use.

### Support form

Files:

- `legal.js`: browser form and submission behavior.
- `server/server.js`: validation, rate limiting, and email delivery.

The Support link opens an in-page form instead of opening Outlook or another mail application.

The form collects:

- Name.
- Reply email.
- Support category.
- Message.

The server rejects messages that appear to contain:

- Passwords.
- Payment-card details.
- CVV or security codes.
- API keys or secret keys.

The support request is sent through Resend to the configured `SUPPORT_EMAIL`. The visitor's email is used as the reply-to address.

## 5. Backend Technologies

### Node.js

Node.js runs JavaScript outside the browser. Story Sprout uses Node.js to run the production server and API.

Commands from `package.json`:

```powershell
npm start
npm run dev
npm run db:init
npm run db:migrate
```

### Express

Express is the web-server framework. It handles:

- HTTP routes.
- JSON requests and responses.
- Authentication middleware.
- Static files.
- API endpoints.
- Error handling.

The main server file is:

- `server/server.js`

### PostgreSQL

PostgreSQL is the relational database. It stores:

- Adult accounts.
- Learners.
- Learner goals.
- Stories.
- Assessments.
- Subscriptions.
- AI usage records.
- Safety events.
- Consent records.
- Reminder preferences.
- Support-related operational information where applicable.

Database files:

- `server/schema.sql`: main schema and seed curriculum data.
- `server/init-db.js`: local database initialization.
- `server/migrate.js`: numbered migration runner.
- `server/run-migrations.js`: migration command entry point.
- `server/migrations/`: forward-only database changes.

### JSON

The frontend and backend communicate using JSON. A story-generation request, for example, contains learner and story settings as JSON, and the server returns a JSON story object.

### JWT

JSON Web Tokens are used for authenticated sessions. After login, the server returns a token. Protected API requests send the token in the `Authorization` header.

JWT secrets must remain in environment variables and must never be placed in browser code.

### bcryptjs

`bcryptjs` hashes account passwords. The database stores password hashes, not plain-text passwords.

### Zod

Zod validates request data on the server. It checks fields such as:

- Email format.
- Password length.
- Learner age range.
- Story prompt length.
- Allowed story worlds.
- Allowed support categories.
- Confirmation text such as `DELETE`.

### express-rate-limit

Rate limiting helps reduce abuse. It is used for actions such as:

- Registration.
- Login.
- Verification emails.
- Story generation.
- Support form submissions.

### Helmet and CORS

- `helmet` adds common HTTP security headers.
- `cors` controls cross-origin request behavior where configured.

## 6. External Services

### OpenAI

OpenAI generates:

- Personalized story text.
- Comprehension questions.
- Vocabulary definitions.

The server also uses moderation and structured output validation. OpenAI credentials stay on the server.

Story generation uses an account-level monthly invocation limit and a story-generation rate limit. The current invocation limit is not a guaranteed dollar cap.

### Resend

Resend sends:

- Email verification messages.
- Password-reset messages.
- Account-deletion confirmation messages.
- Subscription-cancellation confirmation messages.
- Support requests to the configured support inbox.

The sending domain must be verified in Resend. The receiving support mailbox must also exist and be able to receive email.

Configuration includes:

```env
EMAIL_PROVIDER=resend
RESEND_API_KEY=your-key
EMAIL_FROM=Story Sprout <admin@dansprout.com>
SUPPORT_EMAIL=admin@dansprout.com
```

### Stripe

Stripe provides:

- Hosted subscription checkout.
- Customer billing.
- Subscription status updates.
- Webhook events.
- Cancellation at the end of a billing period when configured.

Stripe must be fully verified before accepting real payments. Test mode should be used first.

### Railway

Railway hosts the Node.js application and production PostgreSQL service. Railway environment variables contain secrets such as:

- `DATABASE_URL`.
- `JWT_SECRET`.
- `OPENAI_API_KEY`.
- `RESEND_API_KEY`.
- `STRIPE_SECRET_KEY`.
- `STRIPE_WEBHOOK_SECRET`.
- `SUPPORT_EMAIL`.

## 7. Security And Privacy Concepts For Beginners

### Client and server

- Client means code running in the visitor's browser.
- Server means code running on Railway.
- Secrets belong on the server, not in client JavaScript.

### Authentication and authorization

- Authentication asks, "Who are you?"
- Authorization asks, "Are you allowed to access this learner or story?"

Story Sprout uses both. Every protected learner and story request checks account ownership.

### Cascade deletion

The database connects learners to stories, assessments, goals, and curriculum links. When a learner is permanently removed, related child data is deleted through database cascade rules.

Account-level operational, security, and billing records may remain when needed for safety, accounting, or legal reasons.

### Privacy by design

The product is adult-managed:

- Children do not create accounts.
- Learner data belongs to the adult account.
- Adults can export data.
- Adults can delete data.
- Adults review AI-generated stories.

## 8. Beginner Learning Path

A beginner can learn this project in this order:

1. HTML: read `index.html` and identify forms, buttons, and sections.
2. CSS: open `app.css` and `enterprise.css` to see colors, layout, and responsive rules.
3. Browser JavaScript: read `app.js`, `auth.js`, and `api-app.js`.
4. API calls: search for `fetch(` and follow the matching Express route in `server/server.js`.
5. Database: read `server/schema.sql`, then inspect the migration files.
6. Security: study JWT, bcrypt, Zod validation, rate limits, and account ownership checks.
7. Services: study the OpenAI, Resend, Stripe, and Railway environment variables.

A useful beginner exercise is to trace one feature from beginning to end:

```text
Click Generate my story
  -> api-app.js sends POST /api/stories/generate
  -> server/server.js validates the request
  -> PostgreSQL loads the learner and curriculum row
  -> OpenAI generates structured JSON
  -> the server moderates and stores the story
  -> api-app.js displays the story reader
```

## 9. Current Production Status

The app is suitable for a controlled private pilot. Before unrestricted public use or real customer billing, complete:

- Stripe business verification and live Price ID configuration.
- Live webhook and payment-failure testing.
- Refund policy and support mailbox testing.
- Qualified privacy, child-data, education, and legal review.
- Backups, monitoring, error tracking, rollback testing, and automated tests.
- Dollar-based AI budgets and abuse monitoring beyond invocation limits.

The project intentionally does not claim COPPA or FERPA certification, formal reading mastery, or replacement of a teacher or school curriculum.
