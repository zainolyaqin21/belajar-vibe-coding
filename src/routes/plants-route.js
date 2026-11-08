import { Elysia, t } from "elysia";
import { createPlant, getAllPlants } from "../services/plants-service.js";

export const plantsRoute = new Elysia({ prefix: "/api/plants" })
  .onError(({ code, error, set }) => {
    if (code === "VALIDATION") {
      set.status = 400;
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
  });

// Alias untuk menjaga backward compatibility
export const plantRoute = plantsRoute;

