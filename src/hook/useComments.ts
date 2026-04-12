import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { Comment, ShiftType } from '../types';

export function useComments(shiftDate: string, shiftType: ShiftType) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    async function fetchComments() {
      setLoading(true);
      const { data, error } = await supabase
        .from('comments')
        .select('*, author:profiles(*)')
        .eq('shift_date', shiftDate)
        .eq('shift_type', shiftType)
        .order('created_at');
      if (!error && data) setComments(data as Comment[]);
      setLoading(false);
    }

    fetchComments();

    const channel = supabase
      .channel(`comments-${shiftDate}-${shiftType}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'comments' },
        fetchComments
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [shiftDate, shiftType]);

  async function addComment(
    authorId: string,
    content: string,
    isCoverageRequest: boolean
  ) {
    const { error } = await supabase.from('comments').insert({
      shift_date: shiftDate,
      shift_type: shiftType,
      author_id: authorId,
      content,
      is_coverage_request: isCoverageRequest,
    });
    if (error) { toast.error('Could not post comment.'); return false; }
    return true;
  }

  async function deleteComment(id: string) {
    const { error } = await supabase.from('comments').delete().eq('id', id);
    if (error) { toast.error('Could not delete comment.'); return false; }
    toast.success('Comment deleted.');
    return true;
  }

  const coverageRequests = comments.filter(c => c.is_coverage_request);

  return { comments, coverageRequests, loading, addComment, deleteComment };
}
