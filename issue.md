# [Feature] Implementasi API User Logout

## 📋 Deskripsi
Menyediakan endpoint untuk proses logout pengguna. Ketika pengguna melakukan logout, sesi aktif (token session) yang tersimpan di database harus dihapus/dibatalkan sehingga token tersebut tidak dapat digunakan kembali untuk mengakses endpoint yang membutuhkan autentikasi.

Dokumen ini ditujukan sebagai panduan high-level bagi programmer atau AI model untuk mengimplementasikan fitur logout sesuai dengan arsitektur dan kontrak API yang telah ditentukan.

---

## 🎯 Spesifikasi API

### 1. Endpoint
* **Method**: `DELETE`
* **Path**: `/api/user/logout`
*(Catatan: pastikan endpoint dapat menangani `/api/user/logout` sesuai spesifikasi, dan sesuaikan dengan routing ElysiaJS yang ada)*

### 2. Request
* **Headers**:
  ```http
  Authorization: Bearer <session_token>
  ```
* **Body**: *None (kosong)*

### 3. Response Contract

#### ✅ Response Sukses (HTTP 200 OK)
Dikembalikan saat token valid dan sesi berhasil dihapus.
```json
{
  "data": "ok"
}
```

#### ❌ Response Error - Unauthorized (HTTP 401 Unauthorized)
Dikembalikan jika header Authorization tidak disertakan, format token tidak valid, atau token tidak ditemukan di database.
```json
{
  "error": "unauthorized"
}
```

---

## 🏗️ Alur Bisnis (High-Level Workflow)

1. **Ekstraksi Token**:
   - Ambil token dari header `Authorization` (format: `Bearer <token>`).
   - Jika header kosong atau format tidak sesuai, kembalikan status `401 Unauthorized`.

2. **Verifikasi & Validasi Sesi**:
   - Periksa keberadaan token di tabel `sessions`.
   - Jika token tidak ditemukan atau sudah tidak aktif, kembalikan status `401 Unauthorized`.

3. **Invalidasi Sesi**:
   - Hapus record token terkait dari tabel `sessions` di database.

4. **Return Response**:
   - Kembalikan response sukses sesuai format kontrak (`{ "data": "ok" }`) dengan status code `200`.

---

## 📁 Struktur Folder & File Target

Pemisahan tanggung jawab (Separation of Concerns) mengikuti arsitektur yang sudah berjalan:

```text
src/
├── routes/
│   └── users-route.ts (atau users-route.js)     # Routing ElysiaJS & penanganan HTTP request/response
└── services/
    └── users-service.ts (atau users-service.js) # Business logic & interaksi database
```

### Panduan Implementasi per Layer:

1. **Services Layer (`src/services/users-service.ts`)**:
   - Buat fungsi bisnis untuk logout (misal: `logoutUser(token)`).
   - Fungsi bertugas mengecek keberadaan session di database dan menghapus session berdasarkan token.
   - Lemparkan error unauthorized jika sesi tidak ditemukan.

2. **Routes Layer (`src/routes/users-route.ts`)**:
   - Daftarkan route dengan method `DELETE` pada path `/logout` (atau `/api/user/logout`).
   - Ekstrak token dari header request.
   - Panggil fungsi logout dari service.
   - Tangani response sukses (200) dan error handling (401) agar output JSON persis sesuai kontrak.

---

## ✅ Kriteria Penerimaan (Acceptance Criteria)

- [ ] Endpoint `DELETE /api/user/logout` berhasil didaftarkan pada routing ElysiaJS.
- [ ] Permintaan dengan Bearer token yang valid menghasilkan status `200` dan body `{ "data": "ok" }`.
- [ ] Token yang telah di-logout terhapus dari tabel `sessions` di database.
- [ ] Permintaan tanpa token Authorization menghasilkan status `401` dan body `{ "error": "unauthorized" }`.
- [ ] Permintaan dengan token yang tidak ada / salah / sudah pernah di-logout menghasilkan status `401` dan body `{ "error": "unauthorized" }`.
- [ ] Token yang telah di-logout tidak dapat digunakan lagi untuk memanggil endpoint terproteksi lain (seperti `GET /api/users/current`).
- [ ] Kode terorganisir dengan rapi memisahkan layer route dan service sesuai konvensi project.

---

## 💡 Catatan Tambahan untuk Implementor

- Jangan hardcode pesan error, pastikan struktur JSON error strictly: `{ "error": "unauthorized" }`.
- Perhatikan konsistensi prefix routing pada aplikasi Elysia utama (`src/index.js`).
- Gunakan query builder yang telah terpasang di project (Drizzle ORM) untuk operasi penghapusan sesi.

