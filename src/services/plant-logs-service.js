import { db } from "../db/index.js";
import { plants, plantLogs } from "../db/schema.js";
import { eq } from "drizzle-orm";

/**
 * Periksa apakah tanaman dengan ID tertentu ada di database
 * @param {number} plantId
 * @returns {Promise<boolean>}
 */
async function checkPlantExists(plantId) {
  const result = await db.select().from(plants).where(eq(plants.id, plantId));
  return result.length > 0;
}

/**
 * Tambah catatan log baru untuk tanaman tertentu
 * @param {number} plantId
 * @param {{ catatan: string, foto?: string }} body
 * @returns {Promise<object>} Data log yang baru dibuat
 */
export async function createLog(plantId, { catatan, foto }) {
  // Cek apakah tanaman ada
  const plantExists = await checkPlantExists(plantId);
  if (!plantExists) return null;

  // Insert log baru
  const result = await db.insert(plantLogs).values({
    plantId,
    catatan,
    foto: foto ?? null,
  });

  // Ambil data log yang baru dibuat berdasarkan insertId
  const insertId = result[0].insertId;
  const newLog = await db
    .select()
    .from(plantLogs)
    .where(eq(plantLogs.id, insertId));

  return newLog[0];
}

/**
 * Ambil semua catatan log berdasarkan plant_id
 * @param {number} plantId
 * @returns {Promise<object[]|null>} Array log atau null jika tanaman tidak ada
 */
export async function getLogsByPlantId(plantId) {
  // Cek apakah tanaman ada
  const plantExists = await checkPlantExists(plantId);
  if (!plantExists) return null;

  const logs = await db
    .select()
    .from(plantLogs)
    .where(eq(plantLogs.plantId, plantId));

  return logs;
}

/**
 * Update catatan log berdasarkan logId
 * @param {number} logId
 * @param {{ catatan?: string, foto?: string }} body
 * @returns {Promise<object|null>} Data log terbaru atau null jika tidak ditemukan
 */
export async function updateLog(logId, { catatan, foto }) {
  // Cek apakah log ada
  const existing = await db
    .select()
    .from(plantLogs)
    .where(eq(plantLogs.id, logId));

  if (existing.length === 0) return null;

  // Lakukan update
  const updateData = {};
  if (catatan !== undefined) updateData.catatan = catatan;
  if (foto !== undefined) updateData.foto = foto;

  await db.update(plantLogs).set(updateData).where(eq(plantLogs.id, logId));

  // Ambil data terbaru setelah update
  const updated = await db
    .select()
    .from(plantLogs)
    .where(eq(plantLogs.id, logId));

  return updated[0];
}

/**
 * Hapus catatan log berdasarkan logId
 * @param {number} logId
 * @returns {Promise<boolean>} true jika berhasil dihapus, false jika tidak ditemukan
 */
export async function deleteLog(logId) {
  // Cek apakah log ada
  const existing = await db
    .select()
    .from(plantLogs)
    .where(eq(plantLogs.id, logId));

  if (existing.length === 0) return false;

  await db.delete(plantLogs).where(eq(plantLogs.id, logId));

  return true;
}
