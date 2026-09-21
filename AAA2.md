# Story Sprout Release Readiness

## Summary

Story Sprout is a strong working prototype, but it should not be released publicly or used to charge real families until the production, privacy, billing, AI safety, and assessment safeguards below are addressed.

The app is suitable for a private alpha or controlled pilot with trusted families and educators.

## Critical Before Public Release

### 1. Rotate Exposed Secrets

- Rotate the OpenAI API key that was previously exposed in `.env`.
- Confirm `.env` is ignored by Git.
- Check Git history for accidentally committed secrets.
- Use separate development, test, and production keys.
- Never place secret keys in browser JavaScript.

### 2. Finish Production Stripe Setup

- Replace the sandbox Stripe Price ID with production Price IDs.
- Configure the intended Family price, currently planned at `$15/month`.
- Configure the approved Classroom price.
- Use live Stripe keys only after sandbox testing is complete.
- Configure the production webhook and signing secret.
- Make subscription cancellation cancel the remote Stripe subscription, not only the local database record.
- Handle failed payments, refunds, disputes, webhook retries, and duplicate webhook events.
- Verify the checkout success and cancellation flows in production mode.

### 3. Harden Account Security

Add and test:

- Email verification
- Password reset
- Session revocation
- Stronger account recovery protections
- Appropriate rate limits for registration, login, story generation, and AI revision
- Audit logging for sensitive account and subscription actions

### 4. Complete Child Privacy and Legal Requirements

The app stores child-related information and reading activity. Before public use, finalize:

- Privacy policy
- Terms of service
- Parental consent flow
- Data retention policy
- Data deletion process
- Data export process
- Vendor disclosures for OpenAI, Stripe, PostgreSQL, and Railway
- COPPA review for children under 13
- FERPA review if selling to schools
- State privacy requirements for the locations where families use the product

The current consent flow is a foundation, not a complete compliance program.

### 5. Strengthen AI Safety

Production safeguards should include:

- Input moderation
- Output moderation
- Structured output validation
- Story length and complexity limits
- Cost limits per account
- Abuse monitoring
- Safe handling when OpenAI is unavailable
- Logging that avoids unnecessary storage of child prompts
- A process for reporting and reviewing unsafe content

### 6. Improve Progress and Mastery Accuracy

The current assessment score mainly measures whether response fields were filled. It should not be marketed as true mastery until it includes:

- A clear scoring rubric
- Adult or teacher review where appropriate
- A distinction between `completed` and `mastered`
- Standards-specific evidence
- Confidence limitations around AI assessment
- A way to correct inaccurate assessment results

## Important Product Issues

- The authenticated app and local browser demo may be confusing to public users.
- The parent/teacher dashboard and child reader should remain clearly separated.
- Some labels still use adult, internal, or business language.
- Public release needs onboarding, support contact information, account recovery, and a clear cancellation path.
- Test the product on phones and tablets using real parent and child workflows.
- Add AI generation cost controls before allowing unlimited generation.
- Add automated tests for registration, story generation, ownership checks, subscriptions, webhooks, vocabulary, and account deletion.

## Operational Requirements

Before charging money, add:

- Error monitoring
- Database backups
- Health checks
- Deployment rollback
- Structured server logs
- Uptime monitoring
- Stripe webhook monitoring
- OpenAI usage and cost monitoring
- Production database migrations instead of relying only on startup schema changes

## Business Readiness

Confirm:

- Actual monthly pricing and production Stripe Price IDs
- Whether print-on-demand is available now or planned for later
- Refund policy
- Customer support process
- Teacher and school pricing
- Whether the primary customer is a parent, school, or both
- Review of curriculum claims by a qualified reading educator
- Whether every story type can accurately claim MCCRS alignment

## Recommended Release Stages

### Stage 1: Private Alpha

- Invite 5–10 trusted families.
- Keep Stripe in sandbox mode.
- Provide manual support.
- Avoid public marketing.
- Collect usability, privacy, and safety feedback.

### Stage 2: Private Paid Pilot

- Use real Stripe pricing.
- Limit the number of customers.
- Publish finalized privacy and legal documents.
- Add monitoring and database backups.
- Manually review generated stories.

### Stage 3: Public Launch

- Verify security and privacy controls.
- Add automated tests and monitoring.
- Stabilize support and refund workflows.
- Clarify product positioning.
- Add production AI and billing safeguards.

## Immediate Priority Order

1. Rotate the exposed OpenAI key.
2. Complete production Stripe setup and cancellation handling.
3. Finalize child privacy, consent, and deletion requirements.
4. Strengthen AI output safeguards and cost controls.
5. Improve assessment and mastery accuracy.
6. Add monitoring, backups, tests, and rollback procedures.
7. Run a controlled private pilot before public launch.

## Current Recommendation

Story Sprout is ready for a controlled private pilot, not a fully public educational-product launch. The largest immediate blockers are secret rotation, production Stripe setup, cancellation correctness, child-privacy compliance, reliable AI safeguards, and trustworthy assessment behavior.
