import { Elysia, t } from "elysia";
import {
  registerUser,
  loginUser,
  getCurrentUser,
  logoutUser,
  getUserProfile,
  updateUserProfile,
  updateUserAvatar,
  changeUserPassword,
} from "../services/users-service.js";
import { extractBearerToken, authPlugin } from "../middlewares/auth-middleware.js";

export const usersRoute = new Elysia({ prefix: "/api/users" })
  .onError(({ code, error, set, path }) => {
    // Penanganan error khusus endpoint /logout
    if (path.endsWith("/logout")) {
      set.status = error.statusCode || 401;
      return {
        success: false,
        message: error.message || "Unauthorized",
        error: error.message || "unauthorized",
      };
    }

    // Penanganan error khusus endpoint /login
    if (path.endsWith("/login")) {
      set.status = error.statusCode || (code === "VALIDATION" ? 400 : 401);
      return {
        success: false,
        message: error.message || "Email atau password salah",
        error: error.message || "Email atau password salah",
      };
    }

    // Penanganan error khusus endpoint /current
    if (path.endsWith("/current")) {
      set.status = error.statusCode || 401;
      return {
        success: false,
        message: error.message || "Unauthorized",
        error: error.message || "Unauthorized",
      };
    }

    if (code === "VALIDATION") {
      set.status = 400;
      const details = error.validator?.Errors
        ? [...error.validator.Errors(error.value)].map((e) => e.message)
        : error.message;
      return {
        success: false,
        message: "Validasi gagal: email tidak valid atau data tidak lengkap",
        error: "Validasi gagal",
        details,
      };
    }

    set.status = error.statusCode || 500;
    return {
      success: false,
      message: error.message || "Terjadi kesalahan pada server",
      error: error.message || "Terjadi kesalahan pada server",
    };
  })

  // POST /api/users/login
  .post(
    "/login",
    async ({ body, set }) => {
      try {
        const { email, password } = body;
        const token = await loginUser({ email, password });

        set.status = 200;
        return {
          success: true,
          message: "Login berhasil",
          data: token,
          token,
        };
      } catch (error) {
        set.status = error.statusCode || 401;
        return {
          success: false,
          message: error.message || "Email atau password salah",
          error: error.message || "Email atau password salah",
        };
      }
    },
    {
      body: t.Object({
        email: t.String({ format: "email" }),
        password: t.String({ minLength: 1 }),
      }),
    }
  )

  // GET /api/users/current
  .get("/current", async ({ headers, set }) => {
    try {
      const token = extractBearerToken(headers);
      const user = await getCurrentUser(token);

      set.status = 200;
      return {
        success: true,
        data: user,
      };
    } catch (error) {
      set.status = error.statusCode || 401;
      return {
        success: false,
        message: error.message || "Unauthorized",
        error: error.message || "Unauthorized",
      };
    }
  })

  // DELETE /api/users/logout
  .delete("/logout", async ({ headers, set }) => {
    try {
      const token = extractBearerToken(headers);
      await logoutUser(token);

      set.status = 200;
      return {
        success: true,
        message: "Logout berhasil",
        data: "ok",
      };
    } catch (error) {
      set.status = error.statusCode || 401;
      return {
        success: false,
        message: error.message || "Unauthorized",
        error: error.message || "unauthorized",
      };
    }
  })

  // POST /api/users/register (satu-satunya handler register)
  .post(
    "/register",
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
        set.status = error.statusCode || 500;
        return {
          success: false,
          message: error.message || "Terjadi kesalahan pada server",
          error: error.message || "Terjadi kesalahan pada server",
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

// Alias untuk menjaga backward compatibility import
export const userRoutes = usersRoute;

/**
 * Route untuk User Profile & Account Management
 * Prefix: /api/user (mendukung /api/user dan /api/users via alias jika dibutuhkan)
 */
export const userProfileRoute = new Elysia({ prefix: "/api/user" })
  .onError(({ code, error, set }) => {
    if (code === "VALIDATION") {
      set.status = 400;
      const details = error.validator?.Errors
        ? [...error.validator.Errors(error.value)].map((e) => e.message)
        : error.message;
      return {
        success: false,
        message: "Validasi gagal: format data tidak sesuai",
        error: "Validasi gagal",
        details,
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

  // GET /api/user/profile & alias /api/user/profil
  .get("/profile", async ({ user, set }) => {
    const profile = await getUserProfile(user.id);
    set.status = 200;
    return {
      success: true,
      message: "Data profil berhasil diambil",
      data: profile,
    };
  })
  .get("/profil", async ({ user, set }) => {
    const profile = await getUserProfile(user.id);
    set.status = 200;
    return {
      success: true,
      message: "Data profil berhasil diambil",
      data: profile,
    };
  })

  // PUT /api/user/profile
  .put(
    "/profile",
    async ({ user, body, set }) => {
      const updated = await updateUserProfile(user.id, { name: body.name });
      set.status = 200;
      return {
        success: true,
        message: "Profil berhasil diperbarui",
        data: updated,
      };
    },
    {
      body: t.Object({
        name: t.String({ minLength: 2, maxLength: 255 }),
      }),
    }
  )

  // POST /api/user/avatar (multipart/form-data)
  .post(
    "/avatar",
    async ({ user, body, set }) => {
      const file = body.avatar || body.foto;
      const result = await updateUserAvatar(user.id, file);
      set.status = 200;
      return {
        success: true,
        message: "Foto profil berhasil diperbarui",
        data: result,
      };
    },
    {
      body: t.Object({
        avatar: t.Optional(t.Any()),
        foto: t.Optional(t.Any()),
      }),
    }
  )

  // PUT /api/user/change_password
  .put(
    "/change_password",
    async ({ user, body, set }) => {
      await changeUserPassword(user.id, {
        oldPassword: body.oldPassword,
        newPassword: body.newPassword,
        confirmPassword: body.confirmPassword,
      });
      set.status = 200;
      return {
        success: true,
        message: "Password berhasil diperbarui",
      };
    },
    {
      body: t.Object({
        oldPassword: t.String({ minLength: 1 }),
        newPassword: t.String({ minLength: 6, maxLength: 255 }),
        confirmPassword: t.Optional(t.String({ minLength: 6, maxLength: 255 })),
      }),
    }
  );
