import { FileUp, Link2, X } from "lucide-react";
import { STAFF_FILE_ACCEPT, STAFF_FILE_MAX_MB } from "../lib/uploads";

// "Final product" (uploaded to the staff member's Google Drive folder) and "Reference file"
// (a Google Drive link copied from My Folder in the Doc Library).
export default function FinalProductFields({ files, onFilesChange, link, onLinkChange }) {
  function addFiles(event) {
    const picked = Array.from(event.target.files || []);
    const known = new Set(files.map((file) => `${file.name}-${file.size}`));
    onFilesChange([...files, ...picked.filter((file) => !known.has(`${file.name}-${file.size}`))]);
    event.target.value = "";
  }

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4">
      <div>
        <span className="mb-2 block text-sm font-medium text-slate-600">
          Final product (optional)
        </span>
        <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-600 transition hover:bg-slate-100">
          <FileUp className="h-5 w-5 text-[var(--brand-600)]" />
          <span>
            Add video, audio or documents (up to {STAFF_FILE_MAX_MB} MB each). They are saved in
            your Google Drive folder.
          </span>
          <input
            type="file"
            multiple
            accept={STAFF_FILE_ACCEPT}
            onChange={addFiles}
            className="sr-only"
          />
        </label>
        {files.length ? (
          <div className="mt-2 space-y-1.5">
            {files.map((file) => (
              <div
                key={`${file.name}-${file.size}`}
                className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2 text-sm"
              >
                <span className="truncate text-slate-700">{file.name}</span>
                <span className="flex shrink-0 items-center gap-2 text-xs text-slate-400">
                  {(file.size / 1024 / 1024).toFixed(1)} MB
                  <button
                    type="button"
                    onClick={() => onFilesChange(files.filter((item) => item !== file))}
                    className="rounded p-0.5 hover:bg-slate-200 hover:text-rose-600"
                    aria-label={`Remove ${file.name}`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <label className="block">
        <span className="mb-2 flex items-center gap-1.5 text-sm font-medium text-slate-600">
          <Link2 className="h-4 w-4" />
          Reference file link (optional)
        </span>
        <input
          type="url"
          value={link}
          onChange={(event) => onLinkChange(event.target.value)}
          placeholder="Paste the link you copied from My Folder in Doc Library"
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-[var(--brand-400)] focus:bg-white"
        />
      </label>
    </div>
  );
}
