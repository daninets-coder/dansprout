# Story Sprout Functional Workflow Guide

This guide explains how the main Story Sprout workflows work. It is written for a beginner programmer.

For each workflow, the guide answers:

1. What does the user do?
2. Which page or view is used?
3. Which browser code file runs?
4. Which server API route runs?
5. Which database tables are involved?
6. Which outside service is involved?

## How To Read A Workflow

```text
User clicks a button
  -> Browser JavaScript handles the click
  -> fetch() sends an HTTP request
  -> Express route receives the request
  -> Server validates the data
  -> PostgreSQL or an outside service is used
  -> Server returns JSON
  -> Browser updates the page
```

### Important terms

- **Frontend:** Code that runs in the browser. In this project it is HTML, CSS, and JavaScript.
- **Backend:** Code that runs on the server. In this project it is Node.js and Express.
- **API route:** A server URL that performs an action, such as `/api/auth/login`.
- **Database table:** A PostgreSQL table that stores related information.
- **External service:** Another company or system used by Story Sprout, such as OpenAI, Resend, Stripe, or Railway.

## 1. Open The Website

### What the user does

The user opens the Story Sprout website.

### Page used

- `index.html`

### Browser files

- `index.html`: initial HTML document.
- CSS files: visual layout and design.
- `app.js`: local demo behavior.
- `auth.js`: authentication screen behavior.
- `api-app.js`: authenticated app behavior.
- `privacy.js`: Privacy & data controls.
- `legal.js`: Privacy Policy, Terms, and Support form.

### Server route

There is no API request just to open the first page. The Node.js server serves the static files.

### Programming used

- HTML creates the page structure.
- CSS creates the design.
- JavaScript decides which experience to show.
- Node.js and Express serve the files.

## 2. Choose The Local Demo

### What the user does

The user chooses **Continue with local demo** on the sign-in screen.

### Page or view used

- Local browser demo inside `index.html`

### Browser files

- `auth.js`: displays the demo button.
- `app.js`: runs the local story creator.
- `story-library.js`: contains the local story catalog.
- `app.css`: styles the local demo.

### Server route

- None.

### Database and storage

- Browser `localStorage` stores local demo stories.
- PostgreSQL is not used.

### Important limitation

Local demo data belongs only to that browser. It is separate from authenticated account data.

## 3. Create An Account

### What the user does

The adult chooses **Create account**, enters a name, email, password, account type, and consent, then submits the form.

### Page or view used

- Sign-in and registration screen

### Browser files

- `auth.js`: reads the form and sends the request.
- `auth.css`: styles the form.
- `legal.js`: displays Privacy Policy and Terms links.

### API route

```text
POST /api/auth/register
```

### Server workflow

1. Zod validates the submitted values.
2. The password is hashed with `bcryptjs`.
3. An adult account is inserted into PostgreSQL.
4. Consent information is recorded.
5. A verification email is requested through Resend.
6. The server returns a message telling the adult to check email.

### Database tables

- `accounts`
- `consent_audit_log`
- `reminder_preferences`
- `growth_events`

### External services

- Resend sends the email-verification message.

## 4. Sign In

### What the user does

The adult enters email and password and clicks **Sign in**.

### Page or view used

- Sign-in screen
- After success, the authenticated Family Workspace

### Browser files

- `auth.js`: sends the login request and saves the session token.
- `api-app.js`: loads the authenticated workspace after login.
- `enterprise.css`: styles the authenticated workspace.

### API route

```text
POST /api/auth/login
GET /api/me
```

### Server workflow

1. The server finds the account by email.
2. `bcryptjs` compares the submitted password with the stored password hash.
3. The server checks that the email is verified.
4. JWT creates a signed session token.
5. The browser sends that token on later protected requests.

### Database tables

- `accounts`
- `growth_events`

### Programming used

- JavaScript `fetch()` sends the request.
- Express receives the request.
- JWT identifies the signed-in account.
- bcryptjs checks the password safely.

## 5. Verify The Email Address

### What the user does

The adult opens the verification email and clicks the link.

### Page or view used

- The link opens the website with a verification token.

### Browser files

- `auth.js`: handles special confirmation links when needed.

### API route

```text
GET /api/auth/verify-email?token=...
POST /api/auth/resend-verification
```

### Server workflow

1. The server hashes the received token.
2. It compares the hash with the stored token hash.
3. It checks that the token has not expired.
4. It marks the account email as verified.

### Database tables

- `accounts`

### External service

- Resend delivers the verification email.

## 6. Forgot Or Reset A Password

### What the user does

The user clicks **Forgot password?**, enters an email, opens the email, and chooses a new password.

### Page or view used

- Sign-in screen
- Password-reset screen created by `auth.js`

### Browser files

- `auth.js`: sends the request and displays the reset form.

### API routes

```text
POST /api/auth/forgot-password
POST /api/auth/reset-password
POST /api/auth/reset-password-code
```

### Server workflow

1. The server creates a random reset token.
2. Only a secure hash of the token is stored.
3. The token expires after a limited period.
4. The user selects a new password.
5. The new password is hashed with `bcryptjs`.
6. The token is marked used.

### Database tables

- `password_reset_tokens`
- `accounts`

### External service

- Resend sends the reset email.

## 7. Add A Learner

### What the user does

The adult opens **Learners**, enters the learner’s first name, age range, interests, and topics to avoid, then clicks **Save learner**.

### Page or view used

- Authenticated Family Workspace
- **Learners** view

### Browser files

- `api-app.js`: displays the form and sends the request.
- `enterprise.css`: styles the workspace.

### API route

```text
POST /api/learners
```

### Server workflow

1. Zod validates the form.
2. The server checks the signed-in account.
3. A learner row is created under that account.
4. Learner goals are stored.

### Database tables

- `learners`
- `learner_goals`
- `growth_events`

### Stored learner information

- First name
- Age range: `3-5`, `6-8`, or `9-11`
- Interests
- Topics to avoid
- Optional structured topic preferences
- Reading goals

## 8. Edit A Learner

### What the user does

The adult clicks **Edit** beside a saved learner, changes the fields, and saves the form.

### Page or view used

- Authenticated Family Workspace
- **Learners** view

### Browser files

- `api-app.js`

### API route

```text
PATCH /api/learners/:learnerId
```

### Server workflow

1. The browser loads the learner into the form.
2. The parent changes the profile values.
3. The server validates the values.
4. The server updates the learner only when that learner belongs to the signed-in account.

### Database table

- `learners`

### Why ownership checking matters

A parent must not be able to edit another account’s learner by changing an ID in the browser request. The server checks both:

```text
learner ID + signed-in account ID
```

## 9. Remove A Learner

### What the user does

The adult clicks **Remove**, reviews the warning, types `DELETE`, and confirms.

### Page or view used

- Authenticated Family Workspace
- **Learners** view

### Browser files

- `api-app.js`: displays the in-page confirmation overlay.

### API route

```text
DELETE /api/learners/:learnerId
```

### Server workflow

1. The page shows the learner name.
2. The page explains which data will be deleted.
3. The parent types `DELETE`.
4. The server verifies the learner belongs to the signed-in account.
5. PostgreSQL deletes the learner.
6. Database cascade rules delete learner-owned stories, assessments, goals, and curriculum links.

### Important distinction

This is learner deletion, not full account deletion. Limited account-level operational, safety, and billing records may remain.

## 10. Choose A Reading Goal

### What the user does

The adult selects a grade level and reading skill, such as comprehension, vocabulary, fluency, phonics, oral language, writing response, or reading confidence.

### Page or view used

- Authenticated Home view
- Story creation panel

### Browser files

- `api-app.js`: loads curriculum choices and displays the selected objective.

### API route

```text
GET /api/curriculum?gradeLevel=...
```

### Server workflow

1. The browser requests standards for the selected grade.
2. PostgreSQL returns curriculum rows.
3. The page displays the plain-English objective and standard code.
4. The selected code is sent with the story-generation request.

### Database table

- `curriculum_tracks`

### Educational wording

A curriculum code identifies the reading practice being supported. It is not a diagnosis and does not automatically prove overall mastery.

## 11. Generate A Personalized Story

### What the user does

The adult chooses a learner, grade, reading skill, story world, adventure idea, and story length. Then the adult clicks **Generate my story**.

### Page or view used

- Authenticated Home view
- Story creator panel

### Browser files

- `api-app.js`: displays the progress indicator and sends the request.

### API route

```text
POST /api/stories/generate
```

### Server workflow

1. The server validates the request with Zod.
2. The server verifies learner ownership.
3. The server loads learner interests and topics to avoid.
4. The server loads the selected curriculum row.
5. The account’s AI opt-in is checked.
6. The monthly AI invocation limit is checked.
7. Input moderation runs.
8. OpenAI receives a structured story request.
9. OpenAI returns structured JSON.
10. The server validates the story structure.
11. Output moderation runs.
12. Vocabulary is filled or reviewed.
13. The story is saved in PostgreSQL.
14. AI usage and estimated cost are recorded.
15. The browser displays the story.

### Database tables

- `learners`
- `curriculum_tracks`
- `stories`
- `story_curriculum`
- `ai_invocations`
- `ai_safety_events`

### External service

- OpenAI creates the story, questions, and vocabulary.

### Safety rules

- Adult review is required before sharing with a child.
- Topics to avoid are additional parent preferences, not a guarantee.
- General moderation still applies even if the parent enters no topics.
- The monthly invocation limit is not a guaranteed dollar cap.

## 12. Read A Saved Story

### What the user does

The adult opens a saved story. The child and adult can read it together, move through pages, use read-aloud, and review vocabulary.

### Page or view used

- Authenticated Home view
- Story reader modal

### Browser files

- `api-app.js`: `openServerStory()` builds the reader.
- `reader.css`: story reading styles.
- `story-preview.css`: preview styles where applicable.

### API routes

```text
GET /api/stories
POST /api/stories/:storyId/vocabulary
```

### Database tables

- `stories`
- `learners`

### External browser feature

- Browser `speechSynthesis` provides read-aloud when supported.

## 13. Complete A Story

### What the user does

The adult or child finishes the story and chooses the completion action.

### Browser files

- `api-app.js`

### API route

```text
PATCH /api/stories/:storyId/complete
```

### Database tables

- `stories`
- `growth_events`

### Result

The server records a completion time. Completion means the story was finished; it does not automatically mean the child mastered the skill.

## 14. Answer Story Questions

### What the user does

The child answers the multiple-choice questions and submits the story check.

### Page or view used

- Story reader modal
- **Check understanding** section

### Browser files

- `api-app.js`: builds the questions and displays the result.
- `assessment.css`: styles the assessment.

### API route

```text
POST /api/stories/:storyId/assessment
```

### Server workflow

1. The server loads the story.
2. It verifies ownership through the learner account.
3. It compares selected answers with the story’s answer choices.
4. It calculates a score for that story’s questions.
5. It stores the result.
6. The browser shows the score and retry option.

### Database table

- `reading_assessments`

### Educational wording

The score measures understanding of one story’s questions. It is not a complete reading assessment and is not automatic proof of overall mastery.

## 15. Review Or Correct An Assessment

### What the user does

An authorized adult or teacher reviews an assessment, records a score, adds notes, and records positive evidence when appropriate.

### Browser files

- `api-app.js`

### API route

```text
PATCH /api/stories/:storyId/assessment/review
```

### Database table

- `reading_assessments`

### Purpose

The adult or teacher can add context that an automated story check cannot know, such as how the child explained an answer aloud. This is practice evidence, not a formal diagnostic decision.

## 16. Review Vocabulary

### What the user does

The user clicks a vocabulary word or asks the app to refresh vocabulary.

### Browser files

- `api-app.js`

### API routes

```text
POST /api/stories/:storyId/vocabulary
```

### Database table

- `stories` JSON content

### External service

- OpenAI may be used for vocabulary definitions when configured.

## 17. Report Unsafe Or Incorrect Content

### What the user does

The adult reports a story as unsafe, incorrect, or privacy-sensitive.

### Browser files

- `api-app.js`

### API route

```text
POST /api/stories/:storyId/safety-report
```

### Database table

- `ai_safety_events`

### Result

The report is associated with the signed-in account and story. It can be reviewed through operational monitoring.

## 18. View The Welcome Back Summary

### What the user does

The adult signs in or switches learners.

### Browser files

- `api-app.js`

### API routes

```text
GET /api/me
GET /api/learners
GET /api/stories
GET /api/progress
```

### Result

The Home view shows the selected learner’s latest activity:

- Latest story
- Reading objective
- Story status
- Story-check score and answered-question count
- Recent vocabulary
- Date
- Button to reopen the story

This summary is calculated from saved data and does not use a new AI call.

## 19. Export Account Data

### What the user does

The adult opens Privacy & data and clicks **Download my data**.

### Browser files

- `privacy.js`

### API route

```text
GET /api/account/export
```

### Database tables

- `accounts`
- `learners`
- `stories`
- `consent_audit_log`
- `reminder_preferences`

### Result

The browser downloads a JSON export. The adult is responsible for protecting the downloaded file.

## 20. Delete The Full Account

### What the user does

The adult opens Privacy & data and chooses account deletion.

### Browser files

- `privacy.js`: shows the in-page deletion form.
- `auth.js`: handles the email confirmation link.

### API routes

```text
POST /api/account/deletion-request
POST /api/auth/confirm-account-deletion
```

### Required protection

- Current password.
- Typed `DELETE`.
- One-time email confirmation link.
- Link expires after 30 minutes.
- Link can be used once.

### Result

Account-owned learner, story, subscription, and related application data is deleted through database cascade rules. Limited operational records may remain where necessary for security, billing, or legal reasons.

## 21. Cancel A Subscription

### What the user does

The parent opens Plans & billing, clicks **Cancel subscription**, enters the current password, and requests an email confirmation.

### Browser files

- `api-app.js`: cancellation panel.
- `auth.js`: confirmation-link handling.
- `privacy.js`: routes the privacy-page cancellation action back to Plans & billing.

### API routes

```text
POST /api/subscription/cancellation-request
POST /api/auth/confirm-subscription-cancellation
```

### Result

If Stripe is configured, the remote subscription is set to cancel at the end of the paid period. Learner profiles, stories, and progress remain saved.

## 22. Choose A Plan Or Start Checkout

### What the user does

The adult chooses a demo plan or starts Stripe checkout.

### Browser files

- `api-app.js`

### API routes

```text
POST /api/subscription/demo
POST /api/subscription/checkout
```

### External service

- Stripe Checkout creates the subscription session.

### Important status

Stripe business verification, live Price IDs, live keys, webhooks, payment-failure handling, and refund policy must be completed before unrestricted real payments.

## 23. Submit A Support Request

### What the user does

The user clicks **Support**, fills in the in-page support form, and submits it.

### Browser files

- `legal.js`

### API route

```text
POST /api/support
```

### Server workflow

1. Validates name, email, category, and message.
2. Rejects passwords, card numbers, CVV, API keys, and secrets.
3. Applies a support rate limit.
4. Sends the message through Resend.
5. Sends it to the configured `SUPPORT_EMAIL`.
6. Uses the visitor’s email as the reply-to address.

### External service

- Resend.

## 24. Weekly Reminder Preference

### What the user does

The adult turns weekly reminder emails on or off.

### Browser files

- `api-app.js`

### API routes

```text
GET /api/reminders/preferences
POST /api/reminders/preferences
```

### Database table

- `reminder_preferences`

## 25. Teacher Roster Import

### What the user does

A teacher imports a CSV roster.

### Browser files

- `api-app.js`

### API route

```text
POST /api/classroom/roster/import
```

### Database tables

- `learners`
- `classroom_imports`

### Result

Each imported learner is attached to the teacher’s account. The server validates the account and imported data.

## 26. Classroom Progress PDF

### What the user does

A teacher requests a classroom progress report.

### Browser files

- `api-app.js`

### API route

```text
GET /api/classroom/progress-summary.pdf
```

### External library

- `pdfkit` creates the PDF document on the server.

## 27. Health And Operations

### Health checks

```text
GET /api/healthz
GET /api/readyz
```

These routes help Railway or an uptime service confirm that the application and database are available.

### Operational metrics

```text
GET /api/ops/metrics
GET /api/business/scorecard
```

These are protected owner or authenticated reporting routes.

### File or code used

- `server/server.js`
- `OPERATIONS.md`
- `server/migrations/`

## 28. Quick Workflow Map

| Functionality | Page or view | Browser file | API route | Main database or service |
|---|---|---|---|---|
| Register | Sign in/Create account | `auth.js` | `POST /api/auth/register` | PostgreSQL, Resend |
| Login | Sign in | `auth.js` | `POST /api/auth/login` | PostgreSQL, JWT |
| Add learner | Learners | `api-app.js` | `POST /api/learners` | `learners` |
| Edit learner | Learners | `api-app.js` | `PATCH /api/learners/:learnerId` | `learners` |
| Generate story | Home | `api-app.js` | `POST /api/stories/generate` | OpenAI, stories |
| Read story | Story reader | `api-app.js` | `GET /api/stories` | stories |
| Answer questions | Check understanding | `api-app.js` | `POST /api/stories/:storyId/assessment` | reading_assessments |
| Vocabulary | Story reader | `api-app.js` | `POST /api/stories/:storyId/vocabulary` | OpenAI, stories |
| Progress summary | Home/Progress | `api-app.js` | `GET /api/progress` | stories, assessments |
| Delete learner | Learners | `api-app.js` | `DELETE /api/learners/:learnerId` | cascade deletion |
| Export data | Privacy & data | `privacy.js` | `GET /api/account/export` | PostgreSQL |
| Delete account | Privacy & data | `privacy.js`, `auth.js` | deletion request + confirmation | PostgreSQL, Resend |
| Cancel subscription | Plans & billing | `api-app.js`, `auth.js` | cancellation request + confirmation | Stripe, Resend |
| Support | Support form | `legal.js` | `POST /api/support` | Resend |
| Checkout | Plans & billing | `api-app.js` | `POST /api/subscription/checkout` | Stripe |
