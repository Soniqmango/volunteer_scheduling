import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Sun, Sunset } from 'lucide-react';
import { parseISO, isValid } from 'date-fns';
import Navbar from '../components/Navbar';
import SlotRow from '../components/SlotRow';
import CommentList from '../components/CommentList';
import { useAuth } from '../context/AuthContext';
import { useSignups } from '../hook/useSignups';
import { ShiftType, SHIFTS, Profile } from '../types';
import { formatDayHeader, toDateString } from '../lib/dates';
import { supabase } from '../lib/supabase';

export default function ShiftDetail() {
  const { date, type } = useParams<{ date: string; type: string }>();
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';

  const parsedDate  = date ? parseISO(date) : null;
  const validDate   = parsedDate && isValid(parsedDate) ? parsedDate : null;
  const shiftType   = type === 'morning' || type === 'afternoon' ? (type as ShiftType) : null;
  const config      = SHIFTS.find(s => s.type === shiftType);

  const { getShiftSignups, signup, cancelSignup, markFulfilled } = useSignups(
    validDate ? [validDate] : []
  );

  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
  useEffect(() => {
    if (!isAdmin) return;
    supabase
      .from('profiles')
      .select('*')
      .order('full_name')
      .then(({ data }) => { if (data) setAllProfiles(data as Profile[]); });
  }, [isAdmin]);

  const signups = date && shiftType ? getShiftSignups(date, shiftType) : [];
  const isPast  = !!date && date < toDateString(new Date());

  if (!validDate || !shiftType || !config) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navbar />
        <div className="max-w-xl mx-auto p-8 text-center text-gray-500 dark:text-gray-400">
          Invalid shift URL.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-5">
        <Link
          to="/schedule"
          className="inline-flex items-center gap-1.5 text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to schedule
        </Link>

        <div
          className={`rounded-xl p-5 ${
            shiftType === 'morning'
              ? 'bg-sky-50 dark:bg-sky-900/20 border border-sky-200 dark:border-sky-800'
              : 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800'
          }`}
        >
          <div className="flex items-center gap-2 mb-1">
            {shiftType === 'morning' ? (
              <Sun className="w-5 h-5 text-sky-500" />
            ) : (
              <Sunset className="w-5 h-5 text-amber-500" />
            )}
            <h1 className="text-lg font-bold text-gray-800 dark:text-gray-100">
              {config.label} Shift – {formatDayHeader(validDate)}
            </h1>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 ml-7">{config.time}</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5 space-y-3">
          <h2 className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
            Volunteers ({signups.length}/{config.maxSlots})
          </h2>
          {Array.from({ length: config.maxSlots }, (_, i) => (
            <SlotRow
              key={signups[i]?.id ?? `empty-${i}`}
              signup={signups[i] ?? null}
              slotIndex={i}
              isAdmin={isAdmin}
              isOwnSlot={signups[i]?.volunteer_id === profile?.id}
              isPast={isPast}
              allProfiles={allProfiles}
              onSignup={() => signup(date!, shiftType, profile?.id ?? '')}
              onCancel={cancelSignup}
              onFulfill={markFulfilled}
              onAdminAdd={volId => signup(date!, shiftType, volId)}
            />
          ))}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5">
          <CommentList shiftDate={date!} shiftType={shiftType} />
        </div>
      </div>
    </div>
  );
}
