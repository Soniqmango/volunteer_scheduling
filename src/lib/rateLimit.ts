const WINDOW_MS   = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 10;
const KEY_PREFIX   = 'rl_login_';

interface AttemptRecord {
  attempts: number;
  windowStart: number;
}

function storageKey(identifier: string) {
  return KEY_PREFIX + identifier.toLowerCase().trim();
}

function read(identifier: string): AttemptRecord | null {
  try {
    const raw = localStorage.getItem(storageKey(identifier));
    return raw ? (JSON.parse(raw) as AttemptRecord) : null;
  } catch {
    return null;
  }
}

function write(identifier: string, record: AttemptRecord) {
  try {
    localStorage.setItem(storageKey(identifier), JSON.stringify(record));
  } catch {
    // localStorage unavailable — fail open (don't block the user)
  }
}

/** Returns whether this identifier is currently rate-limited, and how many seconds until reset. */
export function checkRateLimit(identifier: string): { blocked: boolean; secondsUntilReset: number; attemptsLeft: number } {
  const record = read(identifier);
  const now    = Date.now();

  if (!record || now - record.windowStart >= WINDOW_MS) {
    return { blocked: false, secondsUntilReset: 0, attemptsLeft: MAX_ATTEMPTS };
  }

  const attemptsLeft     = Math.max(0, MAX_ATTEMPTS - record.attempts);
  const secondsUntilReset = Math.ceil((record.windowStart + WINDOW_MS - now) / 1000);

  return {
    blocked: record.attempts >= MAX_ATTEMPTS,
    secondsUntilReset,
    attemptsLeft,
  };
}

/** Record a failed login attempt for this identifier. */
export function recordFailedAttempt(identifier: string): void {
  const record = read(identifier);
  const now    = Date.now();

  if (!record || now - record.windowStart >= WINDOW_MS) {
    write(identifier, { attempts: 1, windowStart: now });
  } else {
    write(identifier, { attempts: record.attempts + 1, windowStart: record.windowStart });
  }
}

/** Clear the attempt history (call on successful login). */
export function clearAttempts(identifier: string): void {
  try {
    localStorage.removeItem(storageKey(identifier));
  } catch {
    // ignore
  }
}
