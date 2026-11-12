import { useState } from "react";
import { MessageSquare } from "lucide-react";
import { apiFetch } from "../lib/api";

// Staff answer to the comments an admin wrote on their plan. The reply joins the same thread.
export default function ReplyBox({ token, planDate, taskId, onSent }) {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    if (!message.trim() || isSending) return;
    setIsSending(true);
    setError("");
    try {
      await apiFetch("/daily-tasks/comments/reply", {
        method: "POST",
        token,
        body: taskId
          ? { daily_task_id: taskId, message: message.trim() }
          : { date: planDate, message: message.trim() },
      });
      setMessage("");
      setIsOpen(false);
      onSent();
    } catch (sendError) {
      setError(sendError.message);
    } finally {
      setIsSending(false);
    }
  }

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="mt-2 inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-white px-3 py-1.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-50"
      >
        <MessageSquare className="h-3.5 w-3.5" />
        Reply
      </button>
    );
  }

  return (
    <div className="mt-2">
      <textarea
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        rows={3}
        maxLength={1000}
        placeholder="Write your reply..."
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[var(--brand-500)]"
      />
      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={submit}
          disabled={isSending || !message.trim()}
          className="rounded-xl bg-[var(--brand-700)] px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
        >
          {isSending ? "Sending..." : "Send reply"}
        </button>
        <button
          type="button"
          onClick={() => {
            setIsOpen(false);
            setError("");
          }}
          className="rounded-xl border border-slate-200 bg-white px-4 py-1.5 text-xs font-medium text-slate-600"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
