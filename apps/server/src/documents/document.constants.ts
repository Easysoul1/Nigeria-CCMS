export const ALLOWED_MIME = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
]);

export const MAX_FILE_BYTES = parseInt(process.env.MAX_FILE_BYTES ?? "", 10) || 20 * 1024 * 1024;
