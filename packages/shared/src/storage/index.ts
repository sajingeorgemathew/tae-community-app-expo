// Storage barrel — re-exports all storage helpers

export {
  normalizeExtension,
  extractExtension,
  isAllowedExtension,
  isImageExtension,
  isVideoExtension,
  buildAvatarPath,
  buildPostMediaPath,
  buildMessageMediaPath,
  bucketForPath,
} from "./paths";

export {
  getPublicUrl,
  createSignedUrl,
  createSignedUrlsBatch,
} from "./urls";

export {
  uploadFile,
  removeFile,
} from "./uploads";

export type { UploadSource, UploadResult } from "./uploads";
