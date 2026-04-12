import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { format, parseISO, addDays } from 'date-fns';
import { Plus, Trash2, Calendar, TrendingUp, Clock } from 'lucide-react';
import Navbar from '../../components/Navbar';
import { useAuth } from '../../context/AuthContext';
import { useClosedDates } from '../../hook/useClosedDates';
import { supabase } from '../../lib/supabase';
import { Signup, Profile, SHIFTS } from '../../types';
import { toDateString } from '../../lib/dates';

interface VolStats {
  profile: Profile;
  total: number;
  fulfilled: number;
  pending: number;
}

interface OpenSlot {
  date: string;
  shiftType: string;
  open: number;
}

export default function Dashboard() {
  const { profile: adminProfile } = useAuth();
  const { closedDates, addClosedDate, removeClosedDate } = useClosedDates();

  const [stats, setStats]           = useState<VolStats[]>([]);
  const [openSlots, setOpenSlots]   = useState<OpenSlot[]>([]);
  const [newDate, setNewDate]       = useState('');
  const [newReason, setNewReason]   = useState('');
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    loadStats();
    loadOpenSlots();
  }, []);

  async function loadStats() {
    setLoadingStats(true);
    const [{ data: signupData }, { data: profileData }] = await Promise.all([
      supabase.from('signups').select('volunteer_id, is_fulfilled'),
      supabase.from('profiles').select('*').order('full_name'),
    ]);
    if (!profileData) { setLoadingStats(false); return; }

    const map: Record<string, VolStats> = {};
    (profileData as Profile[]).forEach(p => {
      map[p.id] = { profile: p, total: 0, fulfilled: 0, pending: 0 };
    });
    (signupData as Pick<Signup, 'volunteer_id' | 'is_fulfilled'>[] ?? []).forEach(s => {
      if (!map[s.volunteer_id]) return;
      map[s.volunteer_id].total++;
      if (s.is_fulfilled) map[s.volunteer_id].fulfilled++;
      else                map[s.volunteer_id].pending++;
    });

    setStats(Object.values(map).sort((a, b) => b.total - a.total));
    setLoadingStats(false);
  }

  async function loadOpenSlots() {
    // Collect weekday dates for the next 3 weeks
    const today = new Date();
    const dates: string[] = [];
    for (let i = 0; i < 21; i++) {
      const d   = addDays(today, i);
      const day = d.getDay();
      if (day >= 1 && day <= 5) dates.push(toDateString(d));
    }

    const [{ data: signupData }, { data: closedData }] = await Promise.all([
      supabase.from('signups').select('shift_date, shift_type').in('shift_date', dates),
      supabase.from('closed_dates').select('date').in('date', dates),
    ]);

    const closedSet = new Set<string>(
      (closedData ?? []).map((c: { date: string }) => c.date)
    );

    const countMap: Record<string, number> = {};
    (signupData ?? []).forEach((s: { shift_date: string; shift_type: string }) => {
      const k = `${s.shift_date}-${s.shift_type}`;
      countMap[k] = (countMap[k] ?? 0) + 1;
    });

    const open: OpenSlot[] = [];
    dates.forEach(date => {
      if (closedSet.has(date)) return;
      SHIFTS.forEach(shift => {
        const count = countMap[`${date}-${shift.type}`] ?? 0;
        if (count < shift.maxSlots) {
          open.push({ date, shiftType: shift.type, open: shift.maxSlots - count });
        }
      });
    });

    setOpenSlots(open.slice(0, 20));
  }

  async function handleAddClosed() {
    if (!newDate || !adminProfile) return;
    const ok = await addClosedDate(newDate, newReason, adminProfile.id);
    if (ok) { setNewDate(''); setNewReason(''); }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-10">
        <h1 className="text-2xl font-bold text-gray-800">Admin Dashboard</h1>

        {/* ── Volunteer stats ─────────────────────────────────────────────── */}
        <section>
          <h2 className="text-lg font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-indigo-500" />
            Volunteer Stats
          </h2>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {loadingStats ? (
              <div className="p-8 text-center text-gray-400 text-sm">Loading…</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                    <tr>
                      <th className="px-4 py-3 text-left">Volunteer</th>
                      <th className="px-4 py-3 text-center">Total Signups</th>
                      <th className="px-4 py-3 text-center">Fulfilled</th>
                      <th className="px-4 py-3 text-center">Pending</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {stats.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-4 py-6 text-center text-gray-400">
                          No volunteers yet.
                        </td>
                      </tr>
                    )}
                    {stats.map(({ profile, total, fulfilled, pending }) => (
                      <tr key={profile.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-800">{profile.full_name}</p>
                          <p className="text-xs text-gray-400">{profile.email}</p>
                        </td>
                        <td className="px-4 py-3 text-center font-semibold text-gray-700">
                          {total}
                        </td>
                        <td className="px-4 py-3 text-center font-semibold text-green-600">
                          {fulfilled}
                        </td>
                        <td className="px-4 py-3 text-center font-semibold text-orange-500">
                          {pending}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        {/* ── Upcoming open slots ─────────────────────────────────────────── */}
        <section>
          <h2 className="text-lg font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <Clock className="w-5 h-5 text-orange-500" />
            Upcoming Open Slots
            <span className="text-sm font-normal text-gray-400">(next 3 weeks)</span>
          </h2>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {openSlots.length === 0 ? (
              <p className="p-8 text-center text-gray-400 text-sm">
                All upcoming shifts are fully booked!
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                    <tr>
                      <th className="px-4 py-3 text-left">Date</th>
                      <th className="px-4 py-3 text-left">Shift</th>
                      <th className="px-4 py-3 text-center">Open Slots</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {openSlots.map(({ date, shiftType, open }) => (
                      <tr key={`${date}-${shiftType}`} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-700">
                          {format(parseISO(date), 'EEE, MMM d')}
                        </td>
                        <td className="px-4 py-3 capitalize text-gray-600">{shiftType}</td>
                        <td className="px-4 py-3 text-center">
                          <span className="bg-orange-100 text-orange-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                            {open} open
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link
                            to={`/shift/${date}/${shiftType}`}
                            className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                          >
                            View →
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        {/* ── Closed dates ────────────────────────────────────────────────── */}
        <section>
          <h2 className="text-lg font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-red-500" />
            Closed Dates (Holidays &amp; Closures)
          </h2>

          {/* Add form */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-4">
            <p className="text-sm font-medium text-gray-600 mb-3">Add a store closure</p>
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Date</label>
                <input
                  type="date"
                  value={newDate}
                  onChange={e => setNewDate(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
              <div className="flex-1 min-w-[160px]">
                <label className="block text-xs text-gray-500 mb-1">Reason (optional)</label>
                <input
                  type="text"
                  value={newReason}
                  onChange={e => setNewReason(e.target.value)}
                  placeholder="e.g. Thanksgiving, Winter Break"
                  className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
              <button
                disabled={!newDate}
                onClick={handleAddClosed}
                className="flex items-center gap-1.5 bg-red-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-40 transition-colors"
              >
                <Plus className="w-4 h-4" /> Close Date
              </button>
            </div>
          </div>

          {/* List */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {closedDates.length === 0 ? (
              <p className="p-6 text-center text-gray-400 text-sm">
                No closed dates configured.
              </p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {closedDates.map(cd => (
                  <li key={cd.id} className="flex items-center justify-between px-5 py-3">
                    <div>
                      <p className="text-sm font-medium text-gray-800">
                        {format(parseISO(cd.date), 'EEEE, MMMM d, yyyy')}
                      </p>
                      {cd.reason && (
                        <p className="text-xs text-gray-500">{cd.reason}</p>
                      )}
                    </div>
                    <button
                      onClick={() => removeClosedDate(cd.id)}
                      className="text-gray-400 hover:text-red-500 transition-colors p-1"
                      title="Remove closure"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
