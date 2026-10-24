import { db } from "../db/index.js";
import { users, sessions } from "../db/schema.js";
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

/**
 * Autentikasi login user dan pembuatan session token (UUID)
 * @param {object} param
 * @param {string} param.email
 * @param {string} param.password
 * @returns {Promise<string>} token UUID
 */
export async function loginUser({ email, password }) {
  // 1. Cari user berdasarkan email
  const user = await findUserByEmail(email.trim().toLowerCase());
  if (!user) {
    const error = new Error("Email atau password salah");
    error.statusCode = 401;
    throw error;
  }

  // 2. Verifikasi password dengan hash bcrypt
  const isPasswordValid = await Bun.password.verify(password, user.password);
  if (!isPasswordValid) {
    const error = new Error("Email atau password salah");
    error.statusCode = 401;
    throw error;
  }

  // 3. Generate token UUID unik
  const token = crypto.randomUUID();

  // 4. Simpan session token ke database
  await db.insert(sessions).values({
    token,
    userId: user.id,
  });

  return token;
}
