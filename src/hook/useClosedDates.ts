import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { ClosedDate } from '../types';

export function useClosedDates() {
  const [closedDates, setClosedDates] = useState<ClosedDate[]>([]);
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    async function fetch() {
      setLoading(true);
      const { data, error } = await supabase
        .from('closed_dates')
        .select('*')
        .order('date');
      if (!error && data) setClosedDates(data as ClosedDate[]);
      setLoading(false);
    }

    fetch();

    const channel = supabase
      .channel('closed-dates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'closed_dates' }, fetch)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  async function addClosedDate(date: string, reason: string, createdBy: string) {
    const { error } = await supabase
      .from('closed_dates')
      .insert({ date, reason: reason || null, created_by: createdBy });
    if (error) {
      toast.error(
        error.message.includes('unique') ? 'That date is already closed.' : 'Could not close date.'
      );
      return false;
    }
    toast.success('Date closed.');
    return true;
  }

  async function removeClosedDate(id: string) {
    const { error } = await supabase.from('closed_dates').delete().eq('id', id);
    if (error) { toast.error('Could not remove closure.'); return false; }
    toast.success('Closure removed.');
    return true;
  }

  /** O(1) lookup: is a given 'YYYY-MM-DD' string closed? */
  function getClosedDate(dateStr: string): ClosedDate | undefined {
    return closedDates.find(cd => cd.date === dateStr);
  }

  return { closedDates, loading, addClosedDate, removeClosedDate, getClosedDate };
}
