/**
 * Uploads an image (downloaded from Slack) to Cloudinary and returns a public URL.
 * Uses Cloudinary's unsigned upload via REST API (no SDK needed).
 *
 * Requires env vars:
 *   CLOUDINARY_CLOUD_NAME
 *   CLOUDINARY_UPLOAD_PRESET (an "unsigned" upload preset created in Cloudinary settings)
 */

async function uploadToCloudinary(imageBuffer, filename = "receipt.jpg") {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || !uploadPreset) {
    throw new Error("Cloudinary env vars not configured");
  }

  const url = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;

  const form = new FormData();
  form.append("file", new Blob([imageBuffer]), filename);
  form.append("upload_preset", uploadPreset);

  const res = await fetch(url, {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Cloudinary upload failed: ${res.status} ${text}`);
  }

  const data = await res.json();
  return data.secure_url;
}

module.exports = { uploadToCloudinary };
