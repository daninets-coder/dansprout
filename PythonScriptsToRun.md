# PythonScriptsToRun.md

Simple, safe scripts for running routine checks on DanSprout Stories. They are written so someone with little experience can run them.
All are in the `scripts/` folder. They use only what Python already includes, so there is nothing to install.

## Before you start (one time)

1. Open a terminal (Windows: search "PowerShell" or "Terminal").
2. Go into the project folder:
   ```
   cd C:\DanielBusines\story-sprout-web\story-sprout-web
   ```
3. Run the first script (it only looks, it changes nothing):
   ```
   python scripts/01_check_setup.py
   ```
   If it prints `READY`, you can use all the others. If it says `FAIL`, fix that line first or ask the owner.

## The scripts

| # | Command | What it does | Changes anything? | Costs money? |
|---|---|---|---|---|
| 1 | `python scripts/01_check_setup.py` | Checks this computer has what it needs | No | No |
| 2 | `python scripts/02_run_tests.py` | Runs the automatic tests (add `--browser` for the slower browser tests) | No | No |
| 3 | `python scripts/03_shakeout_live.py` | **Shakeout test**: health check of the live website (is it up, is the database up, are private files hidden, do logins still protect data) | No | No |
| 4 | `python scripts/04_local_shakeout.py` | Starts a private copy on your computer, shakeout-tests it, stops it | No | No |
| 5 | `python scripts/05_rebuild.py` | **Rebuild**: reinstalls packages, checks every code file, runs tests. Use after a fresh download or "it stopped working" | Only your own computer | No |
| 6 | `python scripts/06_deploy_and_verify.py` | **Publishes to the LIVE site**, waits, then shakeout-tests it | **YES, the live website** | No |
| 7 | `python scripts/07_live_report.py` | Read-only numbers from the live database: library stories, accounts, new stories, AI cost by model | No (read only) | No |

Tip: scripts 1 to 5 and 7 are safe to run any time. **Only script 6 changes the live website.**

## Typical jobs

**"Is the website OK?"** (do this every morning, and any time a customer complains)
```
python scripts/03_shakeout_live.py
```
`ALL GOOD` at the end means yes. Any `FAIL` line: take a screenshot of the whole output and send it to the owner immediately.

**"I downloaded the project fresh" or "nothing works on my computer"**
```
python scripts/01_check_setup.py
python scripts/05_rebuild.py
```

**"Developer made changes, check them before they go live"**
```
python scripts/02_run_tests.py
python scripts/04_local_shakeout.py
```
Both should end in green `PASS` lines. Do not publish if anything is red.

**"Publish the changes"** (owner approval first!)
```
python scripts/06_deploy_and_verify.py
```
It refuses to go on if there are unsaved changes or failing tests. It shows what will go live and asks you to type `deploy`. Anything else cancels. After publishing it runs the shakeout test by itself. If that fails, tell the owner at once; the previous version keeps running while a bad deployment is stopped.

**"How are we doing?"**
```
python scripts/07_live_report.py
```
This needs the Railway tool signed in once: `railway login`.

## Rules for the helper

- Never edit or send the `.env` file. It contains passwords and keys.
- Never type your own commands into the database. Use only these scripts and ask the owner for anything else.
- A `FAIL` is information, not a disaster. Copy the full output and send it. Do not retry ten times.
- If a script asks you to type a word to continue and you are not sure, press Enter. That cancels it safely.

## What the results mean

- `PASS` green: good.
- `NOTE` yellow: worth knowing, not a failure (for example "unsaved changes").
- `FAIL` red: something is wrong. Stop and report.

## Other useful things (ask the developer, not for beginners)

- Change limits, prices-off switch, picture style or voice without code: `admin_SQL.md` (SQL) or the Rules tab at `/admin` (needs the authenticator code).
- Rebuild or extend the 100-story library: `node server/tools/build-library.mjs --help` (this spends money on OpenAI, capped by `--budget`).
- Lost admin authenticator: see `admin_SQL.md`, section 6.
