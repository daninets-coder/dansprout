# Resend Email and Weekly Reminder Setup

## Current Status

Story Sprout currently has:

- Resend support for password-reset emails.
- A `weekly_email_enabled` preference in PostgreSQL.
- A parent-facing weekly reminder checkbox.
- A weekly reminder preview endpoint at:

```text
GET /api/reminders/weekly-preview
```

The checkbox currently saves the parent's preference. Automatic weekly reminder delivery still requires the email sender and scheduler steps described below.

## 1. Create A Resend Account

1. Go to:

```text
https://resend.com
```

2. Create an account or sign in.
3. Open **API Keys**.
4. Create a production API key with email-sending permission.
5. Copy the key immediately.

Never place the key in browser JavaScript, Git, Markdown files, screenshots, or chat messages.

## 2. Verify The Sending Domain

In Resend:

1. Open **Domains**.
2. Add the sending domain, for example:

```text
dansprout.com
```

3. Resend will provide DNS records.
4. Add the required SPF, DKIM, and any return-path records at the domain DNS provider.
5. Wait until Resend shows the domain as verified.

Use a verified sender address such as:

```text
Story Sprout <no-reply@dansprout.com>
```

Do not use an address on an unverified domain for production mail.

## 3. Add Railway Variables

Open the Railway `dansprout` service, select the production environment, and add:

```env
EMAIL_PROVIDER=resend
RESEND_API_KEY=your-production-resend-key
EMAIL_FROM=Story Sprout <no-reply@dansprout.com>
```

Use the actual Resend key as the value of `RESEND_API_KEY`. Do not commit that value to Git.

After saving the variables:

1. Redeploy the Railway service.
2. Wait for a successful deployment.
3. Confirm the service readiness endpoint works:

```text
https://dansprout.com/api/readyz
```

## 4. Test Password Reset Email

The application already uses Resend for password-reset messages when these conditions are true:

- `EMAIL_PROVIDER=resend`
- `RESEND_API_KEY` is configured.
- `EMAIL_FROM` is configured.
- The sending domain is verified.

Test the flow from the website:

1. Sign out.
2. Open **Sign in**.
3. Select **Forgot password?**.
4. Enter a real test account email.
5. Confirm the email arrives.
6. Test the reset link.
7. Check Resend logs if delivery fails.

## 5. Current Weekly Reminder Behavior

The parent-facing checkbox sends this preference to the server:

```text
POST /api/reminders/preferences
```

Example request:

```json
{
  "weeklyEmailEnabled": true
}
```

The preference is stored in the `reminder_preferences` table:

```text
weekly_email_enabled = true
```

The application also provides a preview endpoint:

```text
GET /api/reminders/weekly-preview
```

The preview includes:

- Parent greeting.
- Current reading streak.
- Learner names.
- Suggested story prompts.

At present, enabling the checkbox does not itself send a weekly email. It only records the parent's opt-in preference.

## 6. Application Work Still Needed

To deliver weekly reminders, the application needs a server-side sender that:

1. Finds accounts with `weekly_email_enabled = true`.
2. Reads each parent's email address.
3. Gets the parent's weekly reading activity.
4. Builds a short, safe email summary.
5. Includes suggested next story prompts.
6. Sends the email through Resend.
7. Records success or failure in operational logs.
8. Prevents duplicate sends for the same week.
9. Does not include unnecessary child information.
10. Handles Resend rate limits and failures.

A production implementation should add a field such as:

```text
last_weekly_email_sent_at
```

or a separate delivery table containing:

```text
account_id
week_start
sent_at
provider_message_id
status
error_message
```

This prevents duplicate emails when a scheduler retries.

## 7. Scheduler Work Still Needed

A weekly email sender must be run by a scheduler. Recommended options:

### Railway Cron

Create a separate Railway cron service that runs a command such as:

```text
npm run reminders:send
```

Configure it to run once per week. The exact Railway cron configuration should be tested in a private environment first.

### External Scheduler

Alternatively, use an external scheduler to call a protected server endpoint. The endpoint must require a secret scheduler token and must never be public without authentication.

Do not rely only on an in-memory `setInterval` inside the web server. Web services restart, scale, and sleep, which can cause missed or duplicate emails.

## 8. Recommended Sender Design

A safe sender should use a server-only function similar to:

```text
sendWeeklyReminders()
```

It should:

- Query opted-in accounts.
- Generate each parent's weekly summary.
- Send through the Resend API.
- Store a delivery result.
- Continue processing other parents if one email fails.
- Log only necessary operational metadata.
- Avoid logging passwords, API keys, tokens, or full child prompts.

The email can contain:

```text
Subject: Your Story Sprout weekly reading plan

Hi Parent,

Here is this week's reading snapshot:

- Current reading streak
- Stories completed
- Learners ready for a new story
- Suggested next story idea

Open Story Sprout to continue reading together.
```

Use a link to the website rather than putting sensitive learner details into the email body.

## 9. Email Consent And Unsubscribe

The weekly reminder checkbox must remain an explicit opt-in. The email system should also provide:

- A clear unsubscribe link.
- A way to turn reminders off in Privacy & data settings.
- Immediate preference updates.
- No reminders after the parent disables the setting.
- A record of the preference change.

The email footer should identify Story Sprout and explain how to stop weekly reminders.

## 10. Production Testing Checklist

Before enabling this for real families:

- Verify the Resend domain.
- Add Railway production variables.
- Redeploy Railway.
- Test password reset delivery.
- Test one weekly reminder with a test account.
- Confirm the sender and reply-to behavior.
- Confirm the email does not expose unnecessary child data.
- Test disabling the checkbox.
- Confirm disabled accounts receive no further reminders.
- Test a failed Resend request.
- Test a scheduler retry.
- Confirm duplicate weekly emails are prevented.
- Check Resend delivery logs.
- Check Railway logs and operational events.
- Add a support address for delivery problems.

## 11. Security Rules

Never:

- Put `RESEND_API_KEY` in `api-app.js`.
- Put `RESEND_API_KEY` in `index.html`.
- Put `RESEND_API_KEY` in a public Markdown file.
- Commit the key to Git.
- Print the key in server logs.
- Send email directly from browser code.
- Create an unprotected scheduler endpoint.

The browser should only call the authenticated preference endpoint. The server and scheduled worker should handle email delivery.

## Summary

To enable the complete feature:

1. Create a Resend account.
2. Verify `dansprout.com` in Resend.
3. Add `EMAIL_PROVIDER`, `RESEND_API_KEY`, and `EMAIL_FROM` to Railway.
4. Redeploy and test password reset email.
5. Implement the weekly reminder sender.
6. Add duplicate-prevention tracking.
7. Configure a Railway cron job or protected external scheduler.
8. Test opt-in, opt-out, delivery failures, retries, and privacy behavior.

The current website is ready to store the parent's preference and preview the reminder data. The actual recurring email sender and production scheduler are the remaining implementation pieces.
