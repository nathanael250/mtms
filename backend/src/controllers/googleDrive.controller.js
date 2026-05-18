import { getPool } from "../config/database.js";
import { asyncHandler } from "../utils/asyncHandler.js";

async function getSettingsRow() {
  const [rows] = await getPool().query(
    "SELECT * FROM google_drive_settings ORDER BY id ASC LIMIT 1"
  );

  return rows[0] || null;
}

export const getGoogleDriveSettings = asyncHandler(async (_req, res) => {
  const settings = await getSettingsRow();
  res.json({
    settings: settings || {
      connected_email: "movepromotion1@gmail.com",
      root_folder_id: "",
      pending_folder_id: "",
      approved_folder_id: "",
      rejected_folder_id: "",
      status: "disconnected",
    },
  });
});

export const upsertGoogleDriveSettings = asyncHandler(async (req, res) => {
  const {
    connected_email,
    root_folder_id,
    pending_folder_id,
    approved_folder_id,
    rejected_folder_id,
    status = "connected",
  } = req.body;
  const existing = await getSettingsRow();
  const values = [
    connected_email || null,
    root_folder_id || null,
    pending_folder_id || null,
    approved_folder_id || null,
    rejected_folder_id || null,
    status,
    req.user.id,
  ];

  if (existing) {
    await getPool().query(
      `UPDATE google_drive_settings
       SET connected_email = ?, root_folder_id = ?, pending_folder_id = ?,
           approved_folder_id = ?, rejected_folder_id = ?, status = ?,
           configured_by = ?, configured_at = NOW()
       WHERE id = ?`,
      [...values, existing.id]
    );
  } else {
    await getPool().query(
      `INSERT INTO google_drive_settings
       (connected_email, root_folder_id, pending_folder_id, approved_folder_id,
        rejected_folder_id, status, configured_by, configured_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
      values
    );
  }

  const settings = await getSettingsRow();
  res.json({ message: "Google Drive settings saved successfully.", settings });
});
