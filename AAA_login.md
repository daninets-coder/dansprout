# Story Sprout Login Guide

## What Login Does

Story Sprout uses adult accounts to protect learner profiles, stories, reading progress, and account settings.

Parents, guardians, teachers, and authorized educators create the account. Children do not create their own accounts.

## Create An Account

A new user selects **Create account** and enters:

- Name
- Account type
- Email address
- Password
- Password confirmation
- Adult consent

The password is stored as a secure password hash. The original password is not stored in the database.

The email address must be confirmed before the new account can be used.

## Email Verification

After registration:

1. Story Sprout creates the account as unverified.
2. Story Sprout creates a secure, temporary verification token.
3. The token is stored as a hash, not as the original token.
4. Resend sends a verification email.
5. The email contains a link to verify the account.
6. The link expires after 24 hours.
7. The link can be used only once.
8. After the link is used, the account is marked verified.

The verification email is sent from the Resend address configured by the service owner.

## Before Verification

An unverified user cannot sign in and use the protected application.

The user must verify the email first. After verification, the user can sign in normally.

Protected features include:

- Adding learners
- Creating stories
- Reading progress
- Curriculum selection
- Story assessments
- Plans and billing
- Reminder preferences
- Teacher and classroom tools

## Sign In

The user selects **Sign in** and enters:

- Email address
- Password

The server checks:

1. Whether the account exists.
2. Whether the password matches the secure password hash.
3. Whether the email has been verified.

If all checks pass, the user receives a secure login token and enters the family workspace.

If the password is wrong, the user receives a general login error. The system does not reveal unnecessary account details.

If the email is not verified, the user sees a verification message and can request another verification email.

## Resend Verification Email

If the verification email does not arrive:

1. Return to the sign-in screen.
2. Enter the registration email.
3. Select **Resend verification email**.
4. Check the inbox and spam folder.
5. Select the newest verification link.

The resend response is intentionally general. It does not reveal whether a particular email belongs to an account.

Resend requests are limited to help prevent abuse and email spam.

## Password Reset

If a user forgets the password:

1. Select **Forgot password?**.
2. Enter the account email.
3. Story Sprout sends a reset message when email delivery is configured.
4. Open the reset link.
5. Choose a new password.

Password reset links are temporary and single-use.

The password-reset system does not reveal whether an email address exists in the database.

## Logout

When the user selects **Sign out**:

1. The browser removes the login token.
2. The local account session is cleared.
3. The page reloads.
4. The sign-in screen appears.

This is the lightweight logout method used by the current application.

## Login Security

The application limits repeated authentication attempts:

- Registration: up to 5 attempts per 15 minutes.
- Login: up to 10 attempts per 15 minutes.
- Verification resend: up to 3 messages per hour.
- General authentication requests also have a shared rate limit.

These limits help reduce password guessing, fake registrations, and email abuse.

## Current QA Account

Existing pilot and QA accounts were marked as verified during the email-verification migration so testing could continue without requiring those accounts to receive a new verification email.

New accounts do not receive this exception. New accounts must verify their email.

## Data Stored For Login

The account database stores information such as:

- Email address
- Display name
- Account role
- Secure password hash
- Email verification time
- Consent time
- Account creation time
- Account update time

The database does not store the user's plain-text password.

Verification and password-reset tokens are stored only as secure hashes.

## Resend Configuration

Production email requires these Railway variables:

```env
EMAIL_PROVIDER=resend
RESEND_API_KEY=your-production-key
EMAIL_FROM=Story Sprout <admin@dansprout.com>
```

The Resend API key must remain in Railway server variables. It must never be placed in browser JavaScript, HTML, public Markdown, or Git.

The sending domain must be verified in Resend before production email is used.

## QA Test Checklist

### Registration

- Create an account with a real email address.
- Confirm the account does not immediately enter the application.
- Confirm the verification email arrives.
- Confirm the verification link works.
- Confirm the link expires after its time limit.
- Confirm a verification link cannot be reused.

### Login

- Sign in with the correct password.
- Try an incorrect password.
- Try an unverified account.
- Try a verified account.
- Confirm the account can add a learner after verification.

### Resend

- Request a verification email again.
- Confirm the newest email link works.
- Request too many messages and confirm the rate limit appears.
- Try an unknown email and confirm the response stays general.

### Logout

- Sign in.
- Select **Sign out**.
- Confirm the sign-in screen returns.
- Try opening the protected website again.
- Confirm the old browser session no longer works.

### Password Reset

- Request a password reset.
- Confirm the email arrives.
- Use the link once.
- Try using the same link again.
- Sign in with the new password.

## Simple Summary

Story Sprout login works like this:

```text
Create account
  -> Verify email
  -> Sign in
  -> Add learner
  -> Create stories
  -> Read and track progress
  -> Sign out when finished
```

Email verification makes sure the user can receive messages at the email address they used. Rate limits reduce abuse. Password hashes and token hashes protect sensitive authentication data. The account remains controlled by the adult who created it.
