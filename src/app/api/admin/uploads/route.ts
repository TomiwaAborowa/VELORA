import { randomUUID } from "node:crypto";
import { ApiError, handler, ok, requireAdmin } from "@/lib/api";

const BUCKET = "product-images";
const MAX_BYTES = 5 * 1024 * 1024;
const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

// POST /api/admin/uploads — multipart form with a single `file` field
export const POST = handler(async (request) => {
  const { supabase } = await requireAdmin();

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) throw new ApiError(400, "missing_file", "Choose an image to upload.");

  const extension = EXTENSIONS[file.type];
  if (!extension) throw new ApiError(415, "unsupported_type", "Images must be JPEG, PNG, WebP or AVIF.");
  if (file.size > MAX_BYTES) throw new ApiError(413, "file_too_large", "Images must be 5 MB or smaller.");

  const path = `products/${randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type,
    cacheControl: "31536000",
  });
  if (error) {
    console.error("[upload]", error.message);
    throw new ApiError(500, "upload_failed", "The image could not be uploaded.");
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return ok({ url: data.publicUrl, path }, 201);
});
