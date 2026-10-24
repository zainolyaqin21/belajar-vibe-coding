import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import { eq } from "drizzle-orm";

/**
 * Mencari user berdasarkan alamat email
 * @param {string} email
 * @returns {Promise<object|null>}
 */
export async function findUserByEmail(email) {
  const [existingUser] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  return existingUser || null;
}

/**
 * Mendaftarkan user baru dengan password yang di-hash menggunakan bcrypt
 * @param {object} param
 * @param {string} param.name
 * @param {string} param.email
 * @param {string} param.password
 * @returns {Promise<object>}
 */
export async function registerUser({ name, email, password }) {
  // 1. Cek duplikasi email
  const existingUser = await findUserByEmail(email);
  if (existingUser) {
    const error = new Error("Email sudah digunakan");
    error.statusCode = 409;
    throw error;
  }

  // 2. Hash password menggunakan bcrypt
  const hashedPassword = await Bun.password.hash(password, {
    algorithm: "bcrypt",
    cost: 10,
  });

  // 3. Simpan data user ke database
  const [result] = await db.insert(users).values({
    name: name.trim(),
    email: email.trim().toLowerCase(),
    password: hashedPassword,
  });

  // 4. Ambil record user yang baru dibuat tanpa menyertakan password
  const [newUser] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      time: users.time,
    })
    .from(users)
    .where(eq(users.id, result.insertId))
    .limit(1);

  return newUser;
}
