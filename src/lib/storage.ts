import { supabase } from "@/lib/supabase";

export const MEDIA_BUCKET = "complaint-media";
export const AVATAR_BUCKET = "avatars";
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

/** Returns an error message if the file can't be uploaded, otherwise null. */
export function validateImage(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) return `"${file.name}" isn't a supported image (use JPG, PNG, WebP or GIF).`;
  if (file.size > MAX_IMAGE_BYTES) return `"${file.name}" is larger than 5 MB.`;
  return null;
}

/**
 * Uploads images to Supabase Storage under `<userId>/…` and returns their public URLs.
 * Stops and cleans up if any file fails, so no orphaned files are left behind.
 */
export async function uploadImages(
  files: File[],
  userId: string,
): Promise<{ urls: string[]; error?: string }> {
  const urls: string[] = [];
  const paths: string[] = [];

  for (const file of files) {
    const invalid = validateImage(file);
    if (invalid) {
      if (paths.length) await supabase.storage.from(MEDIA_BUCKET).remove(paths);
      return { urls: [], error: invalid };
    }

    const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
    const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext || "jpg"}`;

    const { error } = await supabase.storage
      .from(MEDIA_BUCKET)
      .upload(path, file, { contentType: file.type, cacheControl: "31536000", upsert: false });

    if (error) {
      if (import.meta.env.DEV) console.error("[Power-Track Storage]", error.message);
      if (paths.length) await supabase.storage.from(MEDIA_BUCKET).remove(paths);
      return { urls: [], error: "Couldn't upload your photo. Please check your connection and try again." };
    }

    paths.push(path);
    urls.push(supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path).data.publicUrl);
  }

  return { urls };
}

/**
 * Uploads a single profile avatar to the dedicated `avatars` bucket under `<userId>/…`.
 */
export async function uploadAvatar(
  file: File,
  userId: string,
): Promise<{ url?: string; error?: string }> {
  const invalid = validateImage(file);
  if (invalid) return { error: invalid };

  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext || "jpg"}`;

  const { error } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(path, file, { contentType: file.type, cacheControl: "31536000", upsert: false });

  if (error) {
    if (import.meta.env.DEV) console.error("[Power-Track Avatars]", error.message);
    return { error: "Couldn't upload your profile photo. Please check your connection and try again." };
  }

  return { url: supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path).data.publicUrl };
}

