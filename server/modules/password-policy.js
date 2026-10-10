// Password rules for new parent accounts and password resets (existing passwords still work for sign-in).
export const MIN_PASSWORD_LENGTH = 10;

const COMMON = new Set([
  'password', 'password1', 'password12', 'password123', 'password1234', '1234567890', '12345678910', 'qwertyuiop', 'qwerty12345',
  'iloveyou123', 'letmein1234', 'welcome1234', 'abc1234567', 'admin12345', 'passw0rd123', 'storysprout', 'storyauraland', 'dansprout1',
  'changeme123', 'trustno1234', 'monkey12345', 'dragon12345', 'football123', 'baseball123', 'sunshine123',
]);

// Returns an error message, or '' when the password is acceptable.
export function passwordProblem(password) {
  const value = String(password || '');
  if (value.length < MIN_PASSWORD_LENGTH) return `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
  if (new Set(value.toLowerCase()).size < 4) return 'Please use a less repetitive password.';
  if (COMMON.has(value.toLowerCase().replace(/[^a-z0-9]/g, ''))) return 'That password is too common. Please choose a different one.';
  return '';
}

// Tracks failed sign-ins per email so one account cannot be guessed at forever, even from many addresses.
export function createLoginGuard({ maxFailures = 10, windowMs = 15 * 60 * 1000, now = () => Date.now() } = {}) {
  const attempts = new Map(); // email -> { count, first }
  const fresh = entry => entry && now() - entry.first < windowMs;
  return {
    locked(email) { const e = attempts.get(email); return Boolean(fresh(e) && e.count >= maxFailures); },
    fail(email) {
      const e = attempts.get(email);
      if (fresh(e)) e.count += 1; else attempts.set(email, { count: 1, first: now() });
      if (attempts.size > 5000) for (const [k, v] of attempts) if (!fresh(v)) attempts.delete(k);
    },
    clear(email) { attempts.delete(email); },
  };
}
