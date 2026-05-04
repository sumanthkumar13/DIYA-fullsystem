export type CloudinaryUploadResult = {
  secureUrl: string;
};

export type CloudinaryUploadOptions = {
  file: File;
  onProgress?: (percent: number) => void;
};

export function validateImageFile(file: File): string | null {
  const allowed = ["image/jpeg", "image/png", "image/webp"];
  if (!allowed.includes(file.type)) return "Only JPG, PNG, or WEBP images are allowed.";
  const maxBytes = 5 * 1024 * 1024;
  if (file.size > maxBytes) return "Image must be 5MB or smaller.";
  return null;
}

/**
 * Unsigned Cloudinary upload (no secrets on client).
 * Uses the same cloudName/uploadPreset as profile avatar.
 */
export async function uploadImageUnsignedToCloudinary(
  opts: CloudinaryUploadOptions
): Promise<CloudinaryUploadResult> {
  const cloudName = "dld05xsji";
  const uploadPreset = "diya_settings";
  const endpoint = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;

  const form = new FormData();
  form.append("file", opts.file);
  form.append("upload_preset", uploadPreset);

  const secureUrl: string = await new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", endpoint);
    xhr.upload.onprogress = (evt) => {
      if (!evt.lengthComputable) return;
      opts.onProgress?.(Math.round((evt.loaded / evt.total) * 100));
    };
    xhr.onerror = () => reject(new Error("Upload failed. Please try again."));
    xhr.onload = () => {
      try {
        const json = JSON.parse(xhr.responseText || "{}");
        if (xhr.status >= 200 && xhr.status < 300 && typeof json?.secure_url === "string") {
          resolve(json.secure_url);
        } else {
          reject(new Error(json?.error?.message || "Upload failed. Please try again."));
        }
      } catch {
        reject(new Error("Upload failed. Please try again."));
      }
    };
    xhr.send(form);
  });

  return { secureUrl };
}

