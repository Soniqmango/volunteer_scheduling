import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, CalendarDays, CalendarCheck } from 'lucide-react';
import Navbar from '../components/Navbar';
import ShiftCard from '../components/ShiftCard';
import { useAuth } from '../context/AuthContext';
import { useSignups } from '../hook/useSignups';
import { useClosedDates } from '../hook/useClosedDates';
import { Profile, SHIFTS } from '../types';
import {
  parseWeekParam,
  getWeekStart,
  getWeekDates,
  nextWeek,
  prevWeek,
  toDateString,
  formatDayHeader,
  formatMonthRange,
} from '../lib/dates';
import { supabase } from '../lib/supabase';

export default function WeekView() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';

  const todayStr   = toDateString(new Date());
  const weekStart  = parseWeekParam(searchParams.get('week'));
  const weekDates  = getWeekDates(weekStart);
  const dateKey    = weekDates.map(toDateString).join(',');
  const isCurrentWeek = weekDates.some(d => toDateString(d) === todayStr);

  const { loading, getShiftSignups, signup, cancelSignup, markFulfilled } =
    useSignups(weekDates);
  const { getClosedDate } = useClosedDates();

  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
  const [coverageCounts, setCoverageCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!isAdmin) return;
    supabase
      .from('profiles')
      .select('*')
      .order('full_name')
      .then(({ data }) => {
        if (data) setAllProfiles(data as Profile[]);
      });
  }, [isAdmin]);

  useEffect(() => {
    const dates = dateKey.split(',');

    async function fetchCoverage() {
      const { data } = await supabase
        .from('comments')
        .select('shift_date, shift_type')
        .in('shift_date', dates)
        .eq('is_coverage_request', true);
      if (!data) return;
      const counts: Record<string, number> = {};
      (data as { shift_date: string; shift_type: string }[]).forEach(row => {
        const key = `${row.shift_date}-${row.shift_type}`;
        counts[key] = (counts[key] ?? 0) + 1;
      });
      setCoverageCounts(counts);
    }

    fetchCoverage();

    const channel = supabase
      .channel(`coverage-${dateKey}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, fetchCoverage)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [dateKey]);

  function navigate(dir: 'prev' | 'next') {
    const newStart = dir === 'next' ? nextWeek(weekStart) : prevWeek(weekStart);
    setSearchParams({ week: toDateString(newStart) });
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* ── Week navigation ─────────────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-6 gap-2">
          <button
            onClick={() => navigate('prev')}
            className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-300 hover:text-indigo-700 dark:hover:text-indigo-400 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 shadow-sm hover:shadow transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Prev</span>
          </button>

          <div className="text-center">
            <div className="flex items-center justify-center gap-2">
              <CalendarDays className="w-5 h-5 text-indigo-500" />
              <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">
                {formatMonthRange(weekStart)}
              </h2>
            </div>
            {!isCurrentWeek && (
              <button
                onClick={() => setSearchParams({ week: toDateString(getWeekStart(new Date())) })}
                className="mt-1 inline-flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-medium"
              >
                <CalendarCheck className="w-3.5 h-3.5" />
                Back to today
              </button>
            )}
          </div>

          <button
            onClick={() => navigate('next')}
            className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-300 hover:text-indigo-700 dark:hover:text-indigo-400 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 shadow-sm hover:shadow transition-all"
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* ── 5-column day grid ────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {weekDates.map(date => {
            const dateStr  = toDateString(date);
            const closed   = getClosedDate(dateStr);
            const isToday  = dateStr === todayStr;
            const isPast   = dateStr < todayStr;

            return (
              <div key={dateStr} className="space-y-3">
                <div
                  className={`text-center rounded-xl py-2.5 px-2 ring-2 ${
                    closed
                      ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 ring-transparent'
                      : isToday
                      ? 'bg-indigo-600 text-white ring-yellow-400'
                      : isPast
                      ? 'bg-gray-400 dark:bg-gray-600 text-white ring-transparent'
                      : 'bg-indigo-600 text-white ring-transparent'
                  }`}
                >
                  <p className="text-sm font-semibold">{formatDayHeader(date)}</p>
                  {isToday && (
                    <p className="text-xs font-semibold text-yellow-300 mt-0.5">Today</p>
                  )}
                  {closed && (
                    <p className="text-xs opacity-75 mt-0.5">
                      {closed.reason ?? 'Closed'}
                    </p>
                  )}
                </div>

                {SHIFTS.map(shift => (
                  <ShiftCard
                    key={shift.type}
                    date={dateStr}
                    config={shift}
                    signups={getShiftSignups(dateStr, shift.type)}
                    closedDate={closed}
                    isAdmin={isAdmin}
                    isToday={isToday}
                    isPast={isPast}
                    currentUserId={profile?.id ?? ''}
                    allProfiles={allProfiles}
                    coverageCount={coverageCounts[`${dateStr}-${shift.type}`] ?? 0}
                    onSignup={signup}
                    onCancel={cancelSignup}
                    onFulfill={markFulfilled}
                    onAdminAdd={signup}
                  />
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
