import { Elysia, t } from "elysia";
import { mkdir } from "node:fs/promises";
import { join, extname } from "node:path";
import {
  createLog,
  getLogsByPlantId,
  updateLog,
  deleteLog,
} from "../services/plant-logs-service.js";

/**
 * Menyimpan berkas foto upload ke direktori public/uploads
 * @param {File|Blob|string|null|undefined} foto
 * @returns {Promise<string|null>} Path relatif URL foto atau null
 */
async function processPhotoUpload(foto) {
  if (!foto) return null;

  // Jika input berupa string path/URL
  if (typeof foto === "string") {
    const trimmed = foto.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  // Jika input berupa berkas File / Blob dari FormData
  if (typeof foto === "object" && typeof foto.arrayBuffer === "function") {
    if (foto.size === 0) return null;

    const uploadDir = join(process.cwd(), "public", "uploads");
    await mkdir(uploadDir, { recursive: true });

    const originalName = foto.name || "plant.jpg";
    const ext = extname(originalName) || ".jpg";
    const safeExt = [".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(ext.toLowerCase())
      ? ext.toLowerCase()
      : ".jpg";
    const uniqueName = `log_${Date.now()}_${Math.random().toString(36).substring(2, 9)}${safeExt}`;
    const targetPath = join(uploadDir, uniqueName);

    const buffer = await foto.arrayBuffer();
    await Bun.write(targetPath, buffer);

    return `/uploads/${uniqueName}`;
  }

  return null;
}

// Router untuk POST /api/plants/:id/logs dan GET /api/plants/:id/logs
const plantLogsRoute = new Elysia({ prefix: "/api/plants" })
  .onError(({ code, error, set }) => {
    if (code === "VALIDATION") {
      set.status = 400;
      if (error.type === "params") {
        return {
          success: false,
          message: "Validasi gagal: parameter ID tidak valid",
        };
      }
      return {
        success: false,
        message: "Validasi gagal: data catatan jurnal tidak valid atau tidak lengkap",
        details: error.validator?.Errors
          ? [...error.validator.Errors(error.value)].map((e) => e.message)
          : error.message,
      };
    }

    set.status = error.statusCode || 500;
    return {
      success: false,
      message: error.message || "Terjadi kesalahan pada server",
    };
  })

  // POST /api/plants/:id/logs — Tambah catatan log baru
  .post(
    "/:id/logs",
    async ({ params, body, set }) => {
      try {
        const plantId = Number(params.id);
        const fotoPath = body.foto ? await processPhotoUpload(body.foto) : null;

        const newLog = await createLog(plantId, {
          catatan: body.catatan,
          foto: fotoPath,
        });

        if (newLog === null) {
          set.status = 404;
          return { success: false, error: "Tanaman tidak ditemukan" };
        }

        set.status = 201;
        return {
          success: true,
          message: "Catatan jurnal berhasil ditambahkan",
          data: {
            id: newLog.id,
            plant_id: newLog.plantId,
            catatan: newLog.catatan,
            foto: newLog.foto,
            created_at: newLog.createdAt,
          },
        };
      } catch (err) {
        set.status = err.statusCode || 500;
        return {
          success: false,
          message: err.message || "Gagal menambahkan catatan jurnal",
        };
      }
    },
    {
      params: t.Object({ id: t.Numeric() }),
      body: t.Object({
        catatan: t.String({ minLength: 1 }),
        foto: t.Optional(t.Union([t.File(), t.String()])),
      }),
    }
  )

  // GET /api/plants/:id/logs — Ambil semua log per tanaman
  .get(
    "/:id/logs",
    async ({ params, set }) => {
      try {
        const plantId = Number(params.id);
        const logs = await getLogsByPlantId(plantId);

        if (logs === null) {
          set.status = 404;
          return { success: false, error: "Tanaman tidak ditemukan" };
        }

        return {
          success: true,
          data: logs.map((log) => ({
            id: log.id,
            plant_id: log.plantId,
            catatan: log.catatan,
            foto: log.foto,
            created_at: log.createdAt,
          })),
        };
      } catch (err) {
        set.status = err.statusCode || 500;
        return {
          success: false,
          message: err.message || "Gagal mengambil data catatan jurnal",
        };
      }
    },
    {
      params: t.Object({ id: t.Numeric() }),
    }
  );

// Router terpisah untuk PUT /api/plants/logs/:logId dan DELETE /api/plants/logs/:logId
const plantLogsCrudRoute = new Elysia({ prefix: "/api/plants/logs" })
  .onError(({ code, error, set }) => {
    if (code === "VALIDATION") {
      set.status = 400;
      if (error.type === "params") {
        return {
          success: false,
          message: "Validasi gagal: parameter ID tidak valid",
        };
      }
      return {
        success: false,
        message: "Validasi gagal: data catatan jurnal tidak valid atau tidak lengkap",
        details: error.validator?.Errors
          ? [...error.validator.Errors(error.value)].map((e) => e.message)
          : error.message,
      };
    }

    set.status = error.statusCode || 500;
    return {
      success: false,
      message: error.message || "Terjadi kesalahan pada server",
    };
  })

  // PUT /api/plants/logs/:logId — Update catatan log
  .put(
    "/:logId",
    async ({ params, body, set }) => {
      try {
        const logId = Number(params.logId);
        const updatePayload = {};

        if (body.catatan !== undefined) {
          updatePayload.catatan = body.catatan;
        }

        if (body.foto !== undefined) {
          updatePayload.foto = await processPhotoUpload(body.foto);
        }

        const updated = await updateLog(logId, updatePayload);

        if (updated === null) {
          set.status = 404;
          return { success: false, error: "Catatan jurnal tidak ditemukan" };
        }

        return {
          success: true,
          message: "Catatan jurnal berhasil diperbarui",
          data: {
            id: updated.id,
            plant_id: updated.plantId,
            catatan: updated.catatan,
            foto: updated.foto,
            created_at: updated.createdAt,
          },
        };
      } catch (err) {
        set.status = err.statusCode || 500;
        return {
          success: false,
          message: err.message || "Gagal memperbarui catatan jurnal",
        };
      }
    },
    {
      params: t.Object({ logId: t.Numeric() }),
      body: t.Object({
        catatan: t.Optional(t.String({ minLength: 1 })),
        foto: t.Optional(t.Union([t.File(), t.String()])),
      }),
    }
  )

  // DELETE /api/plants/logs/:logId — Hapus catatan log
  .delete(
    "/:logId",
    async ({ params, set }) => {
      try {
        const logId = Number(params.logId);
        const deleted = await deleteLog(logId);

        if (!deleted) {
          set.status = 404;
          return { success: false, error: "Catatan jurnal tidak ditemukan" };
        }

        return {
          success: true,
          message: "Catatan jurnal berhasil dihapus",
        };
      } catch (err) {
        set.status = err.statusCode || 500;
        return {
          success: false,
          message: err.message || "Gagal menghapus catatan jurnal",
        };
      }
    },
    {
      params: t.Object({ logId: t.Numeric() }),
    }
  );

export { plantLogsRoute, plantLogsCrudRoute };
