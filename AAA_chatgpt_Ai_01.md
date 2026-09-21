# ChatGPT implementation notes — 01

Date: September 20, 2026

This document records changes made during this conversation. The repository already contained uncommitted changes; this is not a description of every difference from Git HEAD.

## Purpose

Improve first-session onboarding and reading, story and assessment quality, and repeat use with useful parent guidance. These changes do not establish a measured 9/10 rating or validated educational outcomes.

## Changes implemented

### Onboarding and first reading session

- Added a “Read a sample story” button to the public landing page.
- Added a three-page sample, The Little Paper Boat, with back/next navigation, a discussion question, an expandable answer, and a close action. No account or AI request is needed.
- Changed authenticated onboarding from learner → story → plan selection to learner → story → completed reading.
- Changed the learner name label to “Nickname or first name” and added an example interest.
- After creating the first learner, return to Home, select a quick story, and prefill an editable adventure idea using the interest.
- Moved the reading-skill selector into an optional expandable section; grade level remains visible.
- Open newly generated stories automatically.
- Show a persistent generation error message explaining that the choices remain on the current screen for retry.

### Reader experience

- Resume using the locally saved page when available, otherwise the server bookmark; clamp invalid page values.
- Persist the reader's preferred text size.
- Serialize story-preference saves so fast interactions do not send overlapping bookmark/rating/favorite requests from the reader.
- Add dialog semantics, Escape-to-close, keyboard focus containment, and focus restoration on close.
- Add a “Finish reading” action on the final page.
- After completion, show a discussion prompt, a link to the story questions, a read-again action, and a suggestion for next time.
- Hide the parent story editor from child sessions.
- Escape story text before adding clickable vocabulary markup.
- Add sample-reader styling, visible keyboard focus, and reduced-motion styling.

### Assessments

- Remove immediate correct/incorrect hints while choosing answers.
- After submission, show question-by-question feedback and the expected answers.
- Explain that a story check measures this practice session, not overall reading ability.
- Suggest finding a supporting sentence together.
- Prevent duplicate submissions while a request is pending; allow retry after a failed save.

### Story quality

- Add a reusable server-side structural quality checker.
- Reject fewer than three non-empty pages, repeated pages, fewer than three questions, repeated questions, missing prompts, invalid option counts, empty/duplicate options, and answer keys that do not match exactly one option.
- Invoke these checks from the shared generated-story validator, including callers that use it for revisions.
- Strengthen generation instructions: coherent beginning/problem/resolution, meaningful use of interests, vocabulary appearing in the story, and distinct questions with one text-supported answer.
- These checks are mechanical safeguards. They do not prove age suitability, factual correctness, answerability, or educational quality.

### Return visits and parent value

- Make the latest-activity action prioritize an unfinished story for the selected learner from the stories currently loaded.
- Offer rereading when no unfinished story is available in that list.
- Add practical next-session prompts and clarify the limits of story-check results.
- The existing stories endpoint loads up to ten recent stories; this change does not add a complete-history continuation search.

## Files changed or added

| File | Work performed |
| --- | --- |
| `app.js` | Public sample-story entry point and dialog |
| `api-app.js` | Onboarding, simplified setup, reader, assessment feedback, and return actions |
| `reader.css` | Sample reader, optional setup section, feedback, focus, and reduced-motion styles |
| `server/server.js` | Shared quality-check integration and generation instructions |
| `server/story-quality.js` | New structural story/question validator |
| `tests/story-quality.test.js` | Five automated quality-validation tests |
| `package.json` | Added `npm test` script using Node's test runner |
| `STORY_QUALITY_RUBRIC.md` | Human review criteria and unassisted family pilot procedure |
| `AAA_chatgpt_Ai_01.md` | This implementation record |

## Review rubric and pilot

`STORY_QUALITY_RUBRIC.md` defines six dimensions scored 0–2: coherence, reading fit, personalization, vocabulary, assessment, and safety/preferences. Its proposed acceptance threshold is at least 10/12, no zero scores, and full marks for assessment and safety.

It also provides an observation procedure for 5–10 consenting families, with a proposed 80% unassisted first-session completion target and a one-week return-session check. These are proposed evaluation criteria, not results already obtained. No family pilot or educator review was performed in this session.

## Validation completed

- `npm test`: all five tests passed.
- Tests cover valid answer keys, duplicate options differing in case/spacing, answers outside the options, repeated pages/questions, and missing content.
- `node --check` passed for `app.js`, `api-app.js`, and `server/server.js`.
- `git diff --check` passed.
- Restarted the existing local Node server on port 3000.
- The restarted server passed `/api/healthz`.
- Requested the default browser to open `http://localhost:3000`.

## Remaining verification and limitations

- No complete live-browser walkthrough, mobile-device check, screen-reader test, or authenticated end-to-end test was performed.
- No paid AI generation requests were run to evaluate the updated prompt or quality gate.
- Existing stories are not retroactively reviewed or rewritten.
- Automatic validation rejects faulty generated content; no automatic regeneration loop was added.
- Sample-story content is a static example, not a claim of educator approval.
- Repeat use, story quality, and educational outcomes still need actual observation and review.
- No recurring-character series, narration word highlighting, or new pilot analytics pipeline was added.

## Earlier audit findings outside this implementation

The earlier review identified public backend-source exposure through the project-root static mount, a startup query that overrides stored AI opt-outs, and billing webhook retry handling that skips previously recorded failed events. These issues were not fixed by this onboarding/reading implementation and remain separate work.

No credentials are included in this document.


## Follow-up implementation: items 2–7

- Added saved learner reading levels and an optional sensitivities section.
- Added a focused reader, narration pause/resume, browser-based word pronunciation, and evidence quotes after quiz submission.
- Added separately stored foreground reading activity and adult observations of help given. Activity time is an estimate, not proof of reading.
- Corrected the dashboard count to use recorded assessments rather than completed stories containing questions.
- Added next-chapter setup with server-resolved previous-story context and reuse of the existing series cover. This does not guarantee semantic character consistency.
- Added continuation lookup across the learner's retained unfinished stories.
- Extracted authentication, learner access, billing webhook registration, and story generation into modules. The excluded item-1 behavior was not intentionally changed.
- Added exact evidence-quote validation to newly generated/revised questions and age-sensitive early-reader length guidance.
- Added generation timing/outcome metrics and partial known cost per completed story to the owner metrics endpoint. Unpriced calls remain explicitly identified.
- Added migration `010_reading_experience.sql`, an isolated HTTP/database integration test, browser tests for desktop/phone/tablet viewports, and five fictional evaluation benchmarks with educator review pending.

Run `npm test`, `npm run test:browser`, and `npm run eval:stories` to validate. Browser tests mock API/AI responses and do not establish actual-device or screen-reader usability. No paid AI evaluation, educator review, or family pilot was performed. The additive migration runs on the next normal server startup; the running server has not been restarted for this follow-up.


## Public-file exposure fix

Replaced unrestricted project-root file serving and catch-all HTML responses with an explicit frontend-file allowlist and media-only directory rules. Backend code, environment files, logs, SQL, internal documentation, package files, tests, and dependencies now return 404. Added an HTTP regression test covering permitted assets, denied paths, encoded paths, and HEAD requests. This does not change generated-media sharing permissions or implement public story links.


## Sibling sharing within a family

A parent can enable sibling sharing from the story reader. A learner can then share their own story with another learner under the same parent account. A new story copy starts with independent completion, bookmarks, assessments, and observations; original reflection responses and private prompts are not copied. The story text and reading level are unchanged. Repeat shares do not create duplicate copies; removed copies require parent restoration. Cross-family recipients and another child’s source story are rejected. Migration: `011_sibling_sharing.sql`.
