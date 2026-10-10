"""Is this computer ready to work on the project? Changes nothing.   Run: python scripts/01_check_setup.py"""
import sys
from common import ROOT, bad, have, ok, run, warn

problems = 0
for program, why in [("node", "runs the website"), ("npm", "installs and tests"), ("git", "saves and publishes changes"), ("railway", "talks to the live server (optional for tests)")]:
    if have(program):
        ok(f"{program} is installed ({why})")
    else:
        bad(f"{program} is missing ({why})")
        if program != "railway":
            problems += 1

if (ROOT / "node_modules").exists():
    ok("project packages are installed")
else:
    bad("project packages are missing. Run: python scripts/05_rebuild.py")
    problems += 1

if (ROOT / ".env").exists():
    ok(".env file found (needed to run the site on this computer)")
else:
    warn(".env file not found. You can still run the tests; ask the owner for the .env file to run the site locally.")

branch = run(["git", "rev-parse", "--abbrev-ref", "HEAD"], capture=True).stdout.strip()
dirty = run(["git", "status", "--short"], capture=True).stdout.strip()
ok(f"git branch: {branch}") if branch == "main" else warn(f"git branch is '{branch}', not 'main'")
ok("no unsaved changes") if not dirty else warn(f"{len(dirty.splitlines())} files have unsaved changes (git status --short shows them)")

print("\nREADY" if not problems else f"\n{problems} problem(s) above need fixing first.")
sys.exit(1 if problems else 0)
