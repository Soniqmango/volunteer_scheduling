import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { CalendarDays, Sun, Sunset, CheckCircle2, Clock, Download } from 'lucide-react';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Signup } from '../types';
import { toDateString } from '../lib/dates';

function generateICS(signups: Signup[]): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//PTA Store Volunteers//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:My Volunteer Shifts',
    'X-WR-TIMEZONE:Asia/Singapore',
  ];

  for (const signup of signups) {
    const date = signup.shift_date.replace(/-/g, '');
    const [startTime, endTime] =
      signup.shift_type === 'morning' ? ['080000', '120000'] : ['120000', '160000'];
    const label = signup.shift_type === 'morning' ? 'Morning' : 'Afternoon';
    const uid   = `${signup.id}@pta-volunteers`;
    const stamp = new Date().toISOString().replace(/[-:.]/g, '').slice(0, 15) + 'Z';

    lines.push(
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${stamp}`,
      `DTSTART;TZID=Asia/Singapore:${date}T${startTime}`,
      `DTEND;TZID=Asia/Singapore:${date}T${endTime}`,
      `SUMMARY:${label} Volunteer Shift`,
      `DESCRIPTION:PTA Store volunteer ${label.toLowerCase()} shift (${
        signup.shift_type === 'morning' ? '8:00 AM – 12:00 PM' : '12:00 PM – 4:00 PM'
      })`,
      'STATUS:CONFIRMED',
      'END:VEVENT'
    );
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

function downloadICS(signups: Signup[]) {
  const ics  = generateICS(signups);
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = 'my-volunteer-shifts.ics';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function MyShifts() {
  const { profile } = useAuth();
  const [upcoming, setUpcoming] = useState<Signup[]>([]);
  const [past, setPast]         = useState<Signup[]>([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    if (!profile) return;

    fetchShifts();

    const channel = supabase
      .channel('my-shifts')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'signups', filter: `volunteer_id=eq.${profile.id}` },
        fetchShifts
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);

  async function fetchShifts() {
    if (!profile) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('signups')
      .select('*, volunteer:profiles(*)')
      .eq('volunteer_id', profile.id)
      .order('shift_date', { ascending: true })
      .order('shift_type');

    if (!error && data) {
      const today = toDateString(new Date());
      setUpcoming((data as Signup[]).filter(s => s.shift_date >= today));
      setPast((data as Signup[]).filter(s => s.shift_date < today).reverse());
    }
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navbar />
        <div className="flex items-center justify-center py-32">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
          <CalendarDays className="w-6 h-6 text-indigo-500" />
          My Shifts
        </h1>

        {/* ── Upcoming ─────────────────────────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide flex items-center gap-2">
              <Clock className="w-4 h-4 text-orange-500" />
              Upcoming ({upcoming.length})
            </h2>
            {upcoming.length > 0 && (
              <button
                onClick={() => downloadICS(upcoming)}
                className="flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-medium border border-indigo-200 dark:border-indigo-700 rounded-lg px-3 py-1.5 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Add to Calendar
              </button>
            )}
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            {upcoming.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-gray-500 py-8 text-center">
                No upcoming shifts —{' '}
                <Link to="/schedule" className="text-indigo-600 dark:text-indigo-400 hover:underline">
                  sign up on the schedule
                </Link>
                !
              </p>
            ) : (
              <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                {upcoming.map(s => (
                  <li
                    key={s.id}
                    className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {s.shift_type === 'morning' ? (
                        <Sun className="w-4 h-4 text-sky-500 flex-shrink-0" />
                      ) : (
                        <Sunset className="w-4 h-4 text-amber-500 flex-shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-100">
                          {format(parseISO(s.shift_date), 'EEEE, MMMM d, yyyy')}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{s.shift_type} shift</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {s.is_fulfilled && (
                        <span className="flex items-center gap-1 text-xs text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-2 py-0.5 rounded-full font-medium">
                          <CheckCircle2 className="w-3 h-3" />
                          Done
                        </span>
                      )}
                      <Link
                        to={`/shift/${s.shift_date}/${s.shift_type}`}
                        className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-medium"
                      >
                        View →
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* ── Past ─────────────────────────────────────────────────────────── */}
        {past.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-3">
              Past ({past.length})
            </h2>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden opacity-75">
              <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                {past.map(s => (
                  <li
                    key={s.id}
                    className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {s.shift_type === 'morning' ? (
                        <Sun className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      ) : (
                        <Sunset className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {format(parseISO(s.shift_date), 'EEEE, MMMM d, yyyy')}
                        </p>
                        <p className="text-xs text-gray-400 capitalize">{s.shift_type} shift</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {s.is_fulfilled ? (
                        <span className="flex items-center gap-1 text-xs text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-2 py-0.5 rounded-full font-medium">
                          <CheckCircle2 className="w-3 h-3" />
                          Done
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
                          Pending
                        </span>
                      )}
                      <Link
                        to={`/shift/${s.shift_date}/${s.shift_type}`}
                        className="text-xs text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium"
                      >
                        View →
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
