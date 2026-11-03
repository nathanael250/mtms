import { Paperclip } from "lucide-react";
import { getUploadUrl } from "../lib/uploads";

export default function AttachmentLinks({ files = [] }) {
  if (!files.length) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {files.map((file) => (
        <a
          key={file.id}
          href={getUploadUrl(file.file_path)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex max-w-[220px] items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
        >
          <Paperclip className="h-3 w-3 shrink-0" />
          <span className="truncate">{file.file_name}</span>
        </a>
      ))}
    </div>
  );
}
