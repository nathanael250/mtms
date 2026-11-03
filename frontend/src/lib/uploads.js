import { API_BASE_URL, apiFetch } from "./api";

export const ACCEPTED_FILE_TYPES = ".pdf,.doc,.docx,.xlsx,.jpg,.jpeg,.png,.mp4";

export function getUploadUrl(filePath) {
  return `${API_BASE_URL.replace(/\/api$/, "")}/${filePath}`;
}

// Attaches files to an assigned-task report, one request per file.
export async function uploadReportFiles(token, reportId, files) {
  for (const file of files) {
    const formData = new FormData();
    formData.append("related_type", "report");
    formData.append("related_id", reportId);
    formData.append("file", file);
    await apiFetch("/attachments/upload", { method: "POST", token, body: formData });
  }
}

// Attaches documents to a mention (the server decides whether they belong to the tag or to the resolution).
export async function uploadMentionFiles(token, mentionId, files) {
  for (const file of files) {
    const formData = new FormData();
    formData.append("related_type", "report");
    formData.append("file", file);
    await apiFetch(`/report-mentions/${mentionId}/files`, {
      method: "POST",
      token,
      body: formData,
    });
  }
}
