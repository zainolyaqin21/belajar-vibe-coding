import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./schema.js";

const connectionConfig = process.env.DATABASE_URL
  ? process.env.DATABASE_URL
  : {
      host: process.env.DB_HOST || "localhost",
      port: Number(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD || "",
      database: process.env.DB_NAME || "belajar_vibe_coding",
    };

export const poolConnection = mysql.createPool(connectionConfig);

export const db = drizzle(poolConnection, { schema, mode: "default" });

export async function testDbConnection() {
  try {
    const connection = await poolConnection.getConnection();
    await connection.ping();
    connection.release();
    return { connected: true };
  } catch (error) {
    return { connected: false, error: error?.message || String(error) };
  }
}
