import { Link } from 'react-router-dom';
import { Sun, Sunset, MessageSquare, AlertCircle } from 'lucide-react';
import { Signup, ShiftConfig, Profile, ClosedDate, ShiftType } from '../types';
import SlotRow from './SlotRow';

interface Props {
  date: string;
  config: ShiftConfig;
  signups: Signup[];
  closedDate: ClosedDate | undefined;
  isAdmin: boolean;
  isToday: boolean;
  isPast: boolean;
  currentUserId: string;
  allProfiles: Profile[];
  coverageCount: number;
  onSignup: (date: string, shiftType: ShiftType, volunteerId: string) => void;
  onCancel: (id: string) => void;
  onFulfill: (id: string, fulfilled: boolean) => void;
  onAdminAdd: (date: string, shiftType: ShiftType, volunteerId: string) => void;
}

export default function ShiftCard({
  date,
  config,
  signups,
  closedDate,
  isAdmin,
  isToday,
  isPast,
  currentUserId,
  allProfiles,
  coverageCount,
  onSignup,
  onCancel,
  onFulfill,
  onAdminAdd,
}: Props) {
  const filled = signups.length;
  const isFull = filled >= config.maxSlots;

  // ── Closed day ───────────────────────────────────────────────────────────
  if (closedDate) {
    return (
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 p-3 opacity-60">
        <div className="flex items-center gap-1.5 mb-1">
          {config.type === 'morning' ? (
            <Sun className="w-4 h-4 text-gray-400" />
          ) : (
            <Sunset className="w-4 h-4 text-gray-400" />
          )}
          <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">{config.label}</span>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400">{closedDate.reason ?? 'Store Closed'}</p>
      </div>
    );
  }

  const slotSignups = Array.from(
    { length: config.maxSlots },
    (_, i) => signups[i] ?? null
  );

  return (
    <div className={`rounded-xl border shadow-sm ${
      isPast && !isToday
        ? 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 opacity-75'
        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
    }`}>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div
        className={`flex items-center justify-between px-3 pt-3 pb-2 rounded-t-xl ${
          isPast && !isToday
            ? 'bg-gray-100 dark:bg-gray-700'
            : config.type === 'morning'
            ? 'bg-sky-50 dark:bg-sky-900/20'
            : 'bg-amber-50 dark:bg-amber-900/20'
        }`}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          {config.type === 'morning' ? (
            <Sun className={`w-4 h-4 flex-shrink-0 ${isPast && !isToday ? 'text-gray-400' : 'text-sky-500'}`} />
          ) : (
            <Sunset className={`w-4 h-4 flex-shrink-0 ${isPast && !isToday ? 'text-gray-400' : 'text-amber-500'}`} />
          )}
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">{config.label}</span>
          <span className="text-xs text-gray-500 dark:text-gray-400 hidden lg:inline">{config.time}</span>
          {isPast && !isToday && (
            <span className="text-xs text-gray-400 font-normal">· Past</span>
          )}
        </div>
        <span
          className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${
            isFull
              ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400'
              : 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-400'
          }`}
        >
          {filled}/{config.maxSlots}
        </span>
      </div>

      {/* ── Slots ──────────────────────────────────────────────────────────── */}
      <div className="px-3 py-2 space-y-2">
        {slotSignups.map((signup, i) => (
          <SlotRow
            key={signup?.id ?? `empty-${i}`}
            signup={signup}
            slotIndex={i}
            isAdmin={isAdmin}
            isOwnSlot={signup?.volunteer_id === currentUserId}
            isPast={isPast && !isToday}
            allProfiles={allProfiles}
            onSignup={() => onSignup(date, config.type, currentUserId)}
            onCancel={onCancel}
            onFulfill={onFulfill}
            onAdminAdd={volId => onAdminAdd(date, config.type, volId)}
          />
        ))}
      </div>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <div className="px-3 pb-3 pt-1 flex items-center justify-between">
        <Link
          to={`/shift/${date}/${config.type}`}
          className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          Comments
        </Link>
        {coverageCount > 0 && (
          <span className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400 font-semibold">
            <AlertCircle className="w-3.5 h-3.5" />
            {coverageCount} coverage{coverageCount > 1 ? ' requests' : ' request'}
          </span>
        )}
      </div>
    </div>
  );
}
