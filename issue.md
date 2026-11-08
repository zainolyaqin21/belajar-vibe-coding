# [Feature] API Update Data Tanaman (PUT /api/plants/:id) - AgriTracker

## 📋 Deskripsi
Mengembangkan endpoint API untuk memperbarui (*update*) data tanaman yang sudah tercatat pada modul **AgriTracker (Jurnal Pertumbuhan Tanaman)**. Fitur ini memungkinkan pengguna mengubah nama tanaman dan/atau tanggal pencatatan berdasarkan ID unik tanaman.

Dokumen ini disusun sebagai panduan arsitektur *high-level* untuk diimplementasikan oleh junior programmer atau AI model dengan mengikuti pola desain (*clean architecture*) yang sudah berjalan pada proyek.

---

## 🗄️ Konteks Database (Drizzle ORM)

* **Tabel**: Gunakan tabel **`plants`** yang sudah ada di `src/db/schema.js`. **Tidak perlu membuat tabel baru**.
* **Kunci Utama**: Identifikasi record target dilakukan menggunakan kolom `id` (Primary Key).
* **Operasi**: Lakukan query update data (`name`, `tanggal`) sesuai `id` yang diberikan.

---

## 🎯 Spesifikasi API (HTTP Contract)

### 1. Endpoint
* **Method**: `PUT`
* **Path**: `/api/plants/:id`
* **URL Parameter**:
  - `id`: Integer (ID tanaman yang ingin diperbarui)
* **Headers**: `Content-Type: application/json`

### 2. Request Body (JSON)
```json
{
  "name": "Tomat Super Update",
  "tanggal": "2026-11-09T08:00:00Z"
}
```

### 3. Response Contract

#### ✅ Response Sukses (HTTP 200 OK)
Dikembalikan jika tanaman dengan ID tersebut ditemukan dan data berhasil diperbarui.
```json
{
  "success": true,
  "message": "Tanaman berhasil diperbarui",
  "data": {
    "id": 1,
    "name": "Tomat Super Update",
    "tanggal": "2026-11-09T08:00:00.000Z",
    "created_at": "2026-11-08T15:20:00.000Z"
  }
}
```

#### ❌ Response Not Found (HTTP 404 Not Found)
Dikembalikan jika tidak ada tanaman dengan ID yang dimaksud di dalam database.
```json
{
  "success": false,
  "error": "Tanaman tidak ditemukan"
}
```

#### ❌ Response Error Validasi (HTTP 400 Bad Request)
Dikembalikan jika parameter ID tidak valid (bukan angka) atau data input body tidak lengkap/kosong.
```json
{
  "success": false,
  "message": "Validasi gagal: data input atau parameter ID tidak valid"
}
```

---

## 🏗️ Alur Bisnis (High-Level Workflow)

1. **Validasi Parameter & Body**:
   - Ambil parameter `id` dari URL dan konversi menjadi integer.
   - Validasi body request: pastikan `name` tidak kosong dan `tanggal` berformat valid.

2. **Pengecekan Keberadaan Data**:
   - Periksa apakah tanaman dengan `id` tersebut ada di tabel `plants`.
   - Jika record tidak ditemukan, kembalikan status `404` dengan format response error.

3. **Eksekusi Update**:
   - Jalankan perintah update pada tabel `plants` untuk mengubah nilai `name` dan `tanggal`.

4. **Return Response**:
   - Ambil record data terbaru hasil update.
   - Kembalikan response sukses `200 OK` beserta data tanaman terbaru.

---

## 📁 Struktur Folder & Berkas Target

Pemisahan tanggung jawab mengikuti konvensi yang sudah ada:

```text
src/
├── services/
│   └── plants-service.ts (atau plants-service.js) # Logika pengecekan, update database (Drizzle)
└── routes/
    └── plants-route.ts (atau plants-route.js)     # Handler route PUT /api/plants/:id & validasi input
```

### Panduan Implementasi per Layer:

1. **Services Layer (`src/services/plants-service.ts` / `.js`)**:
   - Tambahkan fungsi baru (misal: `updatePlant(id, { name, tanggal })`).
   - Melakukan query pencarian tanaman berdasarkan ID; jika tidak ada, lemparkan error 404.
   - Melakukan query update (`db.update(plants).set(...).where(eq(plants.id, id))`).
   - Mengembalikan data tanaman yang sudah diperbarui.

2. **Routes Layer (`src/routes/plants-route.ts` / `.js`)**:
   - Daftarkan method `.put("/:id", ...)` pada route plants.
   - Validasi `params.id` dan `body` menggunakan skema TypeBox (`t.Object`).
   - Tangani error 404 dan kembalikan JSON strictly sesuai kontrak: `{"success": false, "error": "Tanaman tidak ditemukan"}`.

---

## ✅ Kriteria Penerimaan (Acceptance Criteria)

- [ ] Endpoint `PUT /api/plants/:id` berhasil didaftarkan pada routing ElysiaJS.
- [ ] Permintaan update dengan ID yang valid dan body lengkap menghasilkan HTTP 200 dan data yang telah diperbarui.
- [ ] Data di database benar-benar terupdate setelah request sukses.
- [ ] Permintaan dengan ID yang tidak ada di database mengembalikan HTTP 404 dan body `{"success": false, "error": "Tanaman tidak ditemukan"}`.
- [ ] Permintaan dengan parameter ID atau body yang tidak valid menghasilkan HTTP 400.
- [ ] Kode tetap terstruktur rapi memisahkan antara layer route dan service.

---

## 💡 Catatan Tambahan untuk Implementor

- Jangan membuat tabel database baru, gunakan tabel `plants` yang sudah terpasang.
- Gunakan Drizzle ORM query builder (`db.update()`, `db.select()`).
- Pastikan penanganan error 404 mengembalikan key `"error": "Tanaman tidak ditemukan"` sesuai format kontrak yang ditentukan.
