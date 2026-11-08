# [Feature] API Hapus Data Tanaman (DELETE /api/plants/:id) - AgriTracker

## 📋 Deskripsi
Mengembangkan endpoint API untuk menghapus (*delete*) data tanaman pada modul **AgriTracker (Jurnal Pertumbuhan Tanaman)** berdasarkan identifier unik (`id`) yang dikirim melalui parameter URL.

Dokumen ini disusun sebagai panduan arsitektur *high-level* untuk diimplementasikan oleh junior programmer atau AI model dengan mengikuti pola desain (*clean architecture*) yang sudah berjalan pada proyek.

---

## 🗄️ Konteks Database (Drizzle ORM)

* **Tabel**: Gunakan tabel **`plants`** yang sudah ada di `src/db/schema.js`. **Tidak perlu membuat tabel baru**.
* **Kunci Utama**: Identifikasi record target dilakukan menggunakan kolom `id` (Primary Key).
* **Operasi**: Lakukan penghapusan record (`DELETE`) pada baris tabel `plants` sesuai dengan `id` yang diberikan.

---

## 🎯 Spesifikasi API (HTTP Contract)

### 1. Endpoint
* **Method**: `DELETE`
* **Path**: `/api/plants/:id`
* **URL Parameter**:
  - `id`: Integer (ID tanaman yang ingin dihapus)
* **Request Body**: *None (kosong)*

### 2. Response Contract

#### ✅ Response Sukses (HTTP 200 OK)
Dikembalikan jika tanaman dengan ID tersebut ditemukan dan berhasil dihapus dari database.
```json
{
  "success": true,
  "message": "Tanaman berhasil dihapus"
}
```

#### ❌ Response Not Found (HTTP 404 Not Found)
Dikembalikan jika tanaman dengan ID tersebut tidak ditemukan di dalam database.
```json
{
  "success": false,
  "error": "Tanaman tidak ditemukan"
}
```

#### ❌ Response Error Validasi (HTTP 400 Bad Request)
Dikembalikan jika parameter ID pada URL bukan angka / tidak valid.
```json
{
  "success": false,
  "message": "Validasi gagal: parameter ID tidak valid"
}
```

---

## 🏗️ Alur Bisnis (High-Level Workflow)

1. **Validasi Parameter**:
   - Ambil parameter `id` dari URL dan pastikan bertipe angka/integer yang valid.

2. **Pengecekan Keberadaan Data**:
   - Cari data tanaman di tabel `plants` berdasarkan `id`.
   - Jika record tidak ditemukan, kembalikan status `404` dengan format response error.

3. **Eksekusi Penghapusan**:
   - Jalankan query penghapusan data pada tabel `plants` berdasarkan `id`.

4. **Return Response**:
   - Kembalikan response sukses `200 OK` dengan pesan konfirmasi penghapusan sesuai kontrak.

---

## 📁 Struktur Folder & Berkas Target

Pemisahan tanggung jawab mengikuti konvensi yang sudah ada:

```text
src/
├── services/
│   └── plants-service.ts (atau plants-service.js) # Logika pengecekan dan penghapusan database (Drizzle)
└── routes/
    └── plants-route.ts (atau plants-route.js)     # Handler route DELETE /api/plants/:id & validasi parameter
```

### Panduan Implementasi per Layer:

1. **Services Layer (`src/services/plants-service.ts` / `.js`)**:
   - Tambahkan fungsi baru (misal: `deletePlant(id)`).
   - Melakukan query pencarian tanaman berdasarkan ID; jika tidak ada, lemparkan error 404.
   - Melakukan query delete (`db.delete(plants).where(eq(plants.id, id))`).

2. **Routes Layer (`src/routes/plants-route.ts` / `.js`)**:
   - Daftarkan method `.delete("/:id", ...)` pada route plants.
   - Validasi parameter `id` menggunakan skema TypeBox (`t.Object({ id: t.Numeric() })`).
   - Tangani error 404 dan kembalikan JSON strictly sesuai kontrak: `{"success": false, "error": "Tanaman tidak ditemukan"}`.

---

## ✅ Kriteria Penerimaan (Acceptance Criteria)

- [ ] Endpoint `DELETE /api/plants/:id` berhasil didaftarkan pada routing ElysiaJS.
- [ ] Permintaan hapus dengan ID yang valid menghasilkan HTTP 200 dan body `{"success": true, "message": "Tanaman berhasil dihapus"}`.
- [ ] Record tanaman benar-benar terhapus dari tabel `plants` di database.
- [ ] Permintaan dengan ID yang tidak ada di database mengembalikan HTTP 404 dan body `{"success": false, "error": "Tanaman tidak ditemukan"}`.
- [ ] Permintaan dengan parameter ID yang tidak valid (bukan angka) menghasilkan HTTP 400.
- [ ] Kode tetap terstruktur rapi memisahkan antara layer route dan service.

---

## 💡 Catatan Tambahan untuk Implementor

- Tidak perlu membuat tabel database baru, gunakan tabel `plants` yang sudah ada.
- Gunakan Drizzle ORM query builder (`db.delete()`, `db.select()`).
- Format JSON error 404 harus strictly `{ "success": false, "error": "Tanaman tidak ditemukan" }`.
