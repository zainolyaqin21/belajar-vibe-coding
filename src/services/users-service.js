import { db } from "../db/index.js";
import { users, sessions } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { AppError } from "../utils/app-error.js";

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
    throw new AppError("Email sudah digunakan", 409);
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

  // 4. Ambil record user yang baru dibuat tanpa password
  const [newUser] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, result.insertId))
    .limit(1);

  return {
    id: newUser.id,
    name: newUser.name,
    email: newUser.email,
    created_at: newUser.createdAt,
  };
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
    throw new AppError("Email atau password salah", 401);
  }

  // 2. Verifikasi password dengan hash bcrypt
  const isPasswordValid = await Bun.password.verify(password, user.password);
  if (!isPasswordValid) {
    throw new AppError("Email atau password salah", 401);
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

/**
 * Mengambil data user yang sedang login berdasarkan token session menggunakan Drizzle JOIN tunggal
 * @param {string} token - Token UUID dari session
 * @returns {Promise<object>}
 */
export async function getCurrentUser(token) {
  if (!token || typeof token !== "string") {
    throw new AppError("Unauthorized", 401);
  }

  // Menggabungkan query sessions & users menjadi single JOIN query untuk efisiensi
  const [result] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      createdAt: users.createdAt,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(eq(sessions.token, token))
    .limit(1);

  if (!result) {
    throw new AppError("Unauthorized", 401);
  }

  return {
    id: result.id,
    name: result.name,
    email: result.email,
    created_at: result.createdAt,
  };
}

/**
 * Logout user dengan menghapus session token dari database
 * @param {string} token - Token UUID dari session
 * @returns {Promise<void>}
 */
export async function logoutUser(token) {
  if (!token || typeof token !== "string") {
    throw new AppError("Unauthorized", 401);
  }

  const [session] = await db
    .select({ id: sessions.id })
    .from(sessions)
    .where(eq(sessions.token, token))
    .limit(1);

  if (!session) {
    throw new AppError("Unauthorized", 401);
  }

  await db.delete(sessions).where(eq(sessions.token, token));
}
