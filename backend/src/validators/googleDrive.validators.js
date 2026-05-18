import { body } from "express-validator";

export const googleDriveSettingsValidator = [
  body("connected_email").optional({ values: "falsy" }).isEmail(),
  body("root_folder_id").optional({ values: "falsy" }).trim(),
  body("pending_folder_id").optional({ values: "falsy" }).trim(),
  body("approved_folder_id").optional({ values: "falsy" }).trim(),
  body("rejected_folder_id").optional({ values: "falsy" }).trim(),
  body("status").optional().isIn(["connected", "disconnected"]),
];
