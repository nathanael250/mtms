import { useEffect, useState } from "react";
import { CheckCircle2, Paperclip, X } from "lucide-react";
import DashboardLayout from "../../components/DashboardLayout";
import AttachmentLinks from "../../components/AttachmentLinks";
import FilePicker from "../../components/FilePicker";
import { useAuth } from "../../context/AuthContext";
import { apiFetch } from "../../lib/api";
import { ACCEPTED_FILE_TYPES, uploadMentionFiles } from "../../lib/uploads";

function formatDateTime(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

const whatsappNotes = {
  sent: (name) => `${name} was notified on WhatsApp.`,
  no_phone: (name) =>
    `${name} has no phone number saved, so they were not messaged on WhatsApp, but they can see your reply in My Mentions.`,
  disabled: () =>
    "WhatsApp messages are turned off on the server, so no message was sent. The reply is saved.",
  failed: (name) =>
    `The WhatsApp message to ${name} failed to send. Your reply is saved and visible in My Mentions.`,
  not_needed: () => "",
};

export default function MentionsPage() {
  const { token, user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [tab, setTab] = useState("assigned");
  const [mentions, setMentions] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [resolving, setResolving] = useState(null);
  const [resolveMessage, setResolveMessage] = useState("");
  const [resolveFiles, setResolveFiles] = useState([]);
  const [isResolving, setIsResolving] = useState(false);
  const [resolveError, setResolveError] = useState("");
  const [uploadingId, setUploadingId] = useState(null);

  async function loadMentions() {
    try {
      let endpoint = "/report-mentions";
      if (!isAdmin) {
        endpoint =
          tab === "assigned"
            ? "/report-mentions/assigned-to-me"
            : "/report-mentions/my-created";
      }
      const data = await apiFetch(endpoint, { token });
      setMentions(data.mentions || []);
    } catch (loadError) {
      setError(loadError.message);
    }
  }

  useEffect(() => {
    loadMentions();
  }, [token, user, tab]);

  async function markRead(id) {
    setError("");
    try {
      await apiFetch(`/report-mentions/${id}/read`, { method: "PATCH", token });
      loadMentions();
    } catch (actionError) {
      setError(actionError.message);
    }
  }

  function openResolve(mention) {
    setResolving(mention);
    setResolveMessage("");
    setResolveFiles([]);
    setResolveError("");
  }

  async function submitResolve(event) {
    event.preventDefault();
    setIsResolving(true);
    setResolveError("");

    try {
      // Documents first, so the WhatsApp message to the tagger can say how many were attached.
      // Each uploaded file leaves the list, so a retry never uploads it twice.
      for (const file of [...resolveFiles]) {
        await uploadMentionFiles(token, resolving.id, [file]);
        setResolveFiles((current) => current.filter((item) => item !== file));
      }

      const result = await apiFetch(`/report-mentions/${resolving.id}/resolve`, {
        method: "PATCH",
        token,
        body: { message: resolveMessage },
      });

      const name = resolving.mentioned_by_name || "The person who tagged you";
      setSuccess(
        `Mention resolved. ${(whatsappNotes[result.whatsapp] || whatsappNotes.not_needed)(name)}`.trim()
      );
      setResolving(null);
      loadMentions();
    } catch (submitError) {
      setResolveError(submitError.message);
    } finally {
      setIsResolving(false);
    }
  }

  async function addTagDocument(mention, event) {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (!files.length) return;

    setError("");
    setSuccess("");
    setUploadingId(mention.id);
    try {
      await uploadMentionFiles(token, mention.id, files);
      await loadMentions();
    } catch (uploadError) {
      setError(uploadError.message);
    } finally {
      setUploadingId(null);
    }
  }

  const showingCreated = !isAdmin && tab === "created";

  return (
    <DashboardLayout
      title={isAdmin ? "Mentions Overview" : "My Mentions"}
      description={
        isAdmin
          ? "Monitor report tags, documents and replies."
          : "Tags assigned to you, and the tags you created with their replies."
      }
    >
      {error ? (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      ) : null}
      {success ? (
        <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
          {success}
        </div>
      ) : null}

      {!isAdmin ? (
        <div className="mb-4 flex gap-2">
          {[
            ["assigned", "Assigned to me"],
            ["created", "Tags I created"],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                setTab(key);
                setSuccess("");
              }}
              className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                tab === key
                  ? "bg-[var(--brand-700)] text-white"
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      ) : null}

      <section className="app-panel rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="space-y-4">
          {mentions.map((mention) => {
            const tagFiles = (mention.files || []).filter((file) => file.stage === "tag");
            const resolutionFiles = (mention.files || []).filter(
              (file) => file.stage === "resolution"
            );
            const isResolved = mention.status === "resolved";

            return (
              <div
                key={mention.id}
                className={`app-panel rounded-2xl border p-4 ${
                  isResolved ? "border-emerald-100 bg-emerald-50/40" : "border-slate-100 bg-slate-50"
                }`}
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-900">
                      {mention.mentioned_by_name || "Staff"} mentioned{" "}
                      {mention.mentioned_user_name || "staff"}
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">
                      {mention.message}
                    </p>
                    {tagFiles.length ? (
                      <div className="mt-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                          Documents from {mention.mentioned_by_name}
                        </p>
                        <AttachmentLinks files={tagFiles} />
                      </div>
                    ) : null}
                    <p className="mt-2 text-xs text-slate-500">
                      {formatDateTime(mention.created_at)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-start gap-2">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                        isResolved
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-[var(--brand-100)] text-[var(--brand-700)]"
                      }`}
                    >
                      {mention.status}
                    </span>
                    {!isAdmin && !showingCreated && mention.status === "unread" ? (
                      <button
                        type="button"
                        onClick={() => markRead(mention.id)}
                        className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600"
                      >
                        Mark Read
                      </button>
                    ) : null}
                    {!isAdmin && !showingCreated && !isResolved ? (
                      <button
                        type="button"
                        onClick={() => openResolve(mention)}
                        className="rounded-xl bg-[var(--brand-700)] px-3 py-2 text-xs font-semibold text-white"
                      >
                        Resolve
                      </button>
                    ) : null}
                    {showingCreated && !isResolved ? (
                      <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">
                        <Paperclip className="h-3.5 w-3.5" />
                        {uploadingId === mention.id ? "Uploading..." : "Add document"}
                        <input
                          type="file"
                          multiple
                          accept={ACCEPTED_FILE_TYPES}
                          disabled={uploadingId === mention.id}
                          onChange={(event) => addTagDocument(mention, event)}
                          className="sr-only"
                        />
                      </label>
                    ) : null}
                  </div>
                </div>

                {isResolved ? (
                  <div className="mt-4 rounded-xl border border-emerald-100 bg-white p-3">
                    <p className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Resolved by {mention.mentioned_user_name}
                      {mention.resolved_at ? ` · ${formatDateTime(mention.resolved_at)}` : ""}
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
                      {mention.resolution_message || "No message was added."}
                    </p>
                    <AttachmentLinks files={resolutionFiles} />
                  </div>
                ) : null}
              </div>
            );
          })}
          {!mentions.length ? (
            <p className="text-sm text-slate-500">No mentions found yet.</p>
          ) : null}
        </div>
      </section>

      {resolving ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 px-4">
          <form
            onSubmit={submitResolve}
            className="app-panel max-h-[90vh] w-full max-w-xl space-y-4 overflow-y-auto rounded-[30px] border border-slate-200 bg-white p-6 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Resolve mention</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {resolving.mentioned_by_name} will get your reply on WhatsApp and can see your
                  documents in My Mentions.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setResolving(null)}
                className="rounded-2xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Their message
              </p>
              <p className="mt-1 whitespace-pre-wrap">{resolving.message}</p>
            </div>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-600">
                Your message (optional)
              </span>
              <textarea
                value={resolveMessage}
                onChange={(event) => setResolveMessage(event.target.value)}
                rows="4"
                maxLength={2000}
                placeholder="What was done, or what they should know..."
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-[var(--brand-500)] focus:bg-white"
              />
            </label>

            <FilePicker
              files={resolveFiles}
              onChange={setResolveFiles}
              label="Documents (optional)"
            />

            {resolveError ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                {resolveError}
              </div>
            ) : null}

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setResolving(null)}
                className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isResolving}
                className="rounded-2xl bg-[var(--brand-700)] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
              >
                {isResolving ? "Resolving..." : "Resolve and notify"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </DashboardLayout>
  );
}
