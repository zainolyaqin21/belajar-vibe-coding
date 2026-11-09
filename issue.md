# [Improvement] Code Review & Refactoring AgriTracker Backend

## 📋 Deskripsi

Setelah melakukan review menyeluruh terhadap seluruh codebase AgriTracker (branch `feature/dashboard-crud-upload`), ditemukan sejumlah masalah yang perlu diperbaiki sebelum merge ke `main`. Seluruh perbaikan ini telah selesai diimplementasikan pada branch `feature/code-review-improvements` dan diverifikasi dengan unit test otomatis.

---

## 🗄️ Konteks Database

- **Database:** MySQL (MariaDB 10.4.32) via XAMPP pada port 3306
- **Database name:** `belajar_vibe_coding`
- **ORM:** Drizzle ORM
- **Schema file:** `src/db/schema.js`
- **Tabel yang terlibat:** `users`, `sessions`, `plants`, `plant_logs`

---

## 🔍 Temuan Masalah & Status Penyelesaian

### 🔴 Keamanan (Security) — Prioritas Tinggi

- [x] **Tidak ada autentikasi pada route plants dan plant-logs**
  - File: `src/routes/plants-route.js`, `src/routes/plant-logs-route.js`
  - Telah ditambahkan `authPlugin` dan `extractBearerToken` di `src/middlewares/auth-middleware.js`
  - Semua endpoint plants dan logs kini memverifikasi Bearer token (401 Unauthorized jika tidak ada/tidak valid).

- [x] **Tidak ada batas ukuran file pada upload foto**
  - File: `src/utils/upload-helper.js`, fungsi `processPhotoUpload()`
  - Telah ditambahkan validasi ukuran berkas maksimal 5MB (400 Bad Request jika melebihi).

- [x] **Validasi tipe file hanya cek ekstensi, bukan MIME type asli**
  - File: `src/utils/upload-helper.js`
  - Telah ditambahkan inspeksi magic bytes (JPEG, PNG, GIF, WEBP) untuk mencegah spoofing file ekstensi palsu.

- [x] **Foto lama tidak dihapus saat log diupdate dengan foto baru**
  - File: `src/utils/upload-helper.js` (`deleteUploadedPhoto()`) & `src/services/plant-logs-service.js`
  - Berkas fisik di `public/uploads/` otomatis dihapus saat foto diupdate atau saat log/tanaman dihapus.

---

### 🟠 Arsitektur — Prioritas Menengah

- [x] **Hapus file duplikat / dead code**
  - Telah dihapus: `src/services/user.service.js` dan `src/routes/user.route.js`.
  - Import di `src/index.js` diperbarui agar bersih dan terpusat.

- [x] **Gabungkan dua handler register yang identik**
  - File: `src/routes/users-route.js`
  - Telah dihapus `POST /api/users/` yang menduplikasi `POST /api/users/register`.

- [x] **Gabungkan dua route logout yang identik**
  - File: `src/index.js` dan `src/routes/users-route.js`
  - `DELETE /api/users/logout` kini menjadi rute tunggal terstandarisasi.

- [x] **Pindahkan `processPhotoUpload()` ke modul utility/service**
  - Logika penyimpanan file telah dipindahkan ke `src/utils/upload-helper.js`.

- [x] **Buat centralized error class `AppError`**
  - Telah dibuat `src/utils/app-error.js` dengan class `AppError` yang mendukung custom `statusCode`.

---

### 🟡 Database & Schema

- [x] **Rename kolom `time` → `created_at` di tabel `users`**
  - File: `src/db/schema.js` & migrasi database
  - Kolom `users.time` berhasil di-rename menjadi `users.created_at`.

- [x] **Tambahkan foreign key `userId` ke tabel `plants`**
  - File: `src/db/schema.js`
  - Kolom `user_id` ditambahkan dengan FK ke `users.id` (`onDelete: "cascade"`). Multi-tenancy telah diterapkan pada seluruh query tanaman.

- [x] **Tambahkan kolom `updated_at` di tabel `plants` dan `plant_logs`**
  - Kolom `updated_at` dengan `ON UPDATE CURRENT_TIMESTAMP` telah aktif pada tabel `plants` dan `plant_logs`.

- [x] **Tambahkan endpoint yang hilang**
  - Ditambahkan: `GET /api/plants/:id` untuk mengambil satu tanaman berdasarkan ID milik user.
  - Ditambahkan: `GET /api/plants/logs/:logId` untuk mengambil satu catatan jurnal berdasarkan ID milik user.

---

### 🟢 Performa

- [x] **Tambahkan `.limit(1)` pada `checkPlantExists()`**
  - File: `src/services/plant-logs-service.js`
  - Query pengecekan eksistensi kini menggunakan `.limit(1)`.

- [x] **Tambahkan pagination pada endpoint list**
  - File: `src/routes/plants-route.js`, `src/routes/plant-logs-route.js`
  - Query parameter `?page=1&limit=10` didukung dengan kalkulasi `limit`, `offset`, dan metadata total count.

- [x] **Tambahkan pengurutan pada query logs**
  - File: `src/services/plant-logs-service.js`, fungsi `getLogsByPlantId()`
  - Log otomatis diurutkan secara menurun berdasarkan tanggal dibuat (`.orderBy(desc(plantLogs.createdAt))`).

- [x] **Gunakan JOIN di `getCurrentUser()`**
  - File: `src/services/users-service.js`
  - Dua query terpisah digabungkan menjadi satu query dengan Drizzle `innerJoin(users, eq(sessions.userId, users.id))`.

---

### 🔵 Konsistensi Kode

- [x] **Guard kondisi `updateData` kosong di `updatePlant()` dan `updateLog()`**
  - Mengembalikan `400 Bad Request` ("Tidak ada data yang diperbarui") jika payload tidak memiliki field yang diperbarui.

- [x] **Unifikasi shape response error**
  - Format respon seragam: `{ success: false, message: "...", error: "..." }`.

- [x] **Perjelas response login**
  - Mengembalikan `{ success: true, message: "Login berhasil", data: token, token: token }` yang fleksibel dan backward-compatible.

---

## 🎯 Spesifikasi per Layer

### Routes (`src/routes/`)

| File | Aksi |
|---|---|
| `plants-route.js` | Ditambahkan auth middleware, endpoint GET /:id, pagination, guard empty payload |
| `plant-logs-route.js` | Ditambahkan auth middleware, endpoint GET /logs/:logId, pagination, delegasi upload ke upload-helper |
| `users-route.js` | Dihapus handler register duplikat, rute logout tunggal, penanganan error seragam |
| `user.route.js` | **Dihapus (Dead Code)** |

### Services (`src/services/`)

| File | Aksi |
|---|---|
| `plants-service.js` | Multi-tenancy filter `userId`, guard empty payload, `getPlantById()`, cascade photo cleanup |
| `plant-logs-service.js` | Multi-tenancy filter `userId`, `.limit(1)` di `checkPlantExists`, `ORDER BY`, `getLogById()`, pembersihan foto lama |
| `users-service.js` | Single JOIN query di `getCurrentUser()`, refactor ke `AppError` |
| `user.service.js` | **Dihapus (Dead Code)** |

### Database (`src/db/`)

| File | Aksi |
|---|---|
| `schema.js` | Rename `time` → `created_at` di users, tambah `userId` FK & `updatedAt` di plants, tambah `updatedAt` di plant_logs |

### Utils (`src/utils/`)

| File | Aksi |
|---|---|
| `app-error.js` | Centralized `AppError` class |
| `upload-helper.js` | Validasi ukuran (5MB), validasi magic bytes foto, penyimpanan berkas, dan penghapusan foto lama |

### Middlewares (`src/middlewares/`)

| File | Aksi |
|---|---|
| `auth-middleware.js` | `extractBearerToken` & `authPlugin` Elysia derive hook |

---

## ✅ Kriteria Penerimaan

- [x] Semua endpoint plants dan plant-logs menolak request tanpa token Bearer (401 Unauthorized)
- [x] Upload foto dibatasi maksimum ukuran (5MB) dan MIME type divalidasi (bukan hanya ekstensi)
- [x] Foto lama dihapus dari disk saat log diupdate dengan foto baru
- [x] Tidak ada file duplikat (`user.route.js`, `user.service.js`, handler register/logout ganda)
- [x] `GET /api/plants/:id` dan `GET /api/plants/logs/:logId` berfungsi dan mengembalikan data yang benar
- [x] Kolom `time` pada tabel `users` sudah berubah menjadi `created_at` tanpa memutus fungsionalitas yang ada
- [x] Tabel `plants` memiliki kolom `userId` dan query sudah difilter per user
- [x] `updatePlant()` dan `updateLog()` mengembalikan error 400 jika payload kosong
- [x] Semua response error memiliki shape yang seragam: `{ success: false, message: "..." }`
- [x] `checkPlantExists()` menggunakan `.limit(1)`
- [x] List endpoint plants dan logs mendukung pagination via query param `?page` dan `?limit`
