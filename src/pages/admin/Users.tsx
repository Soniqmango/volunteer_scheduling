import { useEffect, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { ChevronDown, ChevronRight } from 'lucide-react';
import Navbar from '../../components/Navbar';
import { supabase } from '../../lib/supabase';
import { Profile, Signup } from '../../types';

interface UserRow extends Profile {
  signups: Signup[];
}

export default function Users() {
  const [users, setUsers]       = useState<UserRow[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [{ data: profileData }, { data: signupData }] = await Promise.all([
        supabase.from('profiles').select('*').order('full_name'),
        supabase
          .from('signups')
          .select('*')
          .order('shift_date', { ascending: false }),
      ]);
      if (!profileData) { setLoading(false); return; }

      const allSignups = (signupData ?? []) as Signup[];
      const rows: UserRow[] = (profileData as Profile[]).map(p => ({
        ...p,
        signups: allSignups.filter(s => s.volunteer_id === p.id),
      }));
      setUsers(rows);
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-4">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Volunteers</h1>

        {loading ? (
          <div className="py-16 text-center text-gray-400 dark:text-gray-500">Loading…</div>
        ) : users.length === 0 ? (
          <div className="py-16 text-center text-gray-400 dark:text-gray-500">No users yet.</div>
        ) : (
          <div className="space-y-3">
            {users.map(user => {
              const isOpen    = expanded === user.id;
              const fulfilled = user.signups.filter(s => s.is_fulfilled).length;

              return (
                <div
                  key={user.id}
                  className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden"
                >
                  <button
                    className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
                    onClick={() => setExpanded(isOpen ? null : user.id)}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-sm flex-shrink-0">
                        {user.full_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-800 dark:text-gray-100 truncate">{user.full_name}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
                          {user.email} · <span className="capitalize">{user.role}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 flex-shrink-0">
                      <div className="text-right hidden sm:block">
                        <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                          {user.signups.length} signups
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">{fulfilled} fulfilled</p>
                      </div>
                      {isOpen ? (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                  </button>

                  {isOpen && (
                    <div className="border-t border-gray-100 dark:border-gray-700 px-5 py-4">
                      {user.signups.length === 0 ? (
                        <p className="text-sm text-gray-400 dark:text-gray-500 italic">No signups yet.</p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                              <tr>
                                <th className="text-left pb-2 pr-4">Date</th>
                                <th className="text-left pb-2 pr-4">Shift</th>
                                <th className="text-center pb-2">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                              {user.signups.map(s => (
                                <tr key={s.id}>
                                  <td className="py-2 pr-4 text-gray-700 dark:text-gray-300">
                                    {format(parseISO(s.shift_date), 'EEE, MMM d, yyyy')}
                                  </td>
                                  <td className="py-2 pr-4 capitalize text-gray-600 dark:text-gray-400">
                                    {s.shift_type}
                                  </td>
                                  <td className="py-2 text-center">
                                    {s.is_fulfilled ? (
                                      <span className="text-xs bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full font-medium">
                                        Fulfilled
                                      </span>
                                    ) : (
                                      <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded-full">
                                        Pending
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
