import { Elysia, t } from "elysia";
import {
  createLog,
  getLogsByPlantId,
  getLogById,
  updateLog,
  deleteLog,
} from "../services/plant-logs-service.js";
import { authPlugin } from "../middlewares/auth-middleware.js";
import { processPhotoUpload } from "../utils/upload-helper.js";

// Router untuk /api/plants/:id/logs
const plantLogsRoute = new Elysia({ prefix: "/api/plants" })
  .onError(({ code, error, set }) => {
    if (code === "VALIDATION") {
      set.status = 400;
      if (error.type === "params") {
        return {
          success: false,
          message: "Validasi gagal: parameter ID tidak valid",
          error: "Validasi gagal: parameter ID tidak valid",
        };
      }
      return {
        success: false,
        message: "Validasi gagal: data catatan jurnal tidak valid atau tidak lengkap",
        error: "Validasi gagal",
        details: error.validator?.Errors
          ? [...error.validator.Errors(error.value)].map((e) => e.message)
          : error.message,
      };
    }

    set.status = error.statusCode || 500;
    return {
      success: false,
      message: error.message || "Terjadi kesalahan pada server",
      error: error.message || "Terjadi kesalahan pada server",
    };
  })
  .use(authPlugin)

  // POST /api/plants/:id/logs — Tambah catatan log baru
  .post(
    "/:id/logs",
    async ({ user, params, body, set }) => {
      try {
        const plantId = Number(params.id);
        const fotoPath = body.foto ? await processPhotoUpload(body.foto) : null;

        const newLog = await createLog(plantId, user.id, {
          catatan: body.catatan,
          foto: fotoPath,
        });

        set.status = 201;
        return {
          success: true,
          message: "Catatan jurnal berhasil ditambahkan",
          data: newLog,
        };
      } catch (err) {
        set.status = err.statusCode || 500;
        return {
          success: false,
          message: err.message || "Gagal menambahkan catatan jurnal",
          error: err.message || "Gagal menambahkan catatan jurnal",
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
    async ({ user, params, query, set }) => {
      try {
        const plantId = Number(params.id);
        const page = query?.page ? Number(query.page) : undefined;
        const limit = query?.limit ? Number(query.limit) : undefined;

        const result = await getLogsByPlantId(plantId, user.id, { page, limit });

        set.status = 200;
        if (result && !Array.isArray(result) && result.pagination) {
          return {
            success: true,
            data: result.data,
            pagination: result.pagination,
          };
        }

        return {
          success: true,
          data: result,
        };
      } catch (err) {
        set.status = err.statusCode || 500;
        return {
          success: false,
          message: err.message || "Gagal mengambil data catatan jurnal",
          error: err.message || "Gagal mengambil data catatan jurnal",
        };
      }
    },
    {
      params: t.Object({ id: t.Numeric() }),
      query: t.Optional(
        t.Object({
          page: t.Optional(t.Numeric()),
          limit: t.Optional(t.Numeric()),
        })
      ),
    }
  );

// Router untuk /api/plants/logs/:logId (GET, PUT, DELETE)
const plantLogsCrudRoute = new Elysia({ prefix: "/api/plants/logs" })
  .onError(({ code, error, set }) => {
    if (code === "VALIDATION") {
      set.status = 400;
      if (error.type === "params") {
        return {
          success: false,
          message: "Validasi gagal: parameter ID tidak valid",
          error: "Validasi gagal: parameter ID tidak valid",
        };
      }
      return {
        success: false,
        message: "Validasi gagal: data catatan jurnal tidak valid atau tidak lengkap",
        error: "Validasi gagal",
        details: error.validator?.Errors
          ? [...error.validator.Errors(error.value)].map((e) => e.message)
          : error.message,
      };
    }

    set.status = error.statusCode || 500;
    return {
      success: false,
      message: error.message || "Terjadi kesalahan pada server",
      error: error.message || "Terjadi kesalahan pada server",
    };
  })
  .use(authPlugin)

  // GET /api/plants/logs/:logId — Ambil satu catatan log by ID
  .get(
    "/:logId",
    async ({ user, params, set }) => {
      try {
        const logId = Number(params.logId);
        const log = await getLogById(logId, user.id);

        set.status = 200;
        return {
          success: true,
          data: log,
        };
      } catch (err) {
        set.status = err.statusCode || 500;
        return {
          success: false,
          message: err.message || "Catatan jurnal tidak ditemukan",
          error: err.message || "Catatan jurnal tidak ditemukan",
        };
      }
    },
    {
      params: t.Object({ logId: t.Numeric() }),
    }
  )

  // PUT /api/plants/logs/:logId — Update catatan log
  .put(
    "/:logId",
    async ({ user, params, body, set }) => {
      try {
        const logId = Number(params.logId);
        const updatePayload = {};

        if (body.catatan !== undefined) {
          updatePayload.catatan = body.catatan;
        }

        if (body.foto !== undefined) {
          updatePayload.foto = await processPhotoUpload(body.foto);
        }

        const updated = await updateLog(logId, user.id, updatePayload);

        set.status = 200;
        return {
          success: true,
          message: "Catatan jurnal berhasil diperbarui",
          data: updated,
        };
      } catch (err) {
        set.status = err.statusCode || 500;
        return {
          success: false,
          message: err.message || "Gagal memperbarui catatan jurnal",
          error: err.message || "Gagal memperbarui catatan jurnal",
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
    async ({ user, params, set }) => {
      try {
        const logId = Number(params.logId);
        await deleteLog(logId, user.id);

        set.status = 200;
        return {
          success: true,
          message: "Catatan jurnal berhasil dihapus",
        };
      } catch (err) {
        set.status = err.statusCode || 500;
        return {
          success: false,
          message: err.message || "Gagal menghapus catatan jurnal",
          error: err.message || "Gagal menghapus catatan jurnal",
        };
      }
    },
    {
      params: t.Object({ logId: t.Numeric() }),
    }
  );

export { plantLogsRoute, plantLogsCrudRoute };
