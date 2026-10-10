"""Run the automatic tests. Safe: nothing is published and no money is spent.
Run: python scripts/02_run_tests.py            (fast API/logic tests)
     python scripts/02_run_tests.py --browser  (also the slower browser tests; needs Edge and a running local site)"""
import sys
from common import bad, ok, run, step

step("Fast tests (npm test)")
code = run(["npm", "test"]).returncode
(ok if code == 0 else bad)("fast tests " + ("passed" if code == 0 else "FAILED. Do not publish. Send the red text above to the developer."))

if "--browser" in sys.argv:
    step("Browser tests (npx playwright test)")
    browser = run(["npx", "playwright", "test"]).returncode
    (ok if browser == 0 else bad)("browser tests " + ("passed" if browser == 0 else "FAILED (3 are known to fail already; compare with the developer)"))
    code = code or browser
sys.exit(code)
