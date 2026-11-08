import { db } from "../db/index.js";
import { plants } from "../db/schema.js";
import { eq } from "drizzle-orm";

/**
 * Menambahkan data tanaman baru ke dalam database
 * @param {object} param
 * @param {string} param.name - Nama tanaman
 * @param {string|Date} param.tanggal - Tanggal mulai tracking / penanaman
 * @returns {Promise<object>} Data tanaman yang berhasil dibuat
 */
export async function createPlant({ name, tanggal }) {
  if (!name || typeof name !== "string" || !name.trim()) {
    const error = new Error("Nama tanaman wajib diisi");
    error.statusCode = 400;
    throw error;
  }

  if (!tanggal) {
    const error = new Error("Tanggal penanaman wajib diisi");
    error.statusCode = 400;
    throw error;
  }

  const parsedDate = new Date(tanggal);
  if (isNaN(parsedDate.getTime())) {
    const error = new Error("Format tanggal tidak valid");
    error.statusCode = 400;
    throw error;
  }

  // Simpan ke database
  const [result] = await db.insert(plants).values({
    name: name.trim(),
    tanggal: parsedDate,
  });

  // Ambil record yang baru saja dibuat
  const [newPlant] = await db
    .select({
      id: plants.id,
      name: plants.name,
      tanggal: plants.tanggal,
      created_at: plants.createdAt,
    })
    .from(plants)
    .where(eq(plants.id, result.insertId))
    .limit(1);

  return newPlant;
}

/**
 * Mengambil seluruh daftar tanaman yang sedang dilacak
 * @returns {Promise<Array<object>>} Daftar tanaman
 */
export async function getAllPlants() {
  const allPlants = await db
    .select({
      id: plants.id,
      name: plants.name,
      tanggal: plants.tanggal,
      created_at: plants.createdAt,
    })
    .from(plants);

  return allPlants;
}

/**
 * Memperbarui data tanaman berdasarkan ID
 * @param {number} id - ID tanaman yang akan diperbarui
 * @param {object} param
 * @param {string} param.name - Nama baru tanaman
 * @param {string|Date} param.tanggal - Tanggal baru penanaman / tracking
 * @returns {Promise<object>} Data tanaman setelah diperbarui
 */
export async function updatePlant(id, { name, tanggal }) {
  const numericId = Number(id);
  if (!numericId || isNaN(numericId)) {
    const error = new Error("ID tanaman tidak valid");
    error.statusCode = 400;
    throw error;
  }

  // 1. Cek apakah record tanaman dengan id tersebut ada
  const [existingPlant] = await db
    .select()
    .from(plants)
    .where(eq(plants.id, numericId))
    .limit(1);

  if (!existingPlant) {
    const error = new Error("Tanaman tidak ditemukan");
    error.statusCode = 404;
    throw error;
  }

  // 2. Siapkan data yang akan diupdate
  const updateData = {};
  if (name !== undefined) {
    if (typeof name !== "string" || !name.trim()) {
      const error = new Error("Nama tanaman tidak boleh kosong");
      error.statusCode = 400;
      throw error;
    }
    updateData.name = name.trim();
  }

  if (tanggal !== undefined) {
    const parsedDate = new Date(tanggal);
    if (isNaN(parsedDate.getTime())) {
      const error = new Error("Format tanggal tidak valid");
      error.statusCode = 400;
      throw error;
    }
    updateData.tanggal = parsedDate;
  }

  // 3. Eksekusi update data
  await db
    .update(plants)
    .set(updateData)
    .where(eq(plants.id, numericId));

  // 4. Ambil record data terbaru hasil update
  const [updatedPlant] = await db
    .select({
      id: plants.id,
      name: plants.name,
      tanggal: plants.tanggal,
      created_at: plants.createdAt,
    })
    .from(plants)
    .where(eq(plants.id, numericId))
    .limit(1);

  return updatedPlant;
}


