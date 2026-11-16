import { useEffect, useRef, useState } from "react";
import { Copy, ExternalLink, FileText, Film, Folder, Music, Trash2, Upload } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { apiFetch } from "../lib/api";
import { STAFF_FILE_ACCEPT, STAFF_FILE_MAX_MB } from "../lib/uploads";

function formatSize(bytes) {
  const value = Number(bytes || 0);
  if (value >= 1024 * 1024) return `${(value / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(value / 1024))} KB`;
}

function formatDate(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function FileIcon({ mime }) {
  const className = "h-5 w-5 text-[var(--brand-600)]";
  if (String(mime).startsWith("video/")) return <Film className={className} />;
  if (String(mime).startsWith("audio/")) return <Music className={className} />;
  return <FileText className={className} />;
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const field = document.createElement("textarea");
    field.value = text;
    document.body.appendChild(field);
    field.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(field);
    return ok;
  }
}

// Staff: their own Google Drive folder with upload. Admin: pick a staff member, see their files.
export default function StaffFolderPanel() {
  const { token, user } = useAuth();
  const isAdmin = user?.role === "admin";
  const fileInput = useRef(null);
  const [folders, setFolders] = useState([]);
  const [selectedId, setSelectedId] = useState(isAdmin ? null : user?.id);
  const [files, setFiles] = useState([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [uploading, setUploading] = useState("");

  async function loadFolders() {
    try {
      const data = await apiFetch("/staff-files/folders", { token });
      setFolders(data.folders || []);
    } catch (loadError) {
      setError(loadError.message);
    }
  }

  async function loadFiles(id = selectedId) {
    if (!id) {
      setFiles([]);
      return;
    }
    try {
      const data = await apiFetch(
        isAdmin ? `/staff-files?user_id=${id}` : "/staff-files",
        { token }
      );
      setFiles(data.files || []);
    } catch (loadError) {
      setError(loadError.message);
    }
  }

  useEffect(() => {
    if (token && isAdmin) loadFolders();
  }, [token, isAdmin]);

  useEffect(() => {
    if (token) loadFiles();
  }, [token, selectedId]);

  async function handleUpload(event) {
    const picked = Array.from(event.target.files || []);
    event.target.value = "";
    setError("");
    setNotice("");

    for (const [index, file] of picked.entries()) {
      if (file.size > STAFF_FILE_MAX_MB * 1024 * 1024) {
        setError(`${file.name} is larger than ${STAFF_FILE_MAX_MB} MB.`);
        continue;
      }
      setUploading(`Uploading ${file.name} (${index + 1} of ${picked.length})... please wait`);
      try {
        const formData = new FormData();
        formData.append("file", file);
        await apiFetch("/staff-files", { method: "POST", token, body: formData });
        setNotice(`${file.name} was saved in your folder. Use Copy link to share it.`);
      } catch (uploadError) {
        setError(`${file.name}: ${uploadError.message}`);
      }
    }
    setUploading("");
    loadFiles();
  }

  async function handleCopy(file) {
    const ok = await copyText(file.drive_url);
    setError("");
    setNotice(ok ? `Link to ${file.file_name} copied.` : "Could not copy the link.");
  }

  async function handleDelete(file) {
    if (!window.confirm(`Delete "${file.file_name}"? It will also be removed from Google Drive.`)) {
      return;
    }
    try {
      await apiFetch(`/staff-files/${file.id}`, { method: "DELETE", token });
      loadFiles();
      if (isAdmin) loadFolders();
    } catch (deleteError) {
      setError(deleteError.message);
    }
  }

  const selectedFolder = folders.find((folder) => folder.id === selectedId);

  return (
    <div className="grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
      {isAdmin ? (
        <aside className="app-panel rounded-[8px] border border-slate-200 bg-white p-3 shadow-sm">
          <p className="px-2 pb-2 text-xs font-bold uppercase tracking-wide text-slate-400">
            Staff folders
          </p>
          <div className="max-h-[70vh] space-y-1 overflow-y-auto">
            {folders.map((folder) => (
              <button
                key={folder.id}
                type="button"
                onClick={() => setSelectedId(folder.id)}
                className={`flex w-full items-center gap-2 rounded-[8px] px-3 py-2 text-left text-sm ${
                  selectedId === folder.id
                    ? "bg-[var(--brand-600)] font-semibold text-white"
                    : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                <Folder className="h-4 w-4 shrink-0" />
                <span className="min-w-0 flex-1 truncate">{folder.full_name}</span>
                <span className="text-xs opacity-70">{folder.file_count}</span>
              </button>
            ))}
            {!folders.length ? (
              <p className="px-3 py-4 text-sm text-slate-500">No staff yet.</p>
            ) : null}
          </div>
        </aside>
      ) : null}

      <section className="app-panel rounded-[8px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-950">
              {isAdmin
                ? selectedFolder
                  ? `${selectedFolder.full_name}'s folder`
                  : "Select a staff member"
                : "My Folder"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {isAdmin
                ? "Open a file to view it in Google Drive."
                : "Upload a file, then press Copy link and paste it as the Reference file in a report or when finishing a task."}
            </p>
          </div>
          {!isAdmin ? (
            <>
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                disabled={Boolean(uploading)}
                className="inline-flex items-center gap-2 rounded-[8px] bg-[var(--brand-700)] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
              >
                <Upload className="h-4 w-4" />
                Upload files
              </button>
              <input
                ref={fileInput}
                type="file"
                multiple
                accept={STAFF_FILE_ACCEPT}
                onChange={handleUpload}
                className="sr-only"
              />
            </>
          ) : null}
        </div>

        {uploading ? (
          <p className="mt-4 rounded-[8px] border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700">
            {uploading}
          </p>
        ) : null}
        {error ? (
          <p className="mt-4 rounded-[8px] border border-red-200 bg-red-50 p-3 text-sm text-red-600">
            {error}
          </p>
        ) : null}
        {notice ? (
          <p className="mt-4 rounded-[8px] border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
            {notice}
          </p>
        ) : null}

        <div className="mt-5 space-y-2">
          {files.map((file) => (
            <div
              key={file.id}
              className="flex flex-wrap items-center gap-3 rounded-[8px] border border-slate-100 bg-slate-50 px-4 py-3"
            >
              <FileIcon mime={file.mime_type} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-900">{file.file_name}</p>
                <p className="text-xs text-slate-500">
                  {formatSize(file.file_size)} · {formatDate(file.created_at)}
                </p>
              </div>
              <a
                href={file.drive_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-[8px] border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Open
              </a>
              <button
                type="button"
                onClick={() => handleCopy(file)}
                className="inline-flex items-center gap-1.5 rounded-[8px] border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                <Copy className="h-3.5 w-3.5" />
                Copy link
              </button>
              <button
                type="button"
                onClick={() => handleDelete(file)}
                className="rounded-[8px] p-2 text-slate-400 hover:bg-white hover:text-red-600"
                aria-label={`Delete ${file.file_name}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          {(isAdmin ? selectedId : true) && !files.length ? (
            <p className="rounded-[8px] border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
              No files in this folder yet.
            </p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
