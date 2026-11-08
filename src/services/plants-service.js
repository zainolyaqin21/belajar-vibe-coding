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

