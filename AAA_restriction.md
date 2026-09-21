# Story Sprout Restrictions And Safeguards

## Purpose

This document records the restrictions currently implemented in Story Sprout and the additional controls required before a public launch. It is an operational reference, not a legal certification.

## Current AI Restrictions

### Monthly AI usage limit

Each account is checked against the number of recorded AI invocations during the current calendar month.

The configured default is:

```env
AI_MONTHLY_INVOCATION_LIMIT=100
```

This limit applies to:

- New story generation
- Story revisions

When the limit is reached, the account receives a message that the monthly AI story limit has been reached and must wait until the next month.

The limit is an invocation-count limit. It is not currently a guaranteed dollar limit.

### Story-generation request limit

Story-generation requests are rate-limited by the server process. The configured default is:

```env
STORY_GEN_RATE_LIMIT=30
```

This allows up to 30 generation requests from the same rate-limit identity during a 15-minute window. Requests above the limit are rejected temporarily.

This is an abuse-reduction control, not a complete billing control. It may not stop a user who changes networks, creates multiple accounts, or distributes requests across multiple clients.

### AI opt-in and server-side key protection

External AI generation requires:

- The account's AI opt-in to be enabled.
- The production OpenAI key to exist on the server.
- The OpenAI key to remain in Railway/server environment variables.
- The OpenAI key never to be placed in browser JavaScript, HTML, or public documentation.

### Prompt and output restrictions

Story requests are validated for allowed fields and size limits, including limits on the prompt, theme, grade, domain, story length, and language.

The application also uses:

- Structured output validation.
- Input moderation before story generation.
- Output moderation after generation.
- Grade and curriculum selection checks.
- Story length and complexity guidance.
- A safety-report action for unsafe, incorrect, or privacy-sensitive stories.

Adults must review generated stories before using them with children. AI output is not guaranteed to be accurate, age-appropriate, or suitable for every family.

### AI failure handling

If OpenAI is unavailable, returns an error, or produces invalid or unsafe content, the story request fails instead of silently substituting unreviewed content.

The application records relevant operational or safety events without intentionally storing unnecessary child prompts in AI usage records.

## Current Account And Authentication Restrictions

- Children do not create accounts.
- Accounts are managed by an adult parent, guardian, or authorized educator.
- A learner belongs to the signed-in account that created it.
- Story access is checked against learner ownership.
- Protected learner, story, progress, curriculum, subscription, and classroom routes require authentication.
- Login attempts are rate-limited.
- Registration attempts are rate-limited.
- Verification-email requests are rate-limited.
- Password-reset responses are intentionally generic so the service does not reveal whether an email exists.
- Password-reset links are single-use and expire after 30 minutes.
- Email verification is required before normal sign-in and protected use.
- Account and learner deletion is available through the privacy controls and requires the account's authorization and confirmation.

## Content And Use Restrictions

Users must not use Story Sprout to:

- Submit unlawful, hateful, sexual, dangerous, or otherwise inappropriate content.
- Attempt to access another user's account, learner, or story.
- Bypass moderation, authentication, rate limits, or AI usage controls.
- Make high-stakes medical, psychological, legal, or educational decisions about a child.
- Treat an AI story or score as a formal diagnostic assessment.
- Treat the product as a replacement for a teacher, school curriculum, or professional reading assessment.
- Enter unnecessary sensitive personal information about a child.

Access may be restricted or terminated to protect users, prevent abuse, enforce the terms, or maintain service security.

## Privacy And Child-Safety Restrictions

- The product is adult-managed by design.
- Learner profiles and reading activity are private to the signed-in account.
- Adults are responsible for reviewing content before sharing it with a child.
- Adults should not enter unnecessary sensitive information into story prompts.
- Privacy, terms, retention, consent, deletion, export, and vendor disclosures must remain accurate and current.
- The current privacy and consent implementation is a foundation and is not a certification of COPPA, FERPA, or state-law compliance.
- Use with children under 13 and use by schools require qualified privacy, parental-consent, procurement, COPPA, FERPA, and applicable state-law review before public launch.

## Cost And Abuse Controls

### What happens when one account generates too much

A single account is blocked after the configured monthly AI invocation limit. Both new stories and revisions count toward the limit after a successful AI call is recorded.

### What the current limit does not guarantee

The current implementation does not yet provide all of the following:

- A hard dollar budget per account.
- A separate daily account limit.
- A different allowance for each subscription plan.
- A guaranteed company-wide OpenAI spending cap.
- Complete protection against multiple accounts created by one person.
- Complete protection against simultaneous requests racing through the same budget check.
- Automatic suspension after repeated abuse.

AI usage records include token counts and estimated cost for monitoring, but recording cost is not the same as preventing cost.

### Recommended private-pilot settings

For a small controlled pilot, use conservative Railway variables such as:

```env
AI_MONTHLY_INVOCATION_LIMIT=20
STORY_GEN_RATE_LIMIT=5
OPENAI_ENABLE_MODERATION=true
```

The exact values should be chosen after estimating the cost of a short, standard, long, and revised story.

## Required Before Public Launch

Before allowing unrestricted public use or charging real families, add or verify:

1. A dollar-based account or plan budget in addition to invocation limits.
2. Atomic budget reservation so simultaneous requests cannot exceed the limit.
3. Daily and monthly account limits.
4. Separate limits for new stories, revisions, and other AI features.
5. Maximum input and output token budgets for each story length.
6. Provider-level spending alerts and a production OpenAI project/key with controlled access.
7. Abuse detection for repeated accounts, payment abuse, suspicious traffic, and repeated safety violations.
8. Automatic review or suspension workflows for serious or repeated abuse.
9. Monitoring and alerts for AI errors, costs, safety blocks, and budget blocks.
10. Tests for rate limits, budget boundaries, concurrent requests, ownership checks, moderation failures, and provider outages.
11. Final privacy, parental-consent, retention, deletion, export, terms, and vendor disclosures reviewed for the locations served.
12. Production billing, refunds, failed-payment handling, subscription cancellation, and webhook monitoring.
13. Database backups, error monitoring, uptime alerts, deployment rollback, and tested migrations.

## Release Guidance

### Private alpha

- Invite only trusted families or educators.
- Keep payments in sandbox mode.
- Use conservative AI limits.
- Manually review generated stories.
- Provide direct support.
- Do not claim formal reading mastery or legal compliance.

### Private paid pilot

- Use finalized privacy and legal documents.
- Use reviewed production billing settings.
- Monitor AI usage and costs daily.
- Keep the customer group limited.
- Maintain a support and refund process.

### Public launch

Public launch should wait until the restrictions and safeguards in the Required Before Public Launch section are implemented, tested, monitored, and reviewed by the appropriate legal and education professionals.
