"""Rebuild: reinstall packages, check every code file for typing mistakes, run the tests. Does not publish anything.
Run: python scripts/05_rebuild.py
Use it after downloading the project, or when something "stopped working for no reason"."""
import sys
from common import ROOT, bad, ok, run, step

step("1. Install packages exactly as locked (npm ci)")
if run(["npm", "ci"]).returncode != 0:
    bad("package install failed. Is the internet on? Close any running copy of the site and try again.")
    sys.exit(1)
ok("packages installed")

step("2. Check code files for typing mistakes")
files = [p for folder in ("server", "tests") for p in (ROOT / folder).rglob("*") if p.suffix in (".js", ".mjs") and "node_modules" not in p.parts]
files += [ROOT / n for n in ("api-app.js", "app.js", "auth.js") if (ROOT / n).exists()]
broken = [p for p in files if run(["node", "--check", str(p)], capture=True).returncode != 0]
for p in broken:
    bad(f"syntax error in {p.relative_to(ROOT)}")
if broken:
    sys.exit(1)
ok(f"{len(files)} code files look fine")

step("3. Run the tests")
code = run(["npm", "test"]).returncode
(ok if code == 0 else bad)("tests " + ("passed. The project is healthy." if code == 0 else "FAILED. Send the red text above to the developer."))
sys.exit(code)
