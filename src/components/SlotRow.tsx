import { useState } from 'react';
import { X, CheckCircle2, Circle, UserPlus } from 'lucide-react';
import { Profile, Signup } from '../types';

interface Props {
  signup: Signup | null;
  slotIndex: number;
  isAdmin: boolean;
  isOwnSlot: boolean;
  isPast: boolean;
  allProfiles: Profile[];
  onSignup: () => void;
  onCancel: (id: string) => void;
  onFulfill: (id: string, fulfilled: boolean) => void;
  onAdminAdd: (volunteerId: string) => void;
}

export default function SlotRow({
  signup,
  slotIndex,
  isAdmin,
  isOwnSlot,
  isPast,
  allProfiles,
  onSignup,
  onCancel,
  onFulfill,
  onAdminAdd,
}: Props) {
  const [showAdminAdd, setShowAdminAdd] = useState(false);
  const [selectedVolId, setSelectedVolId] = useState('');

  function handleCancel() {
    const name = signup?.volunteer.full_name ?? 'this volunteer';
    const msg  = isOwnSlot
      ? 'Cancel your signup for this shift?'
      : `Remove ${name} from this shift?`;
    if (window.confirm(msg)) onCancel(signup!.id);
  }

  // ── Filled slot ──────────────────────────────────────────────────────────
  if (signup) {
    return (
      <div
        className={`flex items-center justify-between px-3 py-2 rounded-lg border ${
          signup.is_fulfilled
            ? 'bg-green-50 border-green-200'
            : 'bg-white border-gray-200'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-semibold flex-shrink-0">
            {signup.volunteer.full_name.charAt(0).toUpperCase()}
          </span>
          <span className="text-sm font-medium text-gray-800 truncate">
            {signup.volunteer.full_name}
          </span>
          {signup.is_fulfilled && (
            <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-medium whitespace-nowrap">
              Done
            </span>
          )}
        </div>

        <div className="flex items-center gap-0.5 flex-shrink-0">
          {/* Admin can always mark fulfilled (past or not) */}
          {isAdmin && (
            <button
              onClick={() => onFulfill(signup.id, !signup.is_fulfilled)}
              className="p-1 text-gray-400 hover:text-green-600 transition-colors"
              title={signup.is_fulfilled ? 'Mark pending' : 'Mark fulfilled'}
            >
              {signup.is_fulfilled ? (
                <CheckCircle2 className="w-4 h-4 text-green-500" />
              ) : (
                <Circle className="w-4 h-4" />
              )}
            </button>
          )}
          {/* Volunteers can't cancel past shifts; admins always can */}
          {(isOwnSlot && !isPast || isAdmin) && (
            <button
              onClick={handleCancel}
              className="p-1 text-gray-400 hover:text-red-500 transition-colors"
              title="Cancel signup"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── Empty slot ───────────────────────────────────────────────────────────
  return (
    <div className="flex items-center justify-between px-3 py-2 rounded-lg border border-dashed border-gray-300 bg-gray-50">
      <span className="text-sm text-gray-400">
        {isPast && !isAdmin ? 'Slot unfilled' : `Slot ${slotIndex + 1} – Open`}
      </span>

      {/* Past shift: volunteers see nothing; admins can still add for record-keeping */}
      {isPast && !isAdmin ? null : isAdmin ? (
        showAdminAdd ? (
          <div className="flex items-center gap-1.5">
            <select
              value={selectedVolId}
              onChange={e => setSelectedVolId(e.target.value)}
              className="text-xs border border-gray-300 rounded px-1.5 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400 max-w-[130px]"
            >
              <option value="">Select…</option>
              {allProfiles.map(p => (
                <option key={p.id} value={p.id}>
                  {p.full_name}
                </option>
              ))}
            </select>
            <button
              disabled={!selectedVolId}
              onClick={() => {
                if (selectedVolId) {
                  onAdminAdd(selectedVolId);
                  setShowAdminAdd(false);
                  setSelectedVolId('');
                }
              }}
              className="text-xs bg-indigo-600 text-white px-2 py-1 rounded disabled:opacity-40 hover:bg-indigo-700 transition-colors"
            >
              Add
            </button>
            <button
              onClick={() => { setShowAdminAdd(false); setSelectedVolId(''); }}
              className="text-xs text-gray-400 hover:text-gray-600 px-1"
            >
              ✕
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowAdminAdd(true)}
            className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
          >
            <UserPlus className="w-3.5 h-3.5" /> Add
          </button>
        )
      ) : (
        <button
          onClick={onSignup}
          className="text-xs bg-indigo-600 text-white px-3 py-1 rounded-full font-medium hover:bg-indigo-700 transition-colors"
        >
          Sign Up
        </button>
      )}
    </div>
  );
}
