# [Epic/Bugfix & Feature] Debugging & Penyempurnaan Modul AgriTracker: Upload Foto Log, CRUD Tanaman & Log Tanaman, serta Integrasi Dashboard

## 📋 Deskripsi Proyek
Modul **AgriTracker (Jurnal Pertumbuhan Tanaman)** dirancang untuk membantu pengguna mencatat dan memantau perkembangan tanaman beserta riwayat foto dan catatan hariannya.

Berdasarkan hasil pengujian terbaru, ditemukan beberapa kendala teknis dan fitur yang belum lengkap:
1. **Upload Foto Log Tanaman**: Fitur upload foto pada log tanaman belum berfungsi karena backend saat ini hanya menerima data string/URL (bukan multipart form-data/file biner), dan belum ada penanganan penyimpanan file foto ke penyimpanan lokal server.
2. **Fitur Update & Delete Tanaman**: Pengguna belum dapat mengubah (*update*) maupun menghapus (*delete*) data tanaman melalui antarmuka dashboard, serta route/service terkait perlu dipastikan keandalan penanganan status kode dan validasinya.
3. **Fitur Update & Delete Log Tanaman**: Pengguna belum dapat mengedit atau menghapus riwayat catatan jurnal tanaman yang sudah dibuat.
4. **Integrasi Antarmuka (Dashboard)**: Berkas `public/dashboard.html` saat ini baru menampilkan informasi profil user dan belum menyediakan antarmuka CRUD untuk tanaman maupun jurnal log tanaman.

Dokumen ini disusun sebagai panduan *high-level planning & architecture* untuk diimplementasikan oleh junior programmer atau AI model dengan mengikuti konvensi *clean architecture* yang sudah berjalan pada proyek.

---

## 🗄️ Konteks Database (Drizzle ORM)

Pastikan dan periksa struktur tabel pada `src/db/schema.js`:

### 1. Tabel `plants`
* **Kolom**:
  * `id`: Serial / BigInt (Primary Key, Auto Increment)
  * `name`: Varchar(255), Not Null (Nama tanaman)
  * `tanggal`: Datetime, Not Null (Tanggal mulai tanam)
  * `createdAt`: Timestamp, Default Now
* **Operasi**: Mendukung `INSERT`, `SELECT`, `UPDATE`, dan `DELETE`.

### 2. Tabel `plant_logs`
* **Kolom**:
  * `id`: Serial / BigInt (Primary Key, Auto Increment)
  * `plantId`: BigInt (Foreign Key mengarah ke `plants.id` dengan referensi `onDelete: "cascade"`)
  * `catatan`: Text, Not Null (Isi catatan perkembangan)
  * `foto`: Varchar(255), Nullable (Menyimpan path / URL relatif gambar yang di-upload, misal: `/uploads/plant-1-1715000000.jpg`)
  * `createdAt`: Timestamp, Default Now
* **Integritas Relasi**:
  * Ketika record tanaman pada tabel `plants` dihapus, seluruh data riwayat log terkait di tabel `plant_logs` harus otomatis terhapus (*cascading delete*).

> **Catatan**: Tidak perlu membuat tabel baru di luar skema yang sudah ada. Cukup pastikan definisi dan relasi Drizzle ORM sesuai dengan kebutuhan di atas.

---

## 🔍 Temuan Masalah & Ruang Lingkup Debugging

### 1. Masalah Upload Foto pada Plant Log
* **Kondisi Saat Ini**:
  Skema validasi route saat ini menggunakan `t.String()` untuk field `foto` dalam body JSON murni. Hal ini menyebabkan pengiriman file biner gambar (`multipart/form-data`) dari form upload ditolak atau gagal diproses.
* **Solusi yang Diharapkan**:
  * Route harus mendukung penerimaan file biner (menggunakan `t.File()` pada TypeBox Elysia) atau `multipart/form-data`.
  * Buat mekanisme penyimpanan file: simpan berkas fisik ke direktori `public/uploads/` (pastikan folder otomatis dibuat jika belum ada) dengan nama file yang unik (misal: kombinasi timestamp dan nama file acak/sanitasi).
  * Simpan path relatif publik (misal: `/uploads/nama-file.jpg`) ke kolom `foto` di tabel `plant_logs`.
  * Direktori `public/` sudah di-serve sebagai aset statis oleh Elysia melalui plugin `@elysiajs/static`, sehingga file dapat langsung diakses melalui browser.

### 2. Fitur Update & Delete Tanaman
* **Kondisi Saat Ini**:
  Fungsi dasar backend sudah memiliki rancangan di `plants-service.js` dan `plants-route.js`, namun pada antarmuka dashboard belum ada tombol/modal untuk melakukan aksi update dan delete, serta response validasi parameter ID URL perlu distandarkan.
* **Solusi yang Diharapkan**:
  * Pastikan endpoint `PUT /api/plants/:id` dan `DELETE /api/plants/:id` berjalan sesuai kontrak (validasi numeric ID, HTTP 200, 400, dan 404).
  * Sediakan UI pada `dashboard.html` untuk memicu aksi edit (mengubah nama dan tanggal) dan hapus (dengan dialog konfirmasi) data tanaman.

### 3. Fitur Update & Delete Log Tanaman
* **Kondisi Saat Ini**:
  Endpoint `PUT /api/plants/logs/:logId` dan `DELETE /api/plants/logs/:logId` belum terhubung ke antarmuka pengguna, dan penanganan update foto pada log perlu diselaraskan dengan mekanisme upload.
* **Solusi yang Diharapkan**:
  * Pastikan route dan service update & delete log bekerja presisi.
  * Sediakan UI pada `dashboard.html` untuk mengedit catatan log dan menghapus catatan log yang tidak diinginkan.

---

## 🎯 Spesifikasi API (HTTP Contract)

### 🌿 Modul Tanaman (`/api/plants`)

| Method | Path | Request Body / Param | Response Sukses | Response Error |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/plants` | - | `200 OK`: `{"success": true, "data": [...]}` | `500`: Gagal ambil data |
| `POST` | `/api/plants` | JSON: `{ "name": string, "tanggal": string }` | `201 Created`: `{"success": true, "message": "...", "data": {...}}` | `400`: Validasi input |
| `PUT` | `/api/plants/:id` | Param: `id` (Number)<br>JSON: `{ "name"?: string, "tanggal"?: string }` | `200 OK`: `{"success": true, "message": "Tanaman berhasil diperbarui", "data": {...}}` | `404`: Tanaman tidak ditemukan<br>`400`: ID/body tidak valid |
| `DELETE` | `/api/plants/:id` | Param: `id` (Number) | `200 OK`: `{"success": true, "message": "Tanaman berhasil dihapus"}` | `404`: Tanaman tidak ditemukan<br>`400`: ID tidak valid |

---

### 📝 Modul Jurnal Log Tanaman (`/api/plants`)

| Method | Path | Request Type & Body | Response Sukses | Response Error |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/plants/:id/logs` | Param: `id` (Plant ID) | `200 OK`: `{"success": true, "data": [...]}` | `404`: Tanaman tidak ditemukan |
| `POST` | `/api/plants/:id/logs` | Param: `id` (Plant ID)<br>`multipart/form-data`: <br>- `catatan`: string (wajib)<br>- `foto`: file binary (opsional) | `201 Created`: `{"success": true, "message": "Catatan jurnal berhasil ditambahkan", "data": {...}}` | `404`: Tanaman tidak ditemukan<br>`400`: Catatan kosong/file tidak valid |
| `PUT` | `/api/plants/logs/:logId` | Param: `logId` (Number)<br>`multipart/form-data` atau JSON:<br>- `catatan`?: string<br>- `foto`?: file binary atau path | `200 OK`: `{"success": true, "message": "Catatan jurnal berhasil diperbarui", "data": {...}}` | `404`: Catatan jurnal tidak ditemukan<br>`400`: Data tidak valid |
| `DELETE` | `/api/plants/logs/:logId` | Param: `logId` (Number) | `200 OK`: `{"success": true, "message": "Catatan jurnal berhasil dihapus"}` | `404`: Catatan jurnal tidak ditemukan<br>`400`: ID tidak valid |

---

## 🏗️ Alur Bisnis & Panduan Arsitektur per Layer

### 1. Services Layer (`src/services/`)
* **`plants-service.js` (atau `.ts`)**:
  * `getAllPlants()`: Query `SELECT` semua baris tabel `plants`.
  * `createPlant({ name, tanggal })`: Validasi, simpan record baru dengan `db.insert()`, dan kembalikan data record.
  * `updatePlant(id, { name, tanggal })`: Cek eksistensi record (lempar 404 jika tidak ada), lakukan query `db.update()`, dan kembalikan record terbaru.
  * `deletePlant(id)`: Cek eksistensi record (lempar 404 jika tidak ada), jalankan query `db.delete(plants).where(eq(plants.id, id))`.
* **`plant-logs-service.js` (atau `.ts`)**:
  * `createLog(plantId, { catatan, fotoPath })`: Pastikan tanaman ada; simpan log baru ke tabel `plant_logs` beserta path foto jika ada.
  * `getLogsByPlantId(plantId)`: Pastikan tanaman ada; ambil daftar log diurutkan berdasarkan tanggal terbaru.
  * `updateLog(logId, { catatan, fotoPath })`: Cek keberadaan log; lakukan update record.
  * `deleteLog(logId)`: Cek keberadaan log; hapus record log dari database.

### 2. Routes Layer (`src/routes/`)
* **`plants-route.js` (atau `.ts`)**:
  * Mendaftarkan handler HTTP: `GET /`, `POST /`, `PUT /:id`, dan `DELETE /:id`.
  * Validasi parameter menggunakan TypeBox (`t.Object({ id: t.Numeric() })`).
  * Penanganan error terstandar:
    * Parameter ID bukan angka ➡️ `400 Bad Request` (`{"success": false, "message": "Validasi gagal: parameter ID tidak valid"}`).
    * Record tidak ditemukan ➡️ `404 Not Found` (`{"success": false, "error": "Tanaman tidak ditemukan"}`).
* **`plant-logs-route.js` (atau `.ts`)**:
  * Menangani upload file foto secara aman pada pembuatan/pembaruan log:
    * Validasi tipe file (misal: image/jpeg, image/png, image/webp).
    * Simpan file menggunakan utilitas I/O Bun (`Bun.write(...)`) ke dalam folder `public/uploads/`.
    * Teruskan URL relatif (`/uploads/filename.ext`) ke service layer.
  * Mendaftarkan route update (`PUT /:logId`) dan delete (`DELETE /:logId`) dengan validasi parameter `logId`.

### 3. Frontend Layer (`public/dashboard.html`)
* **Bagian Tanaman (Plants Management)**:
  * Tampilkan daftar tanaman dalam kartu/tabel.
  * Tombol aksi **Edit Tanaman**: Membuka modal/form untuk mengubah nama dan tanggal tanaman, lalu memanggil `PUT /api/plants/:id`.
  * Tombol aksi **Hapus Tanaman**: Konfirmasi konfirmasi sebelum memanggil `DELETE /api/plants/:id`, kemudian segarkan daftar.
* **Bagian Jurnal Log (Plant Logs Management)**:
  * Saat satu tanaman dipilih/diklik, tampilkan daftar riwayat log tanaman tersebut.
  * Form **Tambah Catatan Jurnal**:
    * Input textarea untuk catatan.
    * Input file `<input type="file" accept="image/*">` untuk memilih foto tanaman.
    * Kirimkan menggunakan objek `FormData` via `fetch('/api/plants/:id/logs', { method: 'POST', body: formData })`.
  * Tampilkan thumbnail foto pada riwayat log jika ada foto yang di-upload.
  * Tombol aksi **Edit Log** & **Hapus Log**:
    * Edit: Mengubah isi catatan log via `PUT /api/plants/logs/:logId`.
    * Hapus: Menghapus catatan log via `DELETE /api/plants/logs/:logId`.

---

## 📁 Struktur Folder & Berkas Target

```text
src/
├── db/
│   ├── index.js                  # Koneksi database MySQL dengan Drizzle ORM
│   └── schema.js                 # Skema tabel plants & plant_logs
├── routes/
│   ├── plants-route.js           # Route Elysia untuk CRUD tanaman (/api/plants)
│   └── plant-logs-route.js       # Route Elysia untuk log & upload foto (/api/plants/:id/logs & /api/plants/logs/:logId)
├── services/
│   ├── plants-service.js         # Logika bisnis Drizzle ORM untuk tanaman (CRUD)
│   └── plant-logs-service.js     # Logika bisnis Drizzle ORM untuk log tanaman (CRUD)
└── index.js                      # Entry point Elysia server & static plugin

public/
├── dashboard.html                # Antarmuka dashboard pengguna (CRUD Tanaman & Log + Upload Foto)
└── uploads/                      # Direktori penyimpanan fisik file foto yang di-upload
```

---

## ✅ Kriteria Penerimaan (Acceptance Criteria)

- [ ] **Upload Foto Berfungsi**: Pengguna dapat mengunggah file gambar (JPEG, PNG, WEBP) saat membuat atau mengedit catatan jurnal log, dan file tersimpan di `public/uploads/` serta dapat dibuka melalui browser.
- [ ] **Update Tanaman Berfungsi**: Endpoint `PUT /api/plants/:id` berhasil memperbarui data tanaman, dan tersedia antarmuka edit di dashboard.
- [ ] **Delete Tanaman Berfungsi**: Endpoint `DELETE /api/plants/:id` berhasil menghapus data tanaman dari database beserta seluruh catatan log terkait (*cascade*), dan tersedia tombol hapus di dashboard.
- [ ] **Update Log Tanaman Berfungsi**: Endpoint `PUT /api/plants/logs/:logId` berhasil memperbarui catatan log tanaman, dan tersedia aksi edit di dashboard.
- [ ] **Delete Log Tanaman Berfungsi**: Endpoint `DELETE /api/plants/logs/:logId` berhasil menghapus catatan log tanaman dari database, dan tersedia aksi hapus di dashboard.
- [ ] **Database Integrity**: Skema database Drizzle ORM di `src/db/schema.js` menampung kolom dan relasi `plants` serta `plant_logs` dengan tepat tanpa kehilangan data.
- [ ] **Separation of Concerns**: Logika database murni berada di layer *services*, penanganan HTTP/validasi di layer *routes*, dan antarmuka di `public/dashboard.html`.
- [ ] **Error Handling**: Menghasilkan respon HTTP yang tepat (200/201 untuk sukses, 400 untuk validasi gagal, 404 jika ID tidak ditemukan).

---

## 💡 Catatan Tambahan untuk Implementor

* **File Storage**: Pastikan membuat direktori `public/uploads/` secara otomatis (`fs.mkdirSync` atau `mkdir` rekursif) jika belum ada saat proses upload pertama kali berlangsung.
* **Multipart Form-Data di Elysia**: Saat menerima upload file di ElysiaJS, gunakan skema `t.File()` atau ekstrak data melalui `await request.formData()` / context `body`.
* **Static Asset Path**: Karena plugin `@elysiajs/static` menyajikan direktori `public` pada root URL, file yang disimpan di `public/uploads/sample.jpg` dapat diakses langsung oleh client di URL path `/uploads/sample.jpg`.
* **Backward Compatibility**: Jaga agar alias rute yang sudah ada tidak mematahkan fungsionalitas lain.

