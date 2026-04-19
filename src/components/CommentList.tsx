import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { Flag, Trash2, Send } from 'lucide-react';
import { useComments } from '../hook/useComments';
import { ShiftType } from '../types';
import { useAuth } from '../context/AuthContext';
import { sanitizeText, withinMaxLength } from '../lib/sanitize';

const COMMENT_MAX = 2000;

interface Props {
  shiftDate: string;
  shiftType: ShiftType;
}

export default function CommentList({ shiftDate, shiftType }: Props) {
  const { profile } = useAuth();
  const { comments, loading, addComment, deleteComment } = useComments(shiftDate, shiftType);
  const [content, setContent] = useState('');
  const [isCoverageRequest, setIsCoverageRequest] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;

    const clean = sanitizeText(content);
    if (!clean) return;
    if (!withinMaxLength(clean, COMMENT_MAX)) return; // blocked by maxLength attr, belt-and-suspenders

    setSubmitting(true);
    await addComment(profile.id, clean, isCoverageRequest);
    setContent('');
    setIsCoverageRequest(false);
    setSubmitting(false);
  }

  const charCount = content.length;
  const nearLimit = charCount > COMMENT_MAX * 0.9;

  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold text-gray-700 dark:text-gray-200">
        Comments &amp; Coverage Requests
      </h3>

      {/* ── Thread ────────────────────────────────────────────────────────── */}
      {loading ? (
        <p className="text-sm text-gray-400 dark:text-gray-500">Loading…</p>
      ) : comments.length === 0 ? (
        <p className="text-sm text-gray-400 dark:text-gray-500 italic">No comments yet.</p>
      ) : (
        <ul className="space-y-3">
          {comments.map(c => (
            <li
              key={c.id}
              className={`p-3 rounded-lg border text-sm ${
                c.is_coverage_request
                  ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                  : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {c.is_coverage_request && (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/40 px-2 py-0.5 rounded-full">
                        <Flag className="w-3 h-3" /> Coverage Needed
                      </span>
                    )}
                    <span className="font-semibold text-gray-800 dark:text-gray-100">{c.author.full_name}</span>
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      {format(parseISO(c.created_at), 'MMM d, h:mm a')}
                    </span>
                  </div>
                  <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words">{c.content}</p>
                </div>

                {(profile?.id === c.author_id || profile?.role === 'admin') && (
                  <button
                    onClick={() => deleteComment(c.id)}
                    className="flex-shrink-0 text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 transition-colors mt-0.5"
                    title="Delete comment"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* ── Post form ─────────────────────────────────────────────────────── */}
      {profile && (
        <form onSubmit={handleSubmit} className="space-y-2 pt-2 border-t border-gray-100 dark:border-gray-700">
          <div className="relative">
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Add a comment…"
              rows={3}
              maxLength={COMMENT_MAX}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
            />
            {charCount > 0 && (
              <span className={`absolute bottom-2 right-2 text-xs ${nearLimit ? 'text-orange-500' : 'text-gray-400'}`}>
                {charCount}/{COMMENT_MAX}
              </span>
            )}
          </div>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isCoverageRequest}
                onChange={e => setIsCoverageRequest(e.target.checked)}
                className="rounded border-gray-300 dark:border-gray-600 text-red-500 focus:ring-red-400"
              />
              <Flag className="w-3.5 h-3.5 text-red-500" />
              I need coverage for this shift
            </label>
            <button
              type="submit"
              disabled={!sanitizeText(content) || submitting}
              className="inline-flex items-center gap-1.5 bg-indigo-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-40 transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
              {submitting ? 'Posting…' : 'Post'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
