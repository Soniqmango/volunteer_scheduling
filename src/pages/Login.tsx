import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CalendarDays, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { checkRateLimit, recordFailedAttempt, clearAttempts } from '../lib/rateLimit';
import { sanitizeText } from '../lib/sanitize';

const EMAIL_MAX    = 254;
const PASSWORD_MAX = 128;

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [countdown, setCountdown] = useState(0);

  // Tick the countdown timer while rate-limited
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault();

    const cleanEmail = sanitizeText(email);

    // ── Rate limit check ────────────────────────────────────────────────
    const { blocked, secondsUntilReset, attemptsLeft } = checkRateLimit(cleanEmail);
    if (blocked) {
      setCountdown(secondsUntilReset);
      toast.error(`Too many attempts. Try again in ${Math.ceil(secondsUntilReset / 60)} min.`);
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email:    cleanEmail,
      password: sanitizeText(password),
    });
    setLoading(false);

    if (error) {
      recordFailedAttempt(cleanEmail);
      const { attemptsLeft: remaining } = checkRateLimit(cleanEmail);
      const warning = remaining <= 3 ? ` (${remaining} attempt${remaining !== 1 ? 's' : ''} left)` : '';
      toast.error(error.message + warning);
      return;
    }

    clearAttempts(cleanEmail);
    // Show a warning if they had accumulated failures
    if (attemptsLeft < MAX_ATTEMPTS_DISPLAY) {
      toast.success('Signed in.');
    }
    navigate('/schedule');
  }

  const { blocked: isBlocked } = checkRateLimit(sanitizeText(email));

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-white dark:from-gray-900 dark:to-gray-800 flex items-center justify-center px-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-8 w-full max-w-sm border border-transparent dark:border-gray-700">
        <div className="flex flex-col items-center gap-2 mb-7">
          <CalendarDays className="w-10 h-10 text-indigo-600 dark:text-indigo-400" />
          <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100 text-center">
            PTA Store Volunteers
          </h1>
        </div>

        <h2 className="text-base font-semibold text-gray-600 dark:text-gray-300 mb-4">Sign in to your account</h2>

        {/* Rate limit banner */}
        {isBlocked && countdown > 0 && (
          <div className="mb-4 flex items-start gap-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>
              Too many failed attempts. Try again in{' '}
              <strong>{Math.ceil(countdown / 60)}:{String(countdown % 60).padStart(2, '0')}</strong>.
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Email</label>
            <input
              type="email"
              required
              autoComplete="email"
              maxLength={EMAIL_MAX}
              value={email}
              onChange={e => setEmail(e.target.value)}
              disabled={isBlocked}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:opacity-50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Password</label>
            <input
              type="password"
              required
              autoComplete="current-password"
              maxLength={PASSWORD_MAX}
              value={password}
              onChange={e => setPassword(e.target.value)}
              disabled={isBlocked}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:opacity-50"
            />
          </div>
          <button
            type="submit"
            disabled={loading || isBlocked}
            className="w-full bg-indigo-600 text-white py-2.5 rounded-lg font-semibold text-sm hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Signing in…' : isBlocked ? `Locked (${Math.ceil(countdown / 60)}m)` : 'Sign in'}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-gray-500 dark:text-gray-400">
          No account?{' '}
          <Link to="/register" className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium">
            Register here
          </Link>
        </p>
      </div>
    </div>
  );
}

const MAX_ATTEMPTS_DISPLAY = 10;
