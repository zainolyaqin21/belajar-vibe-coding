import { Elysia } from "elysia";
import { getCurrentUser } from "../services/users-service.js";
import { AppError } from "../utils/app-error.js";

/**
 * Ekstraksi token Bearer dari HTTP header
 * @param {Record<string, string|undefined>} headers
 * @returns {string} Token UUID
 */
export function extractBearerToken(headers) {
  const authHeader = headers["authorization"] || headers["Authorization"];
  if (!authHeader || typeof authHeader !== "string" || !authHeader.startsWith("Bearer ")) {
    throw new AppError("Unauthorized: Token otentikasi tidak ditemukan", 401);
  }

  const token = authHeader.substring(7).trim();
  if (!token) {
    throw new AppError("Unauthorized: Token otentikasi tidak valid", 401);
  }

  return token;
}

/**
 * Memvalidasi token dan mengembalikan data user aktif
 * @param {Record<string, string|undefined>} headers
 * @returns {Promise<object>}
 */
export async function authenticateRequest(headers) {
  const token = extractBearerToken(headers);
  const user = await getCurrentUser(token);
  return { user, token };
}

/**
 * Elysia plugin untuk memproteksi routes dengan verifikasi session Bearer token
 */
export const authPlugin = new Elysia({ name: "auth-plugin" })
  .derive({ as: "scoped" }, async ({ headers }) => {
    const { user, token } = await authenticateRequest(headers);
    return {
      user,
      authToken: token,
    };
  });
