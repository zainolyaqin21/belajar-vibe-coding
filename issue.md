# [Feature] Perencanaan Skema & API Jurnal Pertumbuhan Tanaman (AgriTracker)

## 📋 Deskripsi
Mengembangkan fitur pencatatan dan pelacakan tanaman untuk modul **AgriTracker (Jurnal Pertumbuhan Tanaman)**. Modul ini memungkinkan pengguna untuk menambahkan tanaman baru yang ingin dipantau serta melihat daftar tanaman yang sedang dilacak.

Dokumen ini disusun sebagai panduan arsitektur *high-level* untuk diimplementasikan oleh junior programmer atau AI model dengan mengikuti pola desain (*clean architecture*) yang sudah ada di dalam proyek.

---

## 🗄️ Spesifikasi Skema Database (Drizzle ORM)

Tambahkan definisi tabel baru pada file skema database (`src/db/schema.js` atau `schema.ts`) dengan nama tabel **`plants`** (atau `tanaman`):

| Nama Kolom | Tipe Data | Atribut / Constraint | Keterangan |
| :--- | :--- | :--- | :--- |
| `id` | Integer / Serial | `PRIMARY KEY`, `AUTO_INCREMENT` | Identifier unik tiap tanaman |
| `name` | Varchar(255) | `NOT NULL` | Nama tanaman yang dilacak |
| `tanggal` | DateTime / Timestamp | `NOT NULL` | Tanggal dan waktu mulai tracking/penanaman |
| `created_at` | Timestamp | `DEFAULT CURRENT_TIMESTAMP`, `NOT NULL` | Waktu data dibuat pada sistem |

> **Catatan Database**: Setelah skema ditambahkan, jalankan perintah migrasi atau sinkronisasi database Drizzle (misal: `bun run db:push` atau `bun run db:generate` & `bun run db:migrate`).

---

## 🎯 Spesifikasi API (HTTP Contract)

### 1. Tambah Tanaman Baru (Create Plant)
* **Method**: `POST`
* **Path**: `/api/plants`
* **Headers**: `Content-Type: application/json`
* **Request Body**:
  ```json
  {
    "name": "Tomat Cherry",
    "tanggal": "2026-11-08T08:00:00Z"
  }
  ```
* **Response Sukses (HTTP 201 Created)**:
  ```json
  {
    "success": true,
    "message": "Tanaman berhasil ditambahkan ke tracker",
    "data": {
      "id": 1,
      "name": "Tomat Cherry",
      "tanggal": "2026-11-08T08:00:00.000Z",
      "created_at": "2026-11-08T15:20:00.000Z"
    }
  }
  ```
* **Response Error Validasi (HTTP 400 Bad Request)**:
  ```json
  {
    "success": false,
    "message": "Validasi gagal: nama dan tanggal wajib diisi"
  }
  ```

---

### 2. Ambil Daftar Tanaman (Get All Plants)
* **Method**: `GET`
* **Path**: `/api/plants`
* **Response Sukses (HTTP 200 OK)**:
  ```json
  {
    "success": true,
    "data": [
      {
        "id": 1,
        "name": "Tomat Cherry",
        "tanggal": "2026-11-08T08:00:00.000Z",
        "created_at": "2026-11-08T15:20:00.000Z"
      }
    ]
  }
  ```

---

## 📁 Struktur Folder & Konvensi Berkas

Implementasi harus memisahkan tanggung jawab (Separation of Concerns) ke dalam layer yang sesuai:

```text
src/
├── db/
│   └── schema.js               # Penambahan tabel `plants`
├── services/
│   └── plants-service.ts       # Logika bisnis & query database (Drizzle ORM)
├── routes/
│   └── plants-route.ts         # Definisi route ElysiaJS, validasi skema TypeBox
└── index.js                    # Registrasi router plants ke instance Elysia utama
```

### Tanggung Jawab Tiap Layer:

1. **Services Layer (`src/services/plants-service.ts` / `.js`)**:
   - Menangani operasi database menggunakan instance Drizzle `db`.
   - Fungsi untuk menyimpan tanaman baru (misal: `createPlant({ name, tanggal })`).
   - Fungsi untuk mengambil seluruh daftar tanaman (misal: `getAllPlants()`).

2. **Routes Layer (`src/routes/plants-route.ts` / `.js`)**:
   - Membuat instance Elysia baru dengan prefix `/api/plants`.
   - Menggunakan validator TypeBox (`t.Object`) untuk memastikan body request memiliki:
     - `name`: string, tidak boleh kosong, max 255 karakter.
     - `tanggal`: string format date-time / date yang valid.
   - Meneruskan data ke service layer dan memformat response JSON.

3. **Application Entry Point (`src/index.js`)**:
   - Mendaftarkan `plantsRoute` menggunakan `.use(plantsRoute)`.

---

## ✅ Kriteria Penerimaan (Acceptance Criteria)

- [ ] Tabel tanaman terdefinisi di skema Drizzle dan sinkron dengan database MySQL.
- [ ] Endpoint `POST /api/plants` berhasil menyimpan data tanaman dengan input `name` dan `tanggal`.
- [ ] Endpoint `POST /api/plants` menolak request jika `name` atau `tanggal` tidak disertakan (mengembalikan HTTP 400).
- [ ] Endpoint `GET /api/plants` mengembalikan daftar seluruh tanaman yang tersimpan dalam format array JSON.
- [ ] Kode terisolasi rapi pada `plants-route` dan `plants-service` sesuai konvensi penamaan berkas project.
- [ ] Router terpasang pada `src/index.js` tanpa merusak endpoint existing lainnya.

---

## 💡 Catatan Tambahan untuk Implementor

- Gunakan query builder Drizzle ORM (`db.insert(plants)`, `db.select().from(plants)`) tanpa raw SQL query.
- Format tanggal dapat menerima format string ISO-8601 (`YYYY-MM-DD` atau `YYYY-MM-DDTHH:mm:ssZ`) dan dikonversi menjadi tipe objek `Date` sebelum disimpan.
- Berkas dapat menggunakan ekstensi `.ts` atau `.js` sesuai konfigurasi TypeScript / JavaScript ESM proyek saat ini.

