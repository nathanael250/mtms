import { FileUp, X } from "lucide-react";
import { ACCEPTED_FILE_TYPES } from "../lib/uploads";

// Controlled multi-file picker: `files` is an array of File objects.
export default function FilePicker({ files, onChange, label = "Attachments (optional)" }) {
  function addFiles(event) {
    const picked = Array.from(event.target.files || []);
    const known = new Set(files.map((file) => `${file.name}-${file.size}`));
    onChange([...files, ...picked.filter((file) => !known.has(`${file.name}-${file.size}`))]);
    event.target.value = "";
  }

  return (
    <div>
      <span className="mb-2 block text-sm font-medium text-slate-600">{label}</span>
      <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-600 transition hover:bg-slate-100">
        <FileUp className="h-5 w-5 text-[var(--brand-600)]" />
        <span>Click to add files (PDF, Word, Excel, images, MP4, up to 25 MB each)</span>
        <input
          type="file"
          multiple
          accept={ACCEPTED_FILE_TYPES}
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
                {(file.size / 1024 / 1024).toFixed(2)} MB
                <button
                  type="button"
                  onClick={() => onChange(files.filter((item) => item !== file))}
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
  );
}
