# ISSUE #01: Implementasi Fitur Profil Pengguna & Manajemen Akun (AgriTracker)

> **Target Pelaksana**: Junior Programmer / AI Model (Budget/Standard)  
> **Tingkat Kesulitan**: Menengah (*Intermediate*)  
> **Estimasi Pengerjaan**: 3 - 5 Jam  
> **Status**: Ready for Implementation  

---

## 📌 Ringkasan Eksekutif (Context & Goals)

Aplikasi **AgriTracker** (Jurnal Pertumbuhan Tanaman) saat ini sudah memiliki fungsionalitas autentikasi dasar (*register*, *login*, *logout*, *get current user*) serta modul manajemen tanaman (*plants*) dan catatan perkembangan tanaman (*plant logs*).

Tujuan dari issue ini adalah melengkapi AgriTracker dengan **Fitur Profil Pengguna Lengkap**, yang mencakup:
1. Pembaruan tabel `users` di database agar dapat menyimpan foto profil / avatar pengguna.
2. Endpoint API profil pengguna (`GET /api/user/profile`, `PUT /api/user/profile`).
3. Endpoint upload avatar (`POST /api/user/avatar`) dengan mekanisme **otomatis menghapus berkas foto lama dari disk** sebelum menyimpan foto baru.
4. Endpoint ganti password (`PUT /api/user/change_password`) yang mewajibkan **verifikasi password lama** menggunakan hashing bcrypt.
5. Antarmuka Frontend Profil Pengguna (`public/profile.html` & tautan dari `public/dashboard.html`) agar pengguna dapat langsung menguji dan memperbarui foto, data profil, serta password.

---

## 🛠️ Tech Stack & Konvensi Arsitektur

Pastikan kode yang ditulis mengikuti konvensi yang sudah ada dalam repositori ini:

* **Runtime & Package Manager**: [Bun](https://bun.sh/)
* **Backend Framework**: [Elysia.js](https://elysiajs.com/)
* **ORM & Database**: [Drizzle ORM](https://orm.drizzle.team/) dengan dialek **MySQL** (`mysql2`)
* **Autentikasi**: Bearer Token UUID yang disimpan di tabel `sessions` (dikelola via `authPlugin` atau `extractBearerToken`)
* **Pengolahan Berkas & Upload**: Utilitas `upload-helper.js` (`processPhotoUpload`, `deleteUploadedPhoto`)
* **Frontend**: HTML5 murni, [Tailwind CSS](https://tailwindcss.com/) (CDN), dan [Lucide Icons](https://lucide.dev/) (CDN)
* **Konvensi Penamaan Berkas**:
  * Routing Elysia: `src/routes/*-route.js` (contoh: `users-route.js`, `plants-route.js`)
  * Business Logic / Services: `src/services/*-service.js` (contoh: `users-service.js`, `plants-service.js`)
  * Ekstensi: Gunakan format ESM `.js` sesuai basis kode yang berjalan (atau `.ts` jika proyek dimigrasikan ke TypeScript penuh).

---

## 🗄️ 1. Pembaruan Skema Database (Database Schema)

### Berkas Target: `src/db/schema.js`

Tambahkan kolom `avatar` (dan opsional `updatedAt`) pada tabel `users`.

```javascript
// src/db/schema.js
import { mysqlTable, serial, varchar, text, timestamp, bigint, datetime } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  avatar: varchar("avatar", { length: 255 }), // Kolom baru: path URL foto profil (misal: /uploads/avatar_123.jpg)
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(), // Opsional / Disarankan
});
```

### Langkah Migrasi:
Jalankan perintah berikut di terminal:
```bash
# Generate file migrasi SQL baru
bun run db:generate

# Eksekusi migrasi ke database MySQL
bun run db:migrate
# Atau jika menggunakan push langsung di lingkungan dev:
# bun run db:push
```

---

## 🔌 2. Spesifikasi Lengkap Endpoint API

Semua endpoint profil di bawah ini **WAJIB AUTENTIKASI** menggunakan Bearer token pada header:
```http
Authorization: Bearer <user_session_token>
```
Gunakan `authPlugin` dari `src/middlewares/auth-middleware.js` atau helper `extractBearerToken(headers)` + `getCurrentUser(token)`.

---

### A. GET `/api/user/profile` (dan alias `/api/user/profil`)
* **Deskripsi**: Mengambil data profil lengkap pengguna yang sedang aktif/login.
* **Autentikasi**: Wajib (Bearer Token)
* **Method**: `GET`
* **URL**: `/api/user/profile` (Buat alias juga untuk `/api/user/profil` agar kompatibel dengan typo spesifikasi)

#### Respon Berhasil (HTTP 200 OK):
```json
{
  "success": true,
  "message": "Data profil berhasil diambil",
  "data": {
    "id": 1,
    "name": "Budi Santoso",
    "email": "budi@example.com",
    "avatar": "/uploads/avatar_1715000000_abc123.jpg",
    "created_at": "2026-11-09T14:00:00.000Z"
  }
}
```
> **Catatan Keamanan**: Jangan pernah sertakan kolom `password` dalam respon JSON!

#### Respon Gagal (HTTP 401 Unauthorized):
```json
{
  "success": false,
  "message": "Unauthorized",
  "error": "Unauthorized"
}
```

---

### B. PUT `/api/user/profile`
* **Deskripsi**: Memperbarui informasi dasar pengguna (nama lengkap).
* **Autentikasi**: Wajib (Bearer Token)
* **Method**: `PUT`
* **Content-Type**: `application/json`

#### Request Body:
```json
{
  "name": "Budi Santoso Updated"
}
```

#### Validasi Skema (Elysia TypeBox `t`):
```javascript
body: t.Object({
  name: t.String({ minLength: 2, maxLength: 255, description: "Nama lengkap user" })
})
```

#### Respon Berhasil (HTTP 200 OK):
```json
{
  "success": true,
  "message": "Profil berhasil diperbarui",
  "data": {
    "id": 1,
    "name": "Budi Santoso Updated",
    "email": "budi@example.com",
    "avatar": "/uploads/avatar_1715000000_abc123.jpg",
    "created_at": "2026-11-09T14:00:00.000Z"
  }
}
```

#### Respon Gagal Validasi (HTTP 400 Bad Request):
```json
{
  "success": false,
  "message": "Validasi gagal: nama minimal 2 karakter",
  "error": "Validasi gagal"
}
```

---

### C. POST `/api/user/avatar`
* **Deskripsi**: Mengunggah foto profil baru.
* **Autentikasi**: Wajib (Bearer Token)
* **Method**: `POST`
* **Content-Type**: `multipart/form-data`
* **Field Form**: `avatar` (atau `foto`), berupa file gambar (JPG, PNG, WEBP, maks 5MB).

#### ⚠️ Alur Logika Bisnis Krusial (Wajib Diikuti):
1. Dapatkan `userId` dari sesi pengguna yang terotentikasi.
2. Ambil record pengguna saat ini dari database untuk mengecek nilai `users.avatar` lama.
3. **Pembersihan Berkas Lama**: Jika pengguna sebelumnya sudah memiliki avatar (misal: `/uploads/avatar_lama.png`):
   * Panggil fungsi `deleteUploadedPhoto(existingAvatarPath)` dari `src/utils/upload-helper.js` untuk menghapus file fisik tersebut dari server (`public/uploads/...`).
4. **Penyimpanan Berkas Baru**:
   * Simpan file gambar baru menggunakan helper `processPhotoUpload(body.avatar || body.foto)`.
   * Helper ini akan memvalidasi batas ukuran (5MB), ekstensi file, magic bytes, serta menghasilkan nama unik di folder `public/uploads/`.
5. **Update Database**:
   * Simpan path URL baru yang dihasilkan (misal `/uploads/log_123456_xxx.jpg`) ke kolom `avatar` pada tabel `users`.
6. Kembalikan respon sukses.

#### Respon Berhasil (HTTP 200 OK):
```json
{
  "success": true,
  "message": "Foto profil berhasil diperbarui",
  "data": {
    "avatar": "/uploads/avatar_1715001234_xyz789.png"
  }
}
```

#### Respon Gagal (HTTP 400 Bad Request):
```json
{
  "success": false,
  "message": "Format berkas tidak valid atau rusak. Hanya gambar asli (JPEG, PNG, WEBP) yang diperbolehkan",
  "error": "Bad Request"
}
```

---

### D. PUT `/api/user/change_password`
* **Deskripsi**: Mengubah password akun pengguna dengan verifikasi password lama.
* **Autentikasi**: Wajib (Bearer Token)
* **Method**: `PUT`
* **Content-Type**: `application/json`

#### Request Body:
```json
{
  "oldPassword": "passwordLama123",
  "newPassword": "passwordBaruRahasia456",
  "confirmPassword": "passwordBaruRahasia456"
}
```

#### Validasi Skema (Elysia TypeBox `t`):
```javascript
body: t.Object({
  oldPassword: t.String({ minLength: 1, description: "Password lama untuk verifikasi" }),
  newPassword: t.String({ minLength: 6, maxLength: 255, description: "Password baru minimal 6 karakter" }),
  confirmPassword: t.Optional(t.String({ minLength: 6, maxLength: 255 }))
})
```

#### ⚠️ Alur Logika Bisnis:
1. Ambil data user dari database lengkap dengan field `users.password` (hash password tersimpan).
2. Verifikasi kesesuaian `oldPassword` dengan hash di database menggunakan `Bun.password.verify(oldPassword, user.password)`.
   * Jika TIDAK cocok: Lempar `AppError("Password lama tidak sesuai", 400)`.
3. Validasi konfirmasi password: Jika `confirmPassword` dikirim, pastikan `newPassword === confirmPassword`. Jika tidak cocok: lempar `AppError("Konfirmasi password baru tidak cocok", 400)`.
4. Validasi kebaruan: Pastikan `newPassword !== oldPassword`. Jika sama, lempar `AppError("Password baru tidak boleh sama dengan password lama", 400)`.
5. Hash password baru menggunakan:
   ```javascript
   const hashedNewPassword = await Bun.password.hash(newPassword, {
     algorithm: "bcrypt",
     cost: 10,
   });
   ```
6. Update field `password` di tabel `users` dengan hash baru menggunakan Drizzle ORM.
7. Kembalikan respon sukses.

#### Respon Berhasil (HTTP 200 OK):
```json
{
  "success": true,
  "message": "Password berhasil diperbarui"
}
```

#### Respon Gagal Password Lama Salah (HTTP 400 Bad Request):
```json
{
  "success": false,
  "message": "Password lama tidak sesuai",
  "error": "Password lama tidak sesuai"
}
```

---

## 🧱 3. Desain Logika Bisnis (Services)

### Berkas Target: `src/services/users-service.js`

Tambahkan fungsi-fungsi berikut pada `users-service.js`:

```javascript
import { db } from "../db/index.js";
import { users, sessions } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { AppError } from "../utils/app-error.js";
import { processPhotoUpload, deleteUploadedPhoto } from "../utils/upload-helper.js";

/**
 * 1. Mengambil detail profil user berdasarkan ID
 */
export async function getUserProfile(userId) {
  const [user] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      avatar: users.avatar,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    throw new AppError("Pengguna tidak ditemukan", 404);
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    avatar: user.avatar || null,
    created_at: user.createdAt,
  };
}

/**
 * 2. Memperbarui nama/data profil user
 */
export async function updateUserProfile(userId, { name }) {
  await db
    .update(users)
    .set({ name: name.trim() })
    .where(eq(users.id, userId));

  return await getUserProfile(userId);
}

/**
 * 3. Memperbarui avatar user (hapus file lama jika ada)
 */
export async function updateUserAvatar(userId, fileOrBlob) {
  // Ambil data user untuk melihat avatar lama
  const [currentUser] = await db
    .select({ avatar: users.avatar })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!currentUser) {
    throw new AppError("Pengguna tidak ditemukan", 404);
  }

  // Simpan foto baru via helper upload
  const newAvatarUrl = await processPhotoUpload(fileOrBlob);
  if (!newAvatarUrl) {
    throw new AppError("Berkas foto tidak valid atau kosong", 400);
  }

  // Jika user sebelumnya sudah punya foto avatar, hapus file lama dari disk
  if (currentUser.avatar) {
    await deleteUploadedPhoto(currentUser.avatar);
  }

  // Update URL avatar baru ke database
  await db
    .update(users)
    .set({ avatar: newAvatarUrl })
    .where(eq(users.id, userId));

  return { avatar: newAvatarUrl };
}

/**
 * 4. Mengubah password user dengan verifikasi password lama
 */
export async function changeUserPassword(userId, { oldPassword, newPassword, confirmPassword }) {
  if (confirmPassword && newPassword !== confirmPassword) {
    throw new AppError("Konfirmasi password baru tidak cocok", 400);
  }

  if (oldPassword === newPassword) {
    throw new AppError("Password baru tidak boleh sama dengan password lama", 400);
  }

  // Ambil password hash lama
  const [user] = await db
    .select({ password: users.password })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    throw new AppError("Pengguna tidak ditemukan", 404);
  }

  // Verifikasi password lama
  const isMatch = await Bun.password.verify(oldPassword, user.password);
  if (!isMatch) {
    throw new AppError("Password lama tidak sesuai", 400);
  }

  // Hash password baru
  const hashedPassword = await Bun.password.hash(newPassword, {
    algorithm: "bcrypt",
    cost: 10,
  });

  // Simpan password baru
  await db
    .update(users)
    .set({ password: hashedPassword })
    .where(eq(users.id, userId));

  return true;
}
```

> **Catatan Modul Plants & Drizzle Delete Query**:  
> Pastikan fungsi `deletePlant` di `src/services/plants-service.js` tetap menggunakan pola Drizzle delete standar:
> ```javascript
> await db.delete(plants).where(eq(plants.id, plantId));
> ```
> Relasi cascading akan secara otomatis menghapus rekaman di `plant_logs`.

---

## 🛣️ 4. Routing Elysia.js

### Berkas Target: `src/routes/users-route.js`

Daftarkan route baru pada instance Elysia. Gunakan prefix `/api/user` atau integrasikan langsung ke dalam `users-route.js` dengan menjaga backward compatibility:

```javascript
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
import { authPlugin } from "../middlewares/auth-middleware.js";

// Endpoint profil dapat digabung ke usersRoute atau dibuat instance route terpisah
export const userProfileRoute = new Elysia({ prefix: "/api/user" })
  .use(authPlugin) // Menjamin `user` tersedia di context

  // GET /api/user/profile (dan alias /profil)
  .get("/profile", async ({ user }) => {
    const profile = await getUserProfile(user.id);
    return {
      success: true,
      message: "Data profil berhasil diambil",
      data: profile,
    };
  })
  .get("/profil", async ({ user }) => {
    const profile = await getUserProfile(user.id);
    return {
      success: true,
      message: "Data profil berhasil diambil",
      data: profile,
    };
  })

  // PUT /api/user/profile
  .put(
    "/profile",
    async ({ user, body }) => {
      const updated = await updateUserProfile(user.id, { name: body.name });
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
    async ({ user, body }) => {
      const file = body.avatar || body.foto;
      const result = await updateUserAvatar(user.id, file);
      return {
        success: true,
        message: "Foto profil berhasil diperbarui",
        data: result,
      };
    },
    {
      body: t.Object({
        avatar: t.Optional(t.File()),
        foto: t.Optional(t.File()),
      }),
    }
  )

  // PUT /api/user/change_password
  .put(
    "/change_password",
    async ({ user, body }) => {
      await changeUserPassword(user.id, {
        oldPassword: body.oldPassword,
        newPassword: body.newPassword,
        confirmPassword: body.confirmPassword,
      });
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
```

### Pendaftaran di `src/index.js`
Pastikan route terdaftar di server utama:
```javascript
import { userProfileRoute } from "./routes/users-route.js";

// Tambahkan pada rantai instance app
app.use(userProfileRoute);
```

---

## 🎨 5. Spesifikasi Frontend Profil Pengguna

### Berkas Baru: `public/profile.html`

Buat file HTML baru `public/profile.html` yang terintegrasi dengan tema AgriTracker (Dark Mode, warna aksen emerald/brand, Tailwind CSS, Lucide Icons).

#### Fitur-fitur UI yang Wajib Ada:
1. **Auth Guard di Head**:
   ```javascript
   const token = localStorage.getItem('auth_token');
   if (!token) {
     window.location.replace('/index.html');
   }
   ```
2. **Navigasi Header**:
   * Logo AgriTracker
   * Tombol "Kembali ke Dashboard" (`href="/dashboard.html"`)
   * Tombol "Logout"
3. **Kartu Avatar Pengguna**:
   * Menampilkan gambar avatar saat ini (`data.avatar`). Jika belum ada avatar, tampilkan gambar inisial placeholder (misal UI avatar atau icon pengguna).
   * Tombol/Input upload foto baru (`<input type="file" id="avatarFileInput" accept="image/png, image/jpeg, image/webp" class="hidden">`).
   * Ketika memilih berkas:
     * Tampilkan indikator loading.
     * Kirim `FormData` ke `POST /api/user/avatar`.
     * Jika sukses: perbarui tampilan gambar avatar secara instan tanpa perlu reload seluruh halaman, lalu tampilkan notifikasi toast sukses.
4. **Formulir Edit Data Profil**:
   * Input nama lengkap (pre-filled dari `GET /api/user/profile`).
   * Input email (ditampilkan *disabled* / *readonly* dengan catatan email tidak dapat diubah).
   * Tombol "Simpan Perubahan Profil" yang mengirim request `PUT /api/user/profile`.
5. **Formulir Ganti Password**:
   * Input Password Lama (`type="password"`).
   * Input Password Baru (`type="password"` minimal 6 karakter).
   * Input Konfirmasi Password Baru (`type="password"`).
   * Tombol toggle *show/hide password* (menggunakan ikon mata dari Lucide).
   * Tombol "Perbarui Password" yang mengirim request `PUT /api/user/change_password`.
   * Bersihkan input form setelah password sukses diubah.
6. **Sistem Notifikasi / Alert Banner**:
   * Menampilkan pesan sukses berwarna hijau atau pesan kesalahan berwarna merah dengan tombol tutup otomatis.

### Pembaruan di `public/dashboard.html`
Tambahkan tombol atau avatar link di header navbar `public/dashboard.html` yang mengarahkan pengguna ke halaman profil:
```html
<a
  href="/profile.html"
  class="inline-flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/80 px-3 py-1.5 text-xs sm:text-sm font-medium text-zinc-300 transition hover:border-zinc-700 hover:text-white"
>
  <i data-lucide="user" class="h-4 w-4 text-brand-400"></i>
  <span>Profil Saya</span>
</a>
```

### Registrasi Route File di `src/index.js`
Tambahkan handler static file pada `src/index.js`:
```javascript
.get("/profile.html", () => Bun.file("public/profile.html"))
```

---

## 🧪 6. Panduan Pengujian & Acceptance Criteria

Untuk memastikan implementasi berjalan sempurna, lakukan checklist pengujian berikut:

### ✅ Checklist Fungsional Backend:
- [ ] Database table `users` memiliki kolom `avatar`.
- [ ] `GET /api/user/profile` mengembalikan status `200` dan objek data profil jika diberi token valid.
- [ ] `GET /api/user/profile` mengembalikan status `401` jika request tanpa header Authorization.
- [ ] `PUT /api/user/profile` berhasil memperbarui nama user dan mengembalikan data terbaru.
- [ ] `POST /api/user/avatar` berhasil mengunggah file gambar (JPEG/PNG/WEBP) ke folder `public/uploads/`.
- [ ] **Verifikasi Hapus Foto Lama**: Saat user mengunggah avatar kedua kali, file gambar avatar pertama **terhapus secara fisik** dari direktori `public/uploads/` (tidak meninggalkan file sampah/orphan).
- [ ] `PUT /api/user/change_password` menolak jika password lama salah (status `400`).
- [ ] `PUT /api/user/change_password` menolak jika password baru kurang dari 6 karakter (status `400`).
- [ ] `PUT /api/user/change_password` berhasil mengupdate hash password baru saat password lama sesuai. User dapat login menggunakan password baru tersebut.

### ✅ Checklist Fungsional Frontend:
- [ ] Halaman `profile.html` tidak dapat diakses tanpa login (langsung redirect ke `index.html`).
- [ ] Foto avatar ditampilkan dengan proporsional (aspect-ratio square / bulat).
- [ ] Klik tombol upload avatar langsung membuka pemilih file, mengunggah ke server, dan memperbarui avatar di layar.
- [ ] Mengubah nama profil berhasil dan memunculkan toast/alert notifikasi sukses.
- [ ] Mengubah password berhasil dan form di-reset kembali kosong.
- [ ] Tersedia tombol kembali ke dashboard yang berfungsi dengan lancar.

---

## 🚀 Perintah Contoh untuk Testing Manual (cURL)

```bash
# 1. Login untuk mendapatkan Token
TOKEN=$(curl -s -X POST http://localhost:3000/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@test.com","password":"password123"}' | grep -o '"token":"[^"]*' | cut -d'"' -f4)

# 2. Cek Profil
curl -i -X GET http://localhost:3000/api/user/profile \
  -H "Authorization: Bearer $TOKEN"

# 3. Update Profil
curl -i -X PUT http://localhost:3000/api/user/profile \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Nama Keren Baru"}'

# 4. Upload Avatar
curl -i -X POST http://localhost:3000/api/user/avatar \
  -H "Authorization: Bearer $TOKEN" \
  -F "avatar=@/path/to/my_photo.png"

# 5. Ganti Password
curl -i -X PUT http://localhost:3000/api/user/change_password \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"oldPassword":"password123","newPassword":"newSecretPassword456","confirmPassword":"newSecretPassword456"}'
```

---
*Dokumen issue ini disusun agar dapat langsung dieksekusi secara mandiri oleh pengembang atau model AI.*

