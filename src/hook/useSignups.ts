import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { Signup, ShiftType } from '../types';
import { toDateString } from '../lib/dates';

export function useSignups(weekDates: Date[]) {
  const [signups, setSignups] = useState<Signup[]>([]);
  const [loading, setLoading] = useState(true);

  // Stable string key so the effect only re-runs when the week changes
  const dateKey = weekDates.map(toDateString).join(',');

  useEffect(() => {
    const dateStrings = dateKey.split(',');

    async function fetchSignups() {
      setLoading(true);
      const { data, error } = await supabase
        .from('signups')
        .select('*, volunteer:profiles(*)')
        .in('shift_date', dateStrings)
        .order('created_at');
      if (!error && data) setSignups(data as Signup[]);
      setLoading(false);
    }

    fetchSignups();

    // Real-time: re-fetch whenever any signup changes
    const channel = supabase
      .channel(`signups-${dateKey}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'signups' }, fetchSignups)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [dateKey]);

  // ── Actions ─────────────────────────────────────────────────────────────

  async function signup(date: string, shiftType: ShiftType, volunteerId: string) {
    const { error } = await supabase
      .from('signups')
      .insert({ shift_date: date, shift_type: shiftType, volunteer_id: volunteerId });
    if (error) {
      const msg = error.message.includes('shift_full')
        ? 'This shift is already full.'
        : error.message.includes('unique') || error.message.includes('duplicate')
        ? 'You are already signed up for this shift.'
        : 'Could not sign up — please try again.';
      toast.error(msg);
      return false;
    }
    toast.success('Signed up!');
    return true;
  }

  async function cancelSignup(id: string) {
    const { error } = await supabase.from('signups').delete().eq('id', id);
    if (error) { toast.error('Could not cancel signup.'); return false; }
    toast.success('Signup cancelled.');
    return true;
  }

  async function markFulfilled(id: string, fulfilled: boolean) {
    const { error } = await supabase
      .from('signups')
      .update({
        is_fulfilled: fulfilled,
        fulfilled_at: fulfilled ? new Date().toISOString() : null,
      })
      .eq('id', id);
    if (error) { toast.error('Could not update status.'); return false; }
    toast.success(fulfilled ? 'Marked as fulfilled.' : 'Marked as pending.');
    return true;
  }

  // ── Selectors ────────────────────────────────────────────────────────────

  function getShiftSignups(date: string, shiftType: ShiftType): Signup[] {
    return signups.filter(
      s => s.shift_date === date && s.shift_type === shiftType
    );
  }

  return { signups, loading, signup, cancelSignup, markFulfilled, getShiftSignups };
}
