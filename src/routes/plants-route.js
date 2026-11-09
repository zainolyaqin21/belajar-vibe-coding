import { Elysia, t } from "elysia";
import {
  createPlant,
  getAllPlants,
  getPlantById,
  updatePlant,
  deletePlant,
} from "../services/plants-service.js";
import { authPlugin } from "../middlewares/auth-middleware.js";

export const plantsRoute = new Elysia({ prefix: "/api/plants" })
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
        message: "Validasi gagal: data tidak valid atau tidak lengkap",
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

  // POST /api/plants — Tambah tanaman baru
  .post(
    "/",
    async ({ user, body, set }) => {
      try {
        const { name, tanggal } = body;
        const newPlant = await createPlant({
          userId: user.id,
          name,
          tanggal,
        });

        set.status = 201;
        return {
          success: true,
          message: "Tanaman berhasil ditambahkan ke tracker",
          data: newPlant,
        };
      } catch (error) {
        set.status = error.statusCode || 500;
        return {
          success: false,
          message: error.message || "Gagal menambahkan data tanaman",
          error: error.message || "Gagal menambahkan data tanaman",
        };
      }
    },
    {
      body: t.Object({
        name: t.String({
          minLength: 1,
          maxLength: 255,
          description: "Nama tanaman yang akan dilacak",
        }),
        tanggal: t.String({
          minLength: 1,
          description: "Tanggal dan waktu penanaman / tracking",
        }),
      }),
    }
  )

  // GET /api/plants — Ambil daftar tanaman user dengan pagination opsional
  .get(
    "/",
    async ({ user, query, set }) => {
      try {
        const page = query?.page ? Number(query.page) : undefined;
        const limit = query?.limit ? Number(query.limit) : undefined;

        const result = await getAllPlants(user.id, { page, limit });

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
      } catch (error) {
        set.status = error.statusCode || 500;
        return {
          success: false,
          message: error.message || "Gagal mengambil data tanaman",
          error: error.message || "Gagal mengambil data tanaman",
        };
      }
    },
    {
      query: t.Optional(
        t.Object({
          page: t.Optional(t.Numeric()),
          limit: t.Optional(t.Numeric()),
        })
      ),
    }
  )

  // GET /api/plants/:id — Ambil satu tanaman by ID
  .get(
    "/:id",
    async ({ user, params, set }) => {
      try {
        const id = Number(params.id);
        const plant = await getPlantById(id, user.id);

        set.status = 200;
        return {
          success: true,
          data: plant,
        };
      } catch (error) {
        set.status = error.statusCode || 500;
        return {
          success: false,
          message: error.message || "Tanaman tidak ditemukan",
          error: error.message || "Tanaman tidak ditemukan",
        };
      }
    },
    {
      params: t.Object({
        id: t.Numeric({
          description: "ID tanaman yang akan diambil",
        }),
      }),
    }
  )

  // PUT /api/plants/:id — Update data tanaman
  .put(
    "/:id",
    async ({ user, params, body, set }) => {
      try {
        const id = Number(params.id);
        const { name, tanggal } = body;

        const updated = await updatePlant(id, user.id, { name, tanggal });

        set.status = 200;
        return {
          success: true,
          message: "Tanaman berhasil diperbarui",
          data: updated,
        };
      } catch (error) {
        set.status = error.statusCode || 500;
        return {
          success: false,
          message: error.message || "Gagal memperbarui data tanaman",
          error: error.message || "Gagal memperbarui data tanaman",
        };
      }
    },
    {
      params: t.Object({
        id: t.Numeric({
          description: "ID tanaman yang akan diperbarui",
        }),
      }),
      body: t.Object({
        name: t.Optional(
          t.String({
            minLength: 1,
            maxLength: 255,
            description: "Nama baru tanaman",
          })
        ),
        tanggal: t.Optional(
          t.String({
            minLength: 1,
            description: "Tanggal baru penanaman / tracking",
          })
        ),
      }),
    }
  )

  // DELETE /api/plants/:id — Hapus tanaman
  .delete(
    "/:id",
    async ({ user, params, set }) => {
      try {
        const id = Number(params.id);
        await deletePlant(id, user.id);

        set.status = 200;
        return {
          success: true,
          message: "Tanaman berhasil dihapus",
        };
      } catch (error) {
        set.status = error.statusCode || 500;
        return {
          success: false,
          message: error.message || "Gagal menghapus data tanaman",
          error: error.message || "Gagal menghapus data tanaman",
        };
      }
    },
    {
      params: t.Object({
        id: t.Numeric({
          description: "ID tanaman yang akan dihapus",
        }),
      }),
    }
  );
