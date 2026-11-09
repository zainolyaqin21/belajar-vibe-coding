import { db } from "../db/index.js";
import { plants, plantLogs } from "../db/schema.js";
import { eq, and, desc, count } from "drizzle-orm";
import { AppError } from "../utils/app-error.js";
import { deleteUploadedPhoto } from "../utils/upload-helper.js";

/**
 * Menambahkan data tanaman baru ke dalam database milik user tertentu
 * @param {object} param
 * @param {number} param.userId - ID pengguna pemilik tanaman
 * @param {string} param.name - Nama tanaman
 * @param {string|Date} param.tanggal - Tanggal mulai tracking / penanaman
 * @returns {Promise<object>} Data tanaman yang berhasil dibuat
 */
export async function createPlant({ userId, name, tanggal }) {
  if (!userId) {
    throw new AppError("User ID wajib disertakan", 400);
  }

  if (!name || typeof name !== "string" || !name.trim()) {
    throw new AppError("Nama tanaman wajib diisi", 400);
  }

  if (!tanggal) {
    throw new AppError("Tanggal penanaman wajib diisi", 400);
  }

  const parsedDate = new Date(tanggal);
  if (isNaN(parsedDate.getTime())) {
    throw new AppError("Format tanggal tidak valid", 400);
  }

  // Simpan ke database
  const [result] = await db.insert(plants).values({
    userId,
    name: name.trim(),
    tanggal: parsedDate,
  });

  // Ambil record yang baru saja dibuat
  const [newPlant] = await db
    .select({
      id: plants.id,
      userId: plants.userId,
      name: plants.name,
      tanggal: plants.tanggal,
      createdAt: plants.createdAt,
      updatedAt: plants.updatedAt,
    })
    .from(plants)
    .where(eq(plants.id, result.insertId))
    .limit(1);

  return {
    id: newPlant.id,
    user_id: newPlant.userId,
    name: newPlant.name,
    tanggal: newPlant.tanggal,
    created_at: newPlant.createdAt,
    updated_at: newPlant.updatedAt,
  };
}

/**
 * Mengambil daftar tanaman milik user dengan dukungan pagination
 * @param {number} userId - ID pengguna pemilik tanaman
 * @param {object} [options]
 * @param {number} [options.page] - Nomor halaman (mulai dari 1)
 * @param {number} [options.limit] - Jumlah data per halaman
 * @returns {Promise<{ data: Array<object>, pagination?: object }|Array<object>>}
 */
export async function getAllPlants(userId, { page, limit } = {}) {
  if (!userId) {
    throw new AppError("Unauthorized", 401);
  }

  const query = db
    .select({
      id: plants.id,
      userId: plants.userId,
      name: plants.name,
      tanggal: plants.tanggal,
      createdAt: plants.createdAt,
      updatedAt: plants.updatedAt,
    })
    .from(plants)
    .where(eq(plants.userId, userId))
    .orderBy(desc(plants.createdAt));

  const hasPagination = page !== undefined && limit !== undefined;

  if (hasPagination) {
    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.max(1, Math.min(100, Number(limit) || 10));
    const offset = (pageNum - 1) * limitNum;

    const [totalResult] = await db
      .select({ count: count() })
      .from(plants)
      .where(eq(plants.userId, userId));

    const total = Number(totalResult?.count || 0);
    const results = await query.limit(limitNum).offset(offset);

    const formattedData = results.map((p) => ({
      id: p.id,
      user_id: p.userId,
      name: p.name,
      tanggal: p.tanggal,
      created_at: p.createdAt,
      updated_at: p.updatedAt,
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

  // Jika tanpa query pagination, kembalikan semua tanaman milik user
  const results = await query;
  return results.map((p) => ({
    id: p.id,
    user_id: p.userId,
    name: p.name,
    tanggal: p.tanggal,
    created_at: p.createdAt,
    updated_at: p.updatedAt,
  }));
}

/**
 * Mengambil satu data tanaman berdasarkan ID milik user
 * @param {number} id - ID tanaman
 * @param {number} userId - ID pengguna pemilik tanaman
 * @returns {Promise<object>}
 */
export async function getPlantById(id, userId) {
  const numericId = Number(id);
  if (!numericId || isNaN(numericId)) {
    throw new AppError("ID tanaman tidak valid", 400);
  }

  const [plant] = await db
    .select({
      id: plants.id,
      userId: plants.userId,
      name: plants.name,
      tanggal: plants.tanggal,
      createdAt: plants.createdAt,
      updatedAt: plants.updatedAt,
    })
    .from(plants)
    .where(and(eq(plants.id, numericId), eq(plants.userId, userId)))
    .limit(1);

  if (!plant) {
    throw new AppError("Tanaman tidak ditemukan", 404);
  }

  return {
    id: plant.id,
    user_id: plant.userId,
    name: plant.name,
    tanggal: plant.tanggal,
    created_at: plant.createdAt,
    updated_at: plant.updatedAt,
  };
}

/**
 * Memperbarui data tanaman berdasarkan ID dan userId
 * @param {number} id - ID tanaman yang akan diperbarui
 * @param {number} userId - ID pengguna pemilik
 * @param {object} param
 * @param {string} [param.name] - Nama baru tanaman
 * @param {string|Date} [param.tanggal] - Tanggal baru penanaman / tracking
 * @returns {Promise<object>} Data tanaman setelah diperbarui
 */
export async function updatePlant(id, userId, { name, tanggal } = {}) {
  const numericId = Number(id);
  if (!numericId || isNaN(numericId)) {
    throw new AppError("ID tanaman tidak valid", 400);
  }

  // 1. Guard cek payload kosong
  if (name === undefined && tanggal === undefined) {
    throw new AppError("Tidak ada data yang diperbarui", 400);
  }

  // 2. Cek apakah tanaman ada dan milik user yang bersangkutan
  const existingPlant = await getPlantById(numericId, userId);

  // 3. Siapkan data yang akan diupdate
  const updateData = {};
  if (name !== undefined) {
    if (typeof name !== "string" || !name.trim()) {
      throw new AppError("Nama tanaman tidak boleh kosong", 400);
    }
    updateData.name = name.trim();
  }

  if (tanggal !== undefined) {
    const parsedDate = new Date(tanggal);
    if (isNaN(parsedDate.getTime())) {
      throw new AppError("Format tanggal tidak valid", 400);
    }
    updateData.tanggal = parsedDate;
  }

  if (Object.keys(updateData).length === 0) {
    throw new AppError("Tidak ada data yang diperbarui", 400);
  }

  // 4. Eksekusi update
  await db
    .update(plants)
    .set(updateData)
    .where(and(eq(plants.id, numericId), eq(plants.userId, userId)));

  // 5. Ambil data terbaru
  return await getPlantById(numericId, userId);
}

/**
 * Menghapus data tanaman berdasarkan ID dan userId beserta pembersihan file foto log
 * @param {number} id - ID tanaman yang akan dihapus
 * @param {number} userId - ID pengguna pemilik
 * @returns {Promise<void>}
 */
export async function deletePlant(id, userId) {
  const numericId = Number(id);
  if (!numericId || isNaN(numericId)) {
    throw new AppError("ID tanaman tidak valid", 400);
  }

  // Cek kepemilikan tanaman
  await getPlantById(numericId, userId);

  // Ambil semua foto log tanaman untuk dihapus dari filesystem
  const relatedLogs = await db
    .select({ foto: plantLogs.foto })
    .from(plantLogs)
    .where(eq(plantLogs.plantId, numericId));

  for (const log of relatedLogs) {
    if (log.foto) {
      await deleteUploadedPhoto(log.foto);
    }
  }

  // Hapus record tanaman (cascade delete akan menghapus plant_logs terkait di DB)
  await db
    .delete(plants)
    .where(and(eq(plants.id, numericId), eq(plants.userId, userId)));
}
