import { db } from "../db/index.js";
import { plants, plantLogs } from "../db/schema.js";
import { eq, and, desc, count } from "drizzle-orm";
import { AppError } from "../utils/app-error.js";
import { deleteUploadedPhoto } from "../utils/upload-helper.js";

/**
 * Periksa apakah tanaman dengan ID tertentu ada di database dan milik user yang bersangkutan (dengan .limit(1))
 * @param {number} plantId
 * @param {number} userId
 * @returns {Promise<boolean>}
 */
export async function checkPlantExists(plantId, userId) {
  const result = await db
    .select({ id: plants.id })
    .from(plants)
    .where(and(eq(plants.id, plantId), eq(plants.userId, userId)))
    .limit(1);

  return result.length > 0;
}

/**
 * Tambah catatan log baru untuk tanaman tertentu
 * @param {number} plantId
 * @param {number} userId
 * @param {{ catatan: string, foto?: string|null }} body
 * @returns {Promise<object>} Data log yang baru dibuat
 */
export async function createLog(plantId, userId, { catatan, foto }) {
  const numericPlantId = Number(plantId);
  if (!numericPlantId || isNaN(numericPlantId)) {
    throw new AppError("ID tanaman tidak valid", 400);
  }

  const plantExists = await checkPlantExists(numericPlantId, userId);
  if (!plantExists) {
    throw new AppError("Tanaman tidak ditemukan", 404);
  }

  if (!catatan || typeof catatan !== "string" || !catatan.trim()) {
    throw new AppError("Catatan jurnal wajib diisi", 400);
  }

  // Insert log baru
  const [result] = await db.insert(plantLogs).values({
    plantId: numericPlantId,
    catatan: catatan.trim(),
    foto: foto ?? null,
  });

  const [newLog] = await db
    .select()
    .from(plantLogs)
    .where(eq(plantLogs.id, result.insertId))
    .limit(1);

  return {
    id: newLog.id,
    plant_id: newLog.plantId,
    catatan: newLog.catatan,
    foto: newLog.foto,
    created_at: newLog.createdAt,
    updated_at: newLog.updatedAt,
  };
}

/**
 * Ambil semua catatan log berdasarkan plant_id dengan sorting dan pagination
 * @param {number} plantId
 * @param {number} userId
 * @param {object} [options]
 * @param {number} [options.page]
 * @param {number} [options.limit]
 * @returns {Promise<{ data: Array<object>, pagination?: object }|Array<object>>}
 */
export async function getLogsByPlantId(plantId, userId, { page, limit } = {}) {
  const numericPlantId = Number(plantId);
  if (!numericPlantId || isNaN(numericPlantId)) {
    throw new AppError("ID tanaman tidak valid", 400);
  }

  const plantExists = await checkPlantExists(numericPlantId, userId);
  if (!plantExists) {
    throw new AppError("Tanaman tidak ditemukan", 404);
  }

  const query = db
    .select({
      id: plantLogs.id,
      plantId: plantLogs.plantId,
      catatan: plantLogs.catatan,
      foto: plantLogs.foto,
      createdAt: plantLogs.createdAt,
      updatedAt: plantLogs.updatedAt,
    })
    .from(plantLogs)
    .where(eq(plantLogs.plantId, numericPlantId))
    .orderBy(desc(plantLogs.createdAt));

  const hasPagination = page !== undefined && limit !== undefined;

  if (hasPagination) {
    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.max(1, Math.min(100, Number(limit) || 10));
    const offset = (pageNum - 1) * limitNum;

    const [totalResult] = await db
      .select({ count: count() })
      .from(plantLogs)
      .where(eq(plantLogs.plantId, numericPlantId));

    const total = Number(totalResult?.count || 0);
    const results = await query.limit(limitNum).offset(offset);

    const formattedData = results.map((log) => ({
      id: log.id,
      plant_id: log.plantId,
      catatan: log.catatan,
      foto: log.foto,
      created_at: log.createdAt,
      updated_at: log.updatedAt,
    }));

    return {
      data: formattedData,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  const results = await query;
  return results.map((log) => ({
    id: log.id,
    plant_id: log.plantId,
    catatan: log.catatan,
    foto: log.foto,
    created_at: log.createdAt,
    updated_at: log.updatedAt,
  }));
}

/**
 * Mengambil satu log berdasarkan logId dan memvalidasi kepemilikan user
 * @param {number} logId
 * @param {number} userId
 * @returns {Promise<object>}
 */
export async function getLogById(logId, userId) {
  const numericLogId = Number(logId);
  if (!numericLogId || isNaN(numericLogId)) {
    throw new AppError("ID catatan jurnal tidak valid", 400);
  }

  // Join plant_logs dengan plants untuk memastikan tanaman milik user yang login
  const [result] = await db
    .select({
      id: plantLogs.id,
      plantId: plantLogs.plantId,
      catatan: plantLogs.catatan,
      foto: plantLogs.foto,
      createdAt: plantLogs.createdAt,
      updatedAt: plantLogs.updatedAt,
    })
    .from(plantLogs)
    .innerJoin(plants, eq(plantLogs.plantId, plants.id))
    .where(and(eq(plantLogs.id, numericLogId), eq(plants.userId, userId)))
    .limit(1);

  if (!result) {
    throw new AppError("Catatan jurnal tidak ditemukan", 404);
  }

  return {
    id: result.id,
    plant_id: result.plantId,
    catatan: result.catatan,
    foto: result.foto,
    created_at: result.createdAt,
    updated_at: result.updatedAt,
  };
}

/**
 * Update catatan log berdasarkan logId
 * @param {number} logId
 * @param {number} userId
 * @param {{ catatan?: string, foto?: string|null }} body
 * @returns {Promise<object>}
 */
export async function updateLog(logId, userId, { catatan, foto } = {}) {
  const numericLogId = Number(logId);
  if (!numericLogId || isNaN(numericLogId)) {
    throw new AppError("ID catatan jurnal tidak valid", 400);
  }

  // 1. Guard cek payload kosong
  if (catatan === undefined && foto === undefined) {
    throw new AppError("Tidak ada data yang diperbarui", 400);
  }

  // 2. Ambil data log lama & pastikan milik user yang bersangkutan
  const existing = await getLogById(numericLogId, userId);

  // 3. Siapkan data yang akan diupdate
  const updateData = {};
  if (catatan !== undefined) {
    if (typeof catatan !== "string" || !catatan.trim()) {
      throw new AppError("Catatan jurnal tidak boleh kosong", 400);
    }
    updateData.catatan = catatan.trim();
  }

  if (foto !== undefined) {
    updateData.foto = foto;
    // Hapus foto lama jika diganti dengan foto baru yang berbeda
    if (existing.foto && existing.foto !== foto) {
      await deleteUploadedPhoto(existing.foto);
    }
  }

  if (Object.keys(updateData).length === 0) {
    throw new AppError("Tidak ada data yang diperbarui", 400);
  }

  // 4. Update data ke database
  await db
    .update(plantLogs)
    .set(updateData)
    .where(eq(plantLogs.id, numericLogId));

  // 5. Kembalikan data terbaru
  return await getLogById(numericLogId, userId);
}

/**
 * Hapus catatan log berdasarkan logId dan hapus foto dari filesystem
 * @param {number} logId
 * @param {number} userId
 * @returns {Promise<void>}
 */
export async function deleteLog(logId, userId) {
  const numericLogId = Number(logId);
  if (!numericLogId || isNaN(numericLogId)) {
    throw new AppError("ID catatan jurnal tidak valid", 400);
  }

  // Cek keberadaan dan kepemilikan log
  const existing = await getLogById(numericLogId, userId);

  // Hapus foto dari filesystem jika ada
  if (existing.foto) {
    await deleteUploadedPhoto(existing.foto);
  }

  // Hapus dari database
  await db.delete(plantLogs).where(eq(plantLogs.id, numericLogId));
}
