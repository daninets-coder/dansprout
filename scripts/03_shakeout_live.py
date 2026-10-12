"""Shakeout test: quick health check of the website. Read-only, safe to run any time, costs nothing.
Run: python scripts/03_shakeout_live.py                       (checks https://dansprout.com)
     python scripts/03_shakeout_live.py http://localhost:3000  (checks a local copy)"""
import sys
from common import LIVE_URL, bad, fetch, ok

base = (sys.argv[1] if len(sys.argv) > 1 else LIVE_URL).rstrip("/")
print(f"Checking {base}\n")
failures = 0


def check(name, path, want_status, must_contain=None, must_not_contain=None):
    global failures
    status, body, headers = fetch(base + path)
    wanted = want_status if isinstance(want_status, (list, tuple)) else [want_status]
    good = status in wanted
    if good and must_contain and must_contain not in body:
        good = False
    if good and must_not_contain and must_not_contain in body:
        good = False
    (ok if good else bad)(f"{name}: {path} -> {status}" + ("" if good else f"  (expected {wanted}{', containing ' + must_contain if must_contain else ''})"))
    failures += 0 if good else 1
    return headers


check("Server alive", "/api/healthz", 200)
check("Database connected", "/api/readyz", 200)
headers = check("Home page loads", "/", 200, must_contain="DanSprout")
check("Admin page: at /admin, or hidden (404) once a secret address is set", "/admin", [200, 404])
check("Admin data is hidden when not logged in", "/api/admin/overview", [401, 404])
check("Private files are not public: .env", "/.env", 404)
check("Private files are not public: server code", "/server/server.js", 404)
check("Private files are not public: notes", "/CustomerRules.md", 404)
check("Story list needs login", "/api/stories", 401)
check("Ready-made list needs login", "/api/library/stories", 401)
check("Logo / icon loads", "/images/brand/favicon.svg", 200)

security = {k.lower() for k in headers}
for header in ("strict-transport-security", "x-content-type-options"):
    if base.startswith("https"):
        (ok if header in security else bad)(f"security header present: {header}")
        failures += 0 if header in security else 1

print(f"\n{'ALL GOOD' if not failures else str(failures) + ' CHECK(S) FAILED. Tell the owner right away and include the lines above.'}")
sys.exit(1 if failures else 0)
