import { Elysia, t } from "elysia";
import { createPlant, getAllPlants, updatePlant, deletePlant } from "../services/plants-service.js";

export const plantsRoute = new Elysia({ prefix: "/api/plants" })
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
        message: "Validasi gagal: nama dan tanggal wajib diisi",
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
  .post(
    "/",
    async ({ body, set }) => {
      try {
        const { name, tanggal } = body;
        const newPlant = await createPlant({ name, tanggal });

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
  .get("/", async ({ set }) => {
    try {
      const data = await getAllPlants();

      set.status = 200;
      return {
        success: true,
        data,
      };
    } catch (error) {
      set.status = error.statusCode || 500;
      return {
        success: false,
        message: error.message || "Gagal mengambil data tanaman",
      };
    }
  })
  .put(
    "/:id",
    async ({ params, body, set }) => {
      try {
        const id = Number(params.id);
        const { name, tanggal } = body;

        const updated = await updatePlant(id, { name, tanggal });

        set.status = 200;
        return {
          success: true,
          message: "Tanaman berhasil diperbarui",
          data: updated,
        };
      } catch (error) {
        if (error.statusCode === 404) {
          set.status = 404;
          return {
            success: false,
            error: error.message || "Tanaman tidak ditemukan",
          };
        }

        set.status = error.statusCode || 500;
        return {
          success: false,
          message: error.message || "Gagal memperbarui data tanaman",
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
  .delete(
    "/:id",
    async ({ params, set }) => {
      try {
        const id = Number(params.id);

        await deletePlant(id);

        set.status = 200;
        return {
          success: true,
          message: "Tanaman berhasil dihapus",
        };
      } catch (error) {
        if (error.statusCode === 404) {
          set.status = 404;
          return {
            success: false,
            error: error.message || "Tanaman tidak ditemukan",
          };
        }

        set.status = error.statusCode || 500;
        return {
          success: false,
          message: error.message || "Gagal menghapus data tanaman",
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

// Alias untuk menjaga backward compatibility
export const plantRoute = plantsRoute;

