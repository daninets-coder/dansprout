# Claude Updates Log

Running record of changes made to this codebase by Claude Code, most recent
session first. Each entry lists what changed as bullet points, followed by
the detailed explanation.

---

## Session: 2026-09-19

### Summary (bullet points)

- Fixed a bug where the dashboard silently crashed on every page load, which
  is also why saved stories weren't listing.
- Rebuilt the "Story Shelf" into three sections: Saved (last 10, favorites on
  top), Favorites, and Top rated — and fixed Top rated so it can actually
  populate (it never could before).
- Fixed a bug where new account registrations could get permanently stuck
  and unable to log in.
- Fixed a mismatched Stripe pricing environment variable, plus a related dead
  code reference.
- Fixed a security gap where the AI safety check on generated stories could
  silently let unmoderated content through if the moderation service itself
  had a hiccup.
- Fixed invisible (white-on-white) text in the "Welcome back" panel.
- Added a persistent crash/error log (`logs/error.log`) that captures both
  server crashes and browser-side JavaScript errors, with automatic log
  rotation so it never grows without bound.
- Added real AI-generated illustrations to every new story (one hero image
  per story), replacing the flat placeholder art.
- Added kid-facing gamification: a Reader Level badge, six icon achievement
  badges, and a weekly streak indicator.
- Fixed a regression (my own mistake) where an HTML edit for the illustration
  feature accidentally hid the reader toolbar, the voice dropdown, and the
  story text.
- Replaced the robotic browser text-to-speech voices with real AI narration
  (OpenAI voice generation), with a choice of three narrator voices, cached
  per story page so repeat plays are free.
- Found, but have **not yet fixed**: a duplicate `/api/progress` route
  registration that means a child's session can currently see progress data
  for every learner on the account, not just their own, and that deleted
  stories are being counted in progress stats. Flagging this for a follow-up
  fix.

---

### Details

**Dashboard crash / saved stories not listing**
`renderLastActivity` and `renderWeeklyReturnActions` were declared in a way
that got called before they were assigned, on every single dashboard
refresh. This silently aborted the rest of the page's rendering — including
the learner list, stats, plan badge, and the saved-stories list — with only
a toast notification (easy to miss) as evidence. Moved both functions to
proper hoisted declarations at the correct scope so they work both from
inside the refresh cycle and from the page's other event handlers (learner
dropdown, weekly review navigation), which is what an earlier, incomplete
fix attempt had broken in the first place.

**Story Shelf redesign**
Added a `saved` list (10 most recent stories, favorites sorted to the top)
alongside the existing Favorites and Top rated sections, each capped at 5.
Discovered the Top rated section could never populate: its query counted
ratings scoped per-account, but the database structure only ever allows one
rating per account per story, so the "needs 2 ratings" threshold could never
be met. Lowered it to 1.

**Registration could create permanently broken accounts**
If email verification wasn't configured (as in local/dev setups), the
registration endpoint would insert the new account, then throw while trying
to send a verification email — leaving a row in the database that could
never log in, since login requires a verified email. Wrapped the writes in a
database transaction and now auto-verify the account when email sending
isn't configured, instead of leaving it stuck.

**Stripe pricing mismatch**
`.env` had `STRIPE_PRICE_FAMILY_500`, but the code reads
`STRIPE_PRICE_FAMILY_1500`. Renamed the env var to match. Also found and
fixed a dead fallback reference to a pricing key (`family_800`) that no
longer exists in the pricing config.

**AI moderation could fail open**
The safety check that reviews AI-generated story text before a child sees it
would treat any failure of the moderation service itself (timeout, rate
limit, outage) as "not flagged" — meaning the content would go through
completely unchecked. Changed this to fail closed: if the safety check can't
run, the content is now treated as blocked rather than approved.

**Invisible text in the "Welcome back" panel**
The heading text ("[Learner]'s latest reading activity") was rendering in
white on a light cream background, making it unreadable. Traced to a missing
`color` property on `.last-activity-card` in an inline stylesheet embedded in
`api-app.js`; the color was inherited from a distant dark-background
ancestor that didn't actually apply to this specific panel.

**Crash/error logging**
Added `logs/error.log`, written to on every server error, uncaught
exception, and unhandled promise rejection, in addition to existing console
output. Added a new `/api/client-error` endpoint and a small script
(`error-reporting.js`, loaded first on every page) that reports uncaught
browser JavaScript errors to the same log — this is what would have caught
the dashboard crash bug automatically, instead of requiring someone to
notice a blank section. Added automatic size-based log rotation (default 5
MB per file, 5 backups kept, both configurable via `.env`) so the log
directory settles at a fixed maximum size.

**AI-generated story illustrations**
Every new story now gets one AI-generated hero illustration (via OpenAI's
image generation), created from the story's actual plot and setting, instead
of a static placeholder banner. Illustration generation never blocks story
creation — if it fails for any reason, the story is still created and falls
back to the old placeholder art. Images are cached to disk
(`story-illustrations/`, gitignored) and served automatically.

> **Known limitation:** images are stored on local disk. If this app is
> deployed to a host with an ephemeral filesystem (e.g. Railway without a
> persistent volume), generated illustrations will be lost on every
> redeploy. This needs a persistent volume or real object storage (S3,
> Cloudinary, etc.) before relying on this in production.

**Kid-facing gamification**
Replaced the three plain-text achievements with a "Reader Level" badge (🌱
Sprouting → 📖 Growing → 🌟 Star → 🚀 Adventure → 🏆 Champion, based on stories
completed) and expanded from 3 to 6 icon-based achievement badges. Added a 🔥
indicator to the weekly streak line when active. All computed from data the
app already tracked — no new backend logic or ongoing cost. Kept the tone
encouraging rather than scoreboard-like, to match the site's existing
"not a race" messaging.

**Regression: broken reader toolbar (introduced by the illustration feature)**
While wiring the new illustration into the story reader, a closing `>` was
accidentally dropped from the hero `<img>` tag. This merged the entire
reader toolbar — the Read/Stop buttons, the voice dropdown, and the story
text container — into one malformed, unclosed tag, so none of it rendered.
Fixed and re-verified the entire reader screen (not just the piece that was
originally changed).

**Real AI voice narration**
The "Read this page" / "Read story" buttons previously used the browser's
built-in text-to-speech (`speechSynthesis`), which sounds robotic and varies
by operating system — despite a dropdown labeled "Natural voice" that was
actually just listing whatever OS voices happened to be installed. Replaced
this with real AI-generated narration (OpenAI voice generation), offering
three curated narrator voices (Warm, Calm, Playful). Audio is generated once
per (story, page, voice) combination and cached to disk
(`story-audio/`, gitignored) — replaying the same page again is instant and
free. Falls back to a clear error message if narration can't be generated,
rather than failing silently.

**Open issue found, not yet fixed**
While working on narration, found that `/api/progress` is registered twice
in `server.js`. Express only ever runs the first registration, which is
missing both the child-mode learner scoping and the "exclude deleted
stories" filter present in the second (dead) registration. Practical effect:
a child's Child Mode session can currently pull progress data for every
learner on the account, not just their own, and deleted stories are being
counted toward progress totals. This has not been fixed yet and should be
treated as a priority follow-up.
