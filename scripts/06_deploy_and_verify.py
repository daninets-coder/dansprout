"""PUBLISH to the live website, then check it is healthy. This CHANGES THE LIVE SITE: owner approval first.
Run: python scripts/06_deploy_and_verify.py
It stops if anything is wrong, asks you to type 'deploy', pushes the saved changes, waits for Railway and runs the shakeout test."""
import subprocess
import sys
import time
from common import RAILWAY_SERVICE, ROOT, bad, confirm, ok, run, step, warn

step("1. Safety checks")
if run(["git", "rev-parse", "--abbrev-ref", "HEAD"], capture=True).stdout.strip() != "main":
    bad("you are not on the 'main' branch. Stopping.")
    sys.exit(1)
if run(["git", "status", "--short"], capture=True).stdout.strip():
    bad("there are unsaved changes. The developer must commit them first (git add / git commit). Stopping.")
    sys.exit(1)
if run(["npm", "test"], capture=True).returncode != 0:
    bad("tests fail. Not publishing. Run: python scripts/02_run_tests.py")
    sys.exit(1)
ok("on main, nothing unsaved, tests pass")

ahead = run(["git", "log", "origin/main..HEAD", "--oneline"], capture=True).stdout.strip()
if not ahead:
    warn("nothing new to publish (GitHub already has everything).")
    sys.exit(0)
print("\nThese changes will go live:\n" + ahead)
if not confirm("\nPublish to the LIVE website for real families?", "deploy"):
    print("Cancelled. Nothing was changed.")
    sys.exit(0)

step("2. Publish")
if run(["git", "push", "origin", "main"]).returncode != 0:
    bad("push failed. Nothing went live.")
    sys.exit(1)

step("3. Wait for Railway to finish (up to 10 minutes)")
deadline = time.time() + 600
while time.time() < deadline:
    time.sleep(20)
    out = run(["railway", "deployment", "list", "--service", RAILWAY_SERVICE], capture=True).stdout.splitlines()
    latest = out[1] if len(out) > 1 else ""
    print("   latest:", latest.strip())
    if "SUCCESS" in latest:
        break
    if "FAILED" in latest or "CRASHED" in latest:
        bad("Railway reports a failed deployment. Tell the developer now. The previous version keeps running.")
        sys.exit(1)
else:
    bad("timed out waiting for Railway. Check the Railway dashboard.")
    sys.exit(1)

step("4. Shakeout test on the live site")
sys.exit(subprocess.run([sys.executable, str(ROOT / "scripts" / "03_shakeout_live.py")]).returncode)
