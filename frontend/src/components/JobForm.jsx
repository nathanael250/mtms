import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { apiFetch } from "../lib/api";
import { getUploadUrl } from "../lib/uploads";

const initialForm = { title: "", description: "", start_date: "", end_date: "" };
const emptyTaskAssignment = {
  title: "",
  description: "",
  assigned_to: "",
  start_date: "",
  due_date: "",
};

function toDateInput(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// The job form, used to add a job (mode "create") and to change everything about an
// existing one (mode "edit": details, documents and tasks). `job`, `tasks` and `attachments`
// describe the existing job in edit mode. `onDone(message)` is called after a successful save.
export default function JobForm({
  mode = "create",
  job = null,
  tasks = [],
  attachments = [],
  onDone,
  onCancel,
}) {
  const { token, user } = useAuth();
  const [staff, setStaff] = useState([]);
  const [notifyAdmins, setNotifyAdmins] = useState([]);
  const [form, setForm] = useState(
    job
      ? {
          title: job.title || "",
          description: job.description || "",
          start_date: toDateInput(job.start_date),
          end_date: toDateInput(job.end_date),
        }
      : initialForm
  );
  const [taskAssignments, setTaskAssignments] = useState(
    tasks.length
      ? tasks.map((task) => ({
          id: task.id,
          status: task.status,
          title: task.title || "",
          description: task.description || "",
          assigned_to: String(task.assigned_to || ""),
          start_date: toDateInput(task.start_date),
          due_date: toDateInput(task.due_date),
        }))
      : [emptyTaskAssignment]
  );
  const [removedTaskIds, setRemovedTaskIds] = useState([]);
  const [approvalFiles, setApprovalFiles] = useState([]);
  const [existingDocs, setExistingDocs] = useState(() => [
    ...(job?.approval_document
      ? [
          {
            key: "approval",
            kind: "approval",
            name: "Main document",
            url: getUploadUrl(job.approval_document),
          },
        ]
      : []),
    ...attachments.map((file) => ({
      key: `attachment-${file.id}`,
      kind: "attachment",
      id: file.id,
      name: file.file_name,
      url: getUploadUrl(file.file_path),
    })),
  ]);
  const [removedDocs, setRemovedDocs] = useState([]);
  const [notifyMessages, setNotifyMessages] = useState({});
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!token) return;
    apiFetch("/users/staff", { token })
      .then((data) => setStaff(data.users || []))
      .catch((loadError) => setError(loadError.message));
    if (mode === "create") {
      apiFetch("/users/mentionable", { token })
        .then((data) =>
          setNotifyAdmins((data.users || []).filter((person) => person.role === "admin"))
        )
        .catch(() => setNotifyAdmins([]));
    }
  }, [token, mode]);

  function updateTaskAssignment(index, field, value) {
    setTaskAssignments((current) =>
      current.map((task, taskIndex) =>
        taskIndex === index ? { ...task, [field]: value } : task
      )
    );
  }

  function addTaskAssignment() {
    setTaskAssignments((current) => [...current, { ...emptyTaskAssignment }]);
  }

  function removeTaskAssignment(index) {
    const task = taskAssignments[index];
    if (task?.id) {
      if (
        !window.confirm(
          `Delete the task "${task.title}"? Its reports and files will be deleted too.`
        )
      ) {
        return;
      }
      setRemovedTaskIds((current) => [...current, task.id]);
    }
    setTaskAssignments((current) =>
      current.length === 1
        ? [{ ...emptyTaskAssignment }]
        : current.filter((_, taskIndex) => taskIndex !== index)
    );
  }

  function removeExistingDoc(doc) {
    if (!window.confirm(`Delete the document "${doc.name}"?`)) return;
    setRemovedDocs((current) => [...current, doc]);
    setExistingDocs((current) => current.filter((item) => item.key !== doc.key));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      if (!form.title.trim()) {
        throw new Error("Job title is required.");
      }

      const validTaskAssignments = taskAssignments.filter(
        (task) => task.id || task.title.trim() || task.assigned_to || task.due_date
      );
      for (const task of validTaskAssignments) {
        if (!task.title.trim() || !task.assigned_to) {
          throw new Error("Each task assignment needs a task title and assigned staff member.");
        }
      }

      const formData = new FormData();
      Object.entries(form).forEach(([key, value]) => formData.append(key, value));
      if (mode === "create") formData.append("created_by", user.id);
      if (approvalFiles.length) {
        formData.append("related_type", "job");
        approvalFiles.forEach((file) => formData.append("files", file));
      }

      if (mode === "edit") {
        if (removedDocs.some((doc) => doc.kind === "approval")) {
          formData.append("remove_approval_document", "true");
        }
        await apiFetch(`/jobs/${job.id}`, { method: "PUT", token, body: formData });
        for (const doc of removedDocs.filter((item) => item.kind === "attachment")) {
          await apiFetch(`/attachments/${doc.id}`, { method: "DELETE", token });
        }
        for (const taskId of removedTaskIds) {
          await apiFetch(`/tasks/${taskId}`, { method: "DELETE", token });
        }
        for (const task of validTaskAssignments) {
          const body = {
            title: task.title,
            description: task.description,
            assigned_to: Number(task.assigned_to),
            start_date: task.start_date || form.start_date || null,
            due_date: task.due_date || form.end_date || null,
          };
          if (task.id) {
            await apiFetch(`/tasks/${task.id}`, { method: "PUT", token, body });
          } else {
            await apiFetch("/tasks", {
              method: "POST",
              token,
              body: { ...body, job_id: job.id, assigned_by: user.id },
            });
          }
        }
        onDone("Job updated successfully.");
        return;
      }

      const notifyIds = Object.keys(notifyMessages).map(Number);
      if (notifyIds.length) {
        const missing = notifyIds.find((id) => !notifyMessages[id]?.trim());
        if (missing) {
          const name = notifyAdmins.find((member) => member.id === missing)?.full_name;
          throw new Error(`Write the message for ${name || "each notified admin"}.`);
        }
        formData.append(
          "notifications",
          JSON.stringify(
            notifyIds.map((id) => ({ user_id: id, message: notifyMessages[id].trim() }))
          )
        );
      }

      const jobResponse = await apiFetch("/jobs", { method: "POST", token, body: formData });

      // One after the other, so the tasks keep their order and never lock each other.
      for (const task of validTaskAssignments) {
        await apiFetch("/tasks", {
          method: "POST",
          token,
          body: {
            job_id: jobResponse.job.id,
            title: task.title,
            description: task.description,
            assigned_by: user.id,
            assigned_to: Number(task.assigned_to),
            start_date: task.start_date || form.start_date || null,
            due_date: task.due_date || form.end_date || null,
          },
        });
      }

      const notified = jobResponse.notified || {};
      const notifyNote = notifyIds.length
        ? ` WhatsApp sent to ${notified.sent || 0} of ${notifyIds.length} notified admins${
            notified.failed || notified.no_phone || notified.disabled
              ? " (some could not be reached)"
              : ""
          }.`
        : "";
      onDone(
        (validTaskAssignments.length
          ? `Job created and ${validTaskAssignments.length} task${
              validTaskAssignments.length === 1 ? "" : "s"
            } assigned successfully.`
          : "Job created successfully.") + notifyNote
      );
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="mt-6" onSubmit={handleSubmit}>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-400">
              Job Details
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Basic project information and approval document.
            </p>
          </div>

          {[["title", "Title"]].map(([key, label]) => (
            <label key={key} className="block">
              <span className="mb-2 block text-sm font-medium text-slate-600">
                {label}
              </span>
              <input
                value={form[key]}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    [key]: event.target.value,
                  }))
                }
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[var(--brand-500)] focus:bg-white"
              />
            </label>
          ))}

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-600">
              Description
            </span>
            <textarea
              value={form.description}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
              rows="4"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[var(--brand-500)] focus:bg-white"
            />
          </label>

          <div className="grid gap-4 md:grid-cols-2">
            {[
              ["start_date", "Start Date"],
              ["end_date", "End Date"],
            ].map(([key, label]) => (
              <label key={key} className="block">
                <span className="mb-2 block text-sm font-medium text-slate-600">
                  {label}
                </span>
                <input
                  type="date"
                  value={form[key]}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      [key]: event.target.value,
                    }))
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[var(--brand-500)] focus:bg-white"
                />
              </label>
            ))}
          </div>

          <div className="block">
            <span className="mb-2 block text-sm font-medium text-slate-600">
              Documents
            </span>
            {existingDocs.length ? (
              <ul className="mb-2 space-y-1">
                {existingDocs.map((doc) => (
                  <li
                    key={doc.key}
                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-700"
                  >
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noreferrer"
                      className="truncate text-[var(--brand-700)] hover:underline"
                    >
                      {doc.name}
                    </a>
                    <button
                      type="button"
                      onClick={() => removeExistingDoc(doc)}
                      className="text-xs font-semibold text-red-600"
                    >
                      Delete
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            <input
              type="file"
              multiple
              onChange={(event) => {
                const picked = Array.from(event.target.files || []);
                setApprovalFiles((current) => [...current, ...picked]);
                event.target.value = "";
              }}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
            />
            <p className="mt-1 text-xs text-slate-500">
              You can add several documents; pick more to add to the list.
            </p>
            {approvalFiles.length > 0 && (
              <ul className="mt-2 space-y-1">
                {approvalFiles.map((file, index) => (
                  <li
                    key={`${file.name}-${index}`}
                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                  >
                    <span className="truncate">{file.name}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setApprovalFiles((current) =>
                          current.filter((_, i) => i !== index)
                        )
                      }
                      className="text-xs font-semibold text-red-600"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

        {mode === "create" ? (
        <div className="app-panel rounded-[24px] border border-slate-200 bg-white p-4">
          <h3 className="text-base font-semibold text-slate-900">
            Notify admins
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Tick an admin and write the message they will receive on WhatsApp about this job.
          </p>
          <div className="mt-3 max-h-72 space-y-2 overflow-y-auto">
            {notifyAdmins.map((member) => {
              const checked = member.id in notifyMessages;
              return (
                <div
                  key={member.id}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
                >
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(event) =>
                        setNotifyMessages((current) => {
                          const next = { ...current };
                          if (event.target.checked) next[member.id] = "";
                          else delete next[member.id];
                          return next;
                        })
                      }
                    />
                    <span className="truncate">{member.full_name}</span>
                  </label>
                  {checked && (
                    <textarea
                      rows={2}
                      value={notifyMessages[member.id]}
                      onChange={(event) =>
                        setNotifyMessages((current) => ({
                          ...current,
                          [member.id]: event.target.value,
                        }))
                      }
                      placeholder={`Message for ${member.full_name.split(" ")[0]} (why they are being notified)`}
                      className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[var(--brand-500)]"
                    />
                  )}
                </div>
              );
            })}
            {!notifyAdmins.length && (
              <p className="text-sm text-slate-500">
                No admin is set to receive requests yet. Tick "Can be asked for help" on an admin in Users.
              </p>
            )}
          </div>
        </div>
        ) : null}
        </div>

        <div className="app-panel rounded-[24px] border border-[var(--brand-100)] bg-[var(--brand-50)] p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                Assign Staff Tasks
              </h3>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Add tasks that must be done for this job and choose the staff member responsible.
              </p>
            </div>
            <button
              type="button"
              onClick={addTaskAssignment}
              className="inline-flex items-center gap-2 rounded-2xl bg-white px-3 py-2 text-xs font-semibold text-[var(--brand-700)] shadow-sm transition hover:bg-[var(--brand-100)]"
            >
              <Plus className="h-4 w-4" />
              Add Task
            </button>
          </div>

          <div className="mt-4 space-y-4">
            {taskAssignments.map((task, index) => (
              <div
                key={index}
                className="app-panel rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-900">
                    Task {index + 1}
                    {task.id ? (
                      <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-500">
                        {task.status || "existing"}
                      </span>
                    ) : null}
                  </p>
                  <button
                    type="button"
                    onClick={() => removeTaskAssignment(index)}
                    className="rounded-xl p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                    aria-label="Remove task assignment"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="grid gap-3">
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-600">
                      Task to be done
                    </span>
                    <input
                      value={task.title}
                      onChange={(event) =>
                        updateTaskAssignment(
                          index,
                          "title",
                          event.target.value
                        )
                      }
                      placeholder="Example: Prepare camera equipment"
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[var(--brand-500)] focus:bg-white"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-600">
                      Assign to staff
                    </span>
                    <select
                      value={task.assigned_to}
                      onChange={(event) =>
                        updateTaskAssignment(
                          index,
                          "assigned_to",
                          event.target.value
                        )
                      }
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[var(--brand-500)] focus:bg-white"
                    >
                      <option value="">Select staff member</option>
                      {staff.map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.full_name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-600">
                      Task note
                    </span>
                    <textarea
                      value={task.description}
                      onChange={(event) =>
                        updateTaskAssignment(
                          index,
                          "description",
                          event.target.value
                        )
                      }
                      rows="2"
                      placeholder="Describe what the staff member should do."
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[var(--brand-500)] focus:bg-white"
                    />
                  </label>

                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-slate-600">
                        Start Date
                      </span>
                      <input
                        type="date"
                        value={task.start_date}
                        onChange={(event) =>
                          updateTaskAssignment(
                            index,
                            "start_date",
                            event.target.value
                          )
                        }
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[var(--brand-500)] focus:bg-white"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-slate-600">
                        Due Date
                      </span>
                      <input
                        type="date"
                        value={task.due_date}
                        onChange={(event) =>
                          updateTaskAssignment(
                            index,
                            "due_date",
                            event.target.value
                          )
                        }
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[var(--brand-500)] focus:bg-white"
                      />
                    </label>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {error ? (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      ) : null}

      <div className="mt-6 flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-2xl bg-[var(--brand-700)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--brand-600)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Saving..." : mode === "edit" ? "Save changes" : "Save Job"}
        </button>
      </div>
    </form>
  );
}
