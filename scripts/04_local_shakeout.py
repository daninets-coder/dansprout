"""Start a private copy of the site on this computer, run the shakeout test on it, then stop it. Never touches the live site.
Needs the .env file. Run: python scripts/04_local_shakeout.py
(If it says port 3000 is busy, close the other terminal running the site first.)"""
import subprocess
import sys
import time
from common import IS_WINDOWS, ROOT, bad, fetch, ok, step

if not (ROOT / ".env").exists():
    bad(".env file missing. Ask the owner for it, or run the tests instead: python scripts/02_run_tests.py")
    sys.exit(1)
if fetch("http://localhost:3000/api/healthz")[0] == 200:
    bad("something is already running on port 3000. Close it first, then try again.")
    sys.exit(1)

step("Starting a local copy of the site")
server = subprocess.Popen(["npm.cmd" if IS_WINDOWS else "npm", "run", "dev"], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
try:
    for _ in range(30):
        time.sleep(2)
        if fetch("http://localhost:3000/api/healthz")[0] == 200:
            ok("local site is up")
            break
    else:
        bad("the local site did not start in 60 seconds. Run 'npm run dev' by hand to see the error.")
        sys.exit(1)
    step("Shakeout on the local copy")
    code = subprocess.run([sys.executable, str(ROOT / "scripts" / "03_shakeout_live.py"), "http://localhost:3000"]).returncode
finally:
    if IS_WINDOWS:
        subprocess.run(["taskkill", "/F", "/T", "/PID", str(server.pid)], capture_output=True)
    else:
        server.terminate()
print("Local copy stopped.")
sys.exit(code)
