Buatkan issue.md yang berisi perencanaan proyek Aplikasi Jurnal Pertumbuhan Tanaman (AgriTracker) untuk nanti di implementasikan oleh junior programmer atau AI model yang lebih murah.


Isi dari planning nya adalah sebagai berikut :

Tugas database:

Tidak perlu membuat tabel baru. Gunakan tabel plants yang sudah ada.

Lakukan operasi delete (penghapusan) data berdasarkan id tanaman yang dikirim melalui parameter URL (Primary Key).

Buatkan API untuk menghapus data tanaman

Endpoint : DELETE /api/plants/:id

Response Body (Success - HTTP 200 OK) :

JSON
{
    "success": true,
    "message": "Tanaman berhasil dihapus"
}
Response Body (Error - Jika tanaman tidak ditemukan / HTTP 404) :

JSON
{
    "success": false,
    "error": "Tanaman tidak ditemukan"
}
Struktur Folder di dalam src

routes : berisi routing Elysia.js untuk plants

services : berisi logika bisnis untuk query delete database menggunakan Drizzle ORM

Struktur file

routes : menggunakan format plants-route.ts (atau .js)

services : menggunakan format plants-service.ts (atau .js)