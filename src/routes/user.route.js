import { Elysia, t } from "elysia";
import { registerUser } from "../services/user.service.js";

export const userRoutes = new Elysia({ prefix: "/api/users" })
  .onError(({ code, error, set }) => {
    if (code === "VALIDATION") {
      set.status = 400;
      return {
        success: false,
        message: "Validasi gagal: email tidak valid atau data tidak lengkap",
        details: error.validator?.Errors
          ? [...error.validator.Errors(error.value)].map((e) => e.message)
          : error.message,
      };
    }
  })
  .post(
    "/",
    async ({ body, set }) => {
      try {
        const { name, email, password } = body;
        const newUser = await registerUser({ name, email, password });

        set.status = 201;
        return {
          success: true,
          message: "User berhasil didaftarkan",
          data: newUser,
        };
      } catch (error) {
        if (error.statusCode === 409) {
          set.status = 409;
          return {
            success: false,
            message: error.message,
          };
        }

        set.status = error.statusCode || 500;
        return {
          success: false,
          message: error.message || "Terjadi kesalahan pada server",
        };
      }
    },
    {
      body: t.Object({
        name: t.String({
          minLength: 2,
          maxLength: 255,
          description: "Nama lengkap user",
        }),
        email: t.String({
          format: "email",
          maxLength: 255,
          description: "Alamat email user yang valid",
        }),
        password: t.String({
          minLength: 6,
          maxLength: 255,
          description: "Password minimal 6 karakter",
        }),
      }),
    }
  );
