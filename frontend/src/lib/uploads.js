import { API_BASE_URL, apiFetch } from "./api";

export const ACCEPTED_FILE_TYPES = ".pdf,.doc,.docx,.xlsx,.jpg,.jpeg,.png,.mp4";

export const STAFF_FILE_ACCEPT =
  ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.jpg,.jpeg,.png,.gif,.webp,.mp4,.mov,.avi,.mkv,.webm,.m4v,.mp3,.wav,.m4a,.aac,.ogg,.flac";
export const STAFF_FILE_MAX_MB = 500;

export function getUploadUrl(filePath) {
  // Google Drive links (final products, reference files) are complete addresses already.
  if (/^https?:\/\//i.test(filePath)) return filePath;
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

// Sends final product files to the staff member's Google Drive folder and attaches them to a
// task or report; also attaches a pasted Google Drive link as "Reference file".
// `target` is { type: "task" | "report", id }. Returns a list of problems (empty when all went well).
export async function submitFinalProduct(token, target, files = [], referenceLink = "") {
  const problems = [];
  for (const file of files) {
    try {
      const formData = new FormData();
      formData.append("attach_type", target.type);
      formData.append("attach_id", target.id);
      formData.append("label", "final_product");
      formData.append("file", file);
      await apiFetch("/staff-files", { method: "POST", token, body: formData });
    } catch (error) {
      problems.push(`${file.name}: ${error.message}`);
    }
  }
  if (referenceLink.trim()) {
    try {
      await apiFetch("/staff-files/link", {
        method: "POST",
        token,
        body: { related_type: target.type, related_id: target.id, url: referenceLink.trim() },
      });
    } catch (error) {
      problems.push(`Reference file: ${error.message}`);
    }
  }
  return problems;
}
