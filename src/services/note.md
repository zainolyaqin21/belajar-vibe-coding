Buatkan issue.md yang berisi perencanaan proyek Aplikasi Jurnal Pertumbuhan Tanaman (AgriTracker) untuk nanti di implementasikan oleh junior programmer atau AI model yang lebih murah.


Isi dari planning nya adalah sebagai berikut :

Tugas database:

Tidak perlu membuat tabel baru. Gunakan tabel plants yang sudah ada.

Lakukan operasi update data berdasarkan id tanaman yang dikirim melalui parameter URL (Primary Key).

Buatkan API untuk mengedit/meng-update data tanaman

Endpoint : PUT /api/plants/:id

Request Body (JSON) :

JSON
{
    "name": "Tomat Super Update",
    "tanggal": "2026-11-09T08:00:00Z"
}
Response Body (Success - HTTP 200 OK) :

JSON
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
Response Body (Error - Jika tanaman tidak ditemukan / HTTP 404) :

JSON
{
    "success": false,
    "error": "Tanaman tidak ditemukan"
}
Struktur Folder di dalam src

routes : berisi routing Elysia.js untuk plants

services : berisi logika bisnis untuk query update database menggunakan Drizzle ORM

Struktur file

routes : menggunakan format plants-route.ts (atau .js)

services : menggunakan format plants-service.ts (atau .js)