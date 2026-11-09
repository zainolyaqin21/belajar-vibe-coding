import { mkdir, unlink } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, extname } from "node:path";
import { AppError } from "./app-error.js";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
]);

/**
 * Memvalidasi buffer gambar menggunakan magic bytes
 * @param {Uint8Array} bytes
 * @returns {string|null} Ekstensi yang valid atau null
 */
function detectImageExtension(bytes) {
  if (!bytes || bytes.length < 4) return null;

  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return ".jpg";
  }

  // PNG: 89 50 4E 47
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return ".png";
  }

  // GIF: 47 49 46 38 ("GIF8")
  if (
    bytes[0] === 0x47 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x38
  ) {
    return ".gif";
  }

  // WEBP: "RIFF" .... "WEBP"
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return ".webp";
  }

  return null;
}

/**
 * Menyimpan berkas foto upload ke direktori public/uploads
 * @param {File|Blob|string|null|undefined} foto
 * @returns {Promise<string|null>} Path relatif URL foto atau null
 */
export async function processPhotoUpload(foto) {
  if (!foto) return null;

  // Jika input berupa string path/URL
  if (typeof foto === "string") {
    const trimmed = foto.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  // Jika input berupa berkas File / Blob dari FormData
  if (typeof foto === "object" && typeof foto.arrayBuffer === "function") {
    if (foto.size === 0) return null;

    // 1. Validasi ukuran berkas (maks 5MB)
    if (foto.size > MAX_FILE_SIZE) {
      throw new AppError("Ukuran foto melebihi batas maksimum 5MB", 400);
    }

    // 2. Validasi MIME type jika dideklarasikan
    if (foto.type && !ALLOWED_MIME_TYPES.has(foto.type.toLowerCase())) {
      throw new AppError(
        "Tipe berkas tidak didukung. Hanya gambar (JPEG, PNG, WEBP, GIF) yang diperbolehkan",
        400
      );
    }

    const buffer = await foto.arrayBuffer();
    const bytes = new Uint8Array(buffer);

    // 3. Validasi magic bytes asli berkas
    const detectedExt = detectImageExtension(bytes);
    if (!detectedExt) {
      throw new AppError(
        "Format berkas tidak valid atau rusak. Hanya gambar asli (JPEG, PNG, WEBP, GIF) yang diperbolehkan",
        400
      );
    }

    const uploadDir = join(process.cwd(), "public", "uploads");
    await mkdir(uploadDir, { recursive: true });

    const originalName = foto.name || "plant.jpg";
    const rawExt = extname(originalName).toLowerCase();
    const safeExt = [".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(rawExt)
      ? rawExt === ".jpeg"
        ? ".jpg"
        : rawExt
      : detectedExt;

    const uniqueName = `log_${Date.now()}_${Math.random().toString(36).substring(2, 9)}${safeExt}`;
    const targetPath = join(uploadDir, uniqueName);

    await Bun.write(targetPath, buffer);

    return `/uploads/${uniqueName}`;
  }

  return null;
}

/**
 * Menghapus berkas foto lama dari direktori public/uploads
 * @param {string|null|undefined} photoPath - Path relatif foto seperti /uploads/xxx.jpg
 * @returns {Promise<boolean>}
 */
export async function deleteUploadedPhoto(photoPath) {
  if (!photoPath || typeof photoPath !== "string") return false;

  const cleanPath = photoPath.trim();
  if (!cleanPath.startsWith("/uploads/")) return false;

  try {
    const fileName = cleanPath.replace(/^\/uploads\//, "");
    // Cegah path traversal
    if (fileName.includes("..") || fileName.includes("/") || fileName.includes("\\")) {
      return false;
    }

    const absolutePath = join(process.cwd(), "public", "uploads", fileName);
    if (existsSync(absolutePath)) {
      await unlink(absolutePath);
      return true;
    }
  } catch (error) {
    console.error("Gagal menghapus file foto lama:", error.message);
  }

  return false;
}
