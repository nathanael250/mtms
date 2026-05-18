import path from "path";

export function getDocumentFolderId(settings, status) {
  if (status === "approved") {
    return settings?.approved_folder_id || settings?.root_folder_id || null;
  }
  if (status === "rejected") {
    return settings?.rejected_folder_id || settings?.root_folder_id || null;
  }

  return settings?.pending_folder_id || settings?.root_folder_id || null;
}

export function buildDriveMetadata({ file, settings, folderId }) {
  const localFileId = `local-${Date.now()}-${Math.round(Math.random() * 1e9)}`;
  const relativePath = file.path.replace(`${process.cwd()}${path.sep}`, "");

  return {
    fileId: localFileId,
    fileUrl:
      settings?.status === "connected" && settings.root_folder_id
        ? `https://drive.google.com/file/d/${localFileId}/view`
        : `/${relativePath}`,
    folderId,
  };
}
