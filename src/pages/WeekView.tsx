import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import Navbar from '../components/Navbar';
import ShiftCard from '../components/ShiftCard';
import { useAuth } from '../context/AuthContext';
import { useSignups } from '../hook/useSignups';
import { useClosedDates } from '../hook/useClosedDates';
import { Profile, SHIFTS } from '../types';
import {
  parseWeekParam,
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

  const weekStart  = parseWeekParam(searchParams.get('week'));
  const weekDates  = getWeekDates(weekStart);
  const dateKey    = weekDates.map(toDateString).join(',');

  const { loading, getShiftSignups, signup, cancelSignup, markFulfilled } =
    useSignups(weekDates);
  const { getClosedDate } = useClosedDates();

  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
  const [coverageCounts, setCoverageCounts] = useState<Record<string, number>>({});

  // Profiles list for admin "add volunteer" dropdown
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

  // Coverage request counts for this week (for the badges on shift cards)
  useEffect(() => {
    const dates = dateKey.split(',');
    supabase
      .from('comments')
      .select('shift_date, shift_type')
      .in('shift_date', dates)
      .eq('is_coverage_request', true)
      .then(({ data }) => {
        if (!data) return;
        const counts: Record<string, number> = {};
        (data as { shift_date: string; shift_type: string }[]).forEach(row => {
          const key = `${row.shift_date}-${row.shift_type}`;
          counts[key] = (counts[key] ?? 0) + 1;
        });
        setCoverageCounts(counts);
      });
  }, [dateKey]);

  function navigate(dir: 'prev' | 'next') {
    const newStart = dir === 'next' ? nextWeek(weekStart) : prevWeek(weekStart);
    setSearchParams({ week: toDateString(newStart) });
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* ── Week navigation ─────────────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-6 gap-2">
          <button
            onClick={() => navigate('prev')}
            className="flex items-center gap-1 text-sm text-gray-600 hover:text-indigo-700 bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-sm hover:shadow transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Prev</span>
          </button>

          <div className="text-center">
            <div className="flex items-center justify-center gap-2">
              <CalendarDays className="w-5 h-5 text-indigo-500" />
              <h2 className="text-lg font-bold text-gray-800">
                {formatMonthRange(weekStart)}
              </h2>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              {toDateString(weekDates[0])} – {toDateString(weekDates[4])}
            </p>
          </div>

          <button
            onClick={() => navigate('next')}
            className="flex items-center gap-1 text-sm text-gray-600 hover:text-indigo-700 bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-sm hover:shadow transition-all"
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* ── 5-column day grid ────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {weekDates.map(date => {
            const dateStr = toDateString(date);
            const closed  = getClosedDate(dateStr);

            return (
              <div key={dateStr} className="space-y-3">
                {/* Day header */}
                <div
                  className={`text-center rounded-xl py-2.5 px-2 ${
                    closed
                      ? 'bg-gray-200 text-gray-500'
                      : 'bg-indigo-600 text-white'
                  }`}
                >
                  <p className="text-sm font-semibold">{formatDayHeader(date)}</p>
                  {closed && (
                    <p className="text-xs opacity-75 mt-0.5">
                      {closed.reason ?? 'Closed'}
                    </p>
                  )}
                </div>

                {/* Morning + Afternoon shift cards */}
                {SHIFTS.map(shift => (
                  <ShiftCard
                    key={shift.type}
                    date={dateStr}
                    config={shift}
                    signups={getShiftSignups(dateStr, shift.type)}
                    closedDate={closed}
                    isAdmin={isAdmin}
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
