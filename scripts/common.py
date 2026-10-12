"""Shared helpers for the DanSprout Stories helper scripts. Standard library only (no pip install needed)."""
import os
import subprocess
import sys
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent          # the project folder (where package.json lives)
LIVE_URL = "https://dansprout.com"
RAILWAY_SERVICE = "dansprout"
IS_WINDOWS = os.name == "nt"

GREEN, RED, YELLOW, RESET = ("\033[92m", "\033[91m", "\033[93m", "\033[0m") if sys.stdout.isatty() else ("", "", "", "")


def ok(msg): print(f"{GREEN}PASS{RESET}  {msg}")
def bad(msg): print(f"{RED}FAIL{RESET}  {msg}")
def warn(msg): print(f"{YELLOW}NOTE{RESET}  {msg}")
def step(msg): print(f"\n=== {msg} ===")


def run(cmd, check=False, capture=False, timeout=None):
    """Run a command inside the project folder. `cmd` is a list, e.g. ['npm', 'test']."""
    if IS_WINDOWS and cmd and cmd[0] in ("npm", "npx", "railway"):
        cmd = [cmd[0] + ".cmd"] + cmd[1:]
    result = subprocess.run(cmd, cwd=ROOT, text=True, capture_output=capture, timeout=timeout)
    if check and result.returncode != 0:
        sys.exit(result.returncode)
    return result


def have(program):
    try:
        run([program, "--version"], capture=True, timeout=30)
        return True
    except (OSError, subprocess.SubprocessError):
        return False


def fetch(url, timeout=20, headers=None):
    """GET a URL. Returns (status_code, body_text, headers). Never raises on HTTP errors."""
    request = urllib.request.Request(url, headers={"User-Agent": "dansprout-helper-scripts", **(headers or {})})
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            return response.status, response.read().decode("utf-8", "replace"), dict(response.headers)
    except urllib.error.HTTPError as error:
        return error.code, error.read().decode("utf-8", "replace"), dict(error.headers)
    except (urllib.error.URLError, TimeoutError, OSError) as error:
        return 0, str(error), {}


def confirm(question, word="yes"):
    """Ask the person to type a word before doing anything that changes the live site."""
    answer = input(f"{question}\nType '{word}' to continue, anything else to cancel: ").strip().lower()
    return answer == word.lower()
