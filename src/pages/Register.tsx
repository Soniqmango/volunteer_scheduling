import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CalendarDays } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { sanitizeText } from '../lib/sanitize';
import { checkRateLimit, recordFailedAttempt, clearAttempts } from '../lib/rateLimit';

const FULL_NAME_MAX = 100;
const EMAIL_MAX     = 254;
const PASSWORD_MIN  = 8;
const PASSWORD_MAX  = 128;

export default function Register() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault();

    const cleanName     = sanitizeText(fullName);
    const cleanEmail    = sanitizeText(email);
    const cleanPassword = sanitizeText(password);

    if (cleanName.length < 2) {
      toast.error('Please enter your full name.');
      return;
    }
    if (cleanName.length > FULL_NAME_MAX) {
      toast.error(`Name must be ${FULL_NAME_MAX} characters or fewer.`);
      return;
    }
    if (cleanPassword.length < PASSWORD_MIN) {
      toast.error(`Password must be at least ${PASSWORD_MIN} characters.`);
      return;
    }
    if (cleanPassword.length > PASSWORD_MAX) {
      toast.error(`Password must be ${PASSWORD_MAX} characters or fewer.`);
      return;
    }

    const { blocked, secondsUntilReset } = checkRateLimit(cleanEmail);
    if (blocked) {
      toast.error(`Too many attempts. Try again in ${Math.ceil(secondsUntilReset / 60)} min.`);
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email:    cleanEmail,
      password: cleanPassword,
      options: { data: { full_name: cleanName } },
    });
    setLoading(false);

    if (error) {
      recordFailedAttempt(cleanEmail);
      toast.error(error.message);
      return;
    }

    clearAttempts(cleanEmail);
    toast.success('Account created! Check your email to confirm, then sign in.');
    navigate('/login');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-white dark:from-gray-900 dark:to-gray-800 flex items-center justify-center px-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-8 w-full max-w-sm border border-transparent dark:border-gray-700">
        <div className="flex flex-col items-center gap-2 mb-7">
          <CalendarDays className="w-10 h-10 text-indigo-600 dark:text-indigo-400" />
          <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100 text-center">
            PTA Store Volunteers
          </h1>
        </div>

        <h2 className="text-base font-semibold text-gray-600 dark:text-gray-300 mb-4">Create an account</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Full name</label>
            <input
              type="text"
              required
              autoComplete="name"
              maxLength={FULL_NAME_MAX}
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Email</label>
            <input
              type="email"
              required
              autoComplete="email"
              maxLength={EMAIL_MAX}
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">
              Password{' '}
              <span className="text-gray-400 font-normal">(min. {PASSWORD_MIN} characters)</span>
            </label>
            <input
              type="password"
              required
              autoComplete="new-password"
              minLength={PASSWORD_MIN}
              maxLength={PASSWORD_MAX}
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-2.5 rounded-lg font-semibold text-sm hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-gray-500 dark:text-gray-400">
          Already have an account?{' '}
          <Link to="/login" className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
