import { Elysia, t } from "elysia";
import {
  createLog,
  getLogsByPlantId,
  updateLog,
  deleteLog,
} from "../services/plant-logs-service.js";

// Router untuk POST /api/plants/:id/logs dan GET /api/plants/:id/logs
const plantLogsRoute = new Elysia({ prefix: "/api/plants" })

  // POST /api/plants/:id/logs — Tambah catatan log baru
  .post(
    "/:id/logs",
    async ({ params, body, set }) => {
      const plantId = Number(params.id);
      const newLog = await createLog(plantId, body);

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
    },
    {
      params: t.Object({ id: t.Numeric() }),
      body: t.Object({
        catatan: t.String({ minLength: 1 }),
        foto: t.Optional(t.String()),
      }),
    }
  )

  // GET /api/plants/:id/logs — Ambil semua log per tanaman
  .get(
    "/:id/logs",
    async ({ params, set }) => {
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
    },
    {
      params: t.Object({ id: t.Numeric() }),
    }
  );

// Router terpisah untuk PUT /api/plants/logs/:logId dan DELETE /api/plants/logs/:logId
const plantLogsCrudRoute = new Elysia({ prefix: "/api/plants/logs" })

  // PUT /api/plants/logs/:logId — Update catatan log
  .put(
    "/:logId",
    async ({ params, body, set }) => {
      const logId = Number(params.logId);
      const updated = await updateLog(logId, body);

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
    },
    {
      params: t.Object({ logId: t.Numeric() }),
      body: t.Object({
        catatan: t.Optional(t.String({ minLength: 1 })),
        foto: t.Optional(t.String()),
      }),
    }
  )

  // DELETE /api/plants/logs/:logId — Hapus catatan log
  .delete(
    "/:logId",
    async ({ params, set }) => {
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
    },
    {
      params: t.Object({ logId: t.Numeric() }),
    }
  );

export { plantLogsRoute, plantLogsCrudRoute };
