import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { CalendarDays, Sun, Sunset, CheckCircle2, Clock } from 'lucide-react';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Signup } from '../types';
import { toDateString } from '../lib/dates';

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
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center py-32">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <CalendarDays className="w-6 h-6 text-indigo-500" />
          My Shifts
        </h1>

        {/* ── Upcoming ─────────────────────────────────────────────────────── */}
        <section>
          <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-orange-500" />
            Upcoming ({upcoming.length})
          </h2>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {upcoming.length === 0 ? (
              <p className="text-sm text-gray-400 py-8 text-center">
                No upcoming shifts —{' '}
                <Link to="/schedule" className="text-indigo-600 hover:underline">
                  sign up on the schedule
                </Link>
                !
              </p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {upcoming.map(s => (
                  <li
                    key={s.id}
                    className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {s.shift_type === 'morning' ? (
                        <Sun className="w-4 h-4 text-sky-500 flex-shrink-0" />
                      ) : (
                        <Sunset className="w-4 h-4 text-amber-500 flex-shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800">
                          {format(parseISO(s.shift_date), 'EEEE, MMMM d, yyyy')}
                        </p>
                        <p className="text-xs text-gray-500 capitalize">{s.shift_type} shift</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {s.is_fulfilled && (
                        <span className="flex items-center gap-1 text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded-full font-medium">
                          <CheckCircle2 className="w-3 h-3" />
                          Done
                        </span>
                      )}
                      <Link
                        to={`/shift/${s.shift_date}/${s.shift_type}`}
                        className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
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
            <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">
              Past ({past.length})
            </h2>
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden opacity-75">
              <ul className="divide-y divide-gray-100">
                {past.map(s => (
                  <li
                    key={s.id}
                    className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {s.shift_type === 'morning' ? (
                        <Sun className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      ) : (
                        <Sunset className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-700">
                          {format(parseISO(s.shift_date), 'EEEE, MMMM d, yyyy')}
                        </p>
                        <p className="text-xs text-gray-400 capitalize">{s.shift_type} shift</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {s.is_fulfilled ? (
                        <span className="flex items-center gap-1 text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded-full font-medium">
                          <CheckCircle2 className="w-3 h-3" />
                          Done
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                          Pending
                        </span>
                      )}
                      <Link
                        to={`/shift/${s.shift_date}/${s.shift_type}`}
                        className="text-xs text-gray-500 hover:text-indigo-600 font-medium"
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
