# [Feature] Implementasi Antarmuka Pengguna (Frontend UI) Alur Autentikasi

## 📋 Deskripsi
Mengembangkan antarmuka pengguna (Frontend UI) statis yang modern dan minimalis untuk alur autentikasi lengkap pada aplikasi, meliputi:
1. **Login** (`public/index.html`)
2. **Registrasi Akun** (`public/register.html`)
3. **Dashboard Terlindungi & Logout** (`public/dashboard.html`)

Dokumen ini disusun sebagai panduan high-level bagi Frontend Developer (Junior Programmer atau AI Model) untuk mengimplementasikan antarmuka dan integrasi API tanpa mengubah logika backend yang sudah ada.

---

## 🎨 Panduan Desain & Tech Stack

### 1. Tech Stack
- **HTML5 Murni** (Semantic & Accessible)
- **Vanilla JavaScript (ES6+)** (DOM Manipulation & Fetch API)
- **Tailwind CSS** (via CDN: `https://cdn.tailwindcss.com`)
- **Lucide Icons** (via CDN/unpkg)
- **Font**: Sans-serif modern (misal: *Plus Jakarta Sans* atau *Inter*)

### 2. Vibe & Styling
- **Tema**: Dark Mode modern, clean, dan monokromatik.
- **Palet Warna**:
  - Warna Dasar: `zinc-950` (background utama), `zinc-900` (card/surface), `zinc-800` (border).
  - Teks: `zinc-100` (primary heading/text), `zinc-400` / `zinc-500` (secondary/muted).
  - Warna Aksen: **Emerald Green** (`emerald-500` / `#10b981`) untuk tombol utama, focus ring, dan status aktif.
  - Warna Feedback: `rose-500` / `rose-900` untuk pesan error/gagal.
- **Komponen Form (shadcn/ui style)**:
  - Input field dengan sudut `rounded-md`, border halus `border-zinc-800`, dan efek focus ring `focus:ring-2 focus:ring-emerald-500/20`.
  - Tombol submit dengan transisi hover halus, drop shadow lembut, dan disabled state saat proses loading.

---

## 🎯 Spesifikasi Halaman & Integrasi API

### 1. Halaman Login (`public/index.html`)
* **Tujuan**: Pintu masuk utama pengguna ke dalam sistem.
* **Komponen & Input**:
  - Form input: `Email` dan `Password` (disertai tombol toggle lihat password).
  - Tombol Submit: "Masuk ke Akun" (dengan indikator loading saat request berlangsung).
  - Alert Box: Kotak notifikasi untuk menampilkan pesan kesalahan.
  - Navigasi: Link *"Belum punya akun? Daftar"* yang mengarah ke `register.html`.
* **Integrasi API**:
  - **Endpoint**: `POST /api/users/login`
  - **Request Body**:
    ```json
    {
      "email": "user@example.com",
      "password": "secretpassword"
    }
    ```
  - **Skenario Sukses (HTTP 200)**:
    - Ambil token dari properti respons (`data`).
    - Simpan ke `localStorage` dengan key `auth_token`.
    - Redirect pengguna ke `dashboard.html`.
  - **Skenario Gagal (HTTP 400/401)**:
    - Tampilkan kotak alert berwarna merah dengan pesan error yang sesuai dari backend.

---

### 2. Halaman Registrasi (`public/register.html`)
* **Tujuan**: Form pendaftaran akun baru bagi pengguna.
* **Komponen & Input**:
  - Form input: `Nama Lengkap`, `Email`, dan `Password`.
  - Tombol Submit: "Daftar Akun" (dengan status loading saat submit).
  - Alert Box: Untuk pesan error/validasi dari server.
  - Navigasi: Link *"Sudah punya akun? Masuk"* yang mengarah ke `index.html`.
* **Integrasi API**:
  - **Endpoint**: `POST /api/users` (atau alias `/api/users/register`)
  - **Request Body**:
    ```json
    {
      "name": "Budi Santoso",
      "email": "budi@example.com",
      "password": "password123"
    }
    ```
  - **Skenario Sukses (HTTP 201)**:
    - Tampilkan notifikasi berhasil mendaftar.
    - Redirect pengguna ke halaman login (`index.html`) setelah jeda singkat (misal 1 detik).
  - **Skenario Gagal (HTTP 400/409)**:
    - Tampilkan kotak alert merah berisi pesan kesalahan (misal: "Email sudah digunakan" atau kesalahan validasi).

---

### 3. Halaman Dashboard & Logout (`public/dashboard.html`)
* **Tujuan**: Halaman beranda terlindungi (hanya bisa diakses jika memiliki sesi aktif).
* **Proteksi Halaman (Client-Side Guard)**:
  - Sebelum halaman selesai dimuat, periksa `auth_token` di `localStorage`.
  - Jika token **tidak ada**, langsung tendang (redirect) pengguna ke `index.html`.
* **Aksi Tampil Profil Pengguna**:
  - Panggil API `GET /api/users/current` dengan header:
    ```http
    Authorization: Bearer <auth_token>
    ```
  - Jika token valid: Tampilkan nama, email, dan tanggal bergabung di komponen kartu dashboard.
  - Jika server merespons `401 Unauthorized`: Bersihkan `auth_token` dari `localStorage` dan redirect ke `index.html`.
* **Aksi Logout**:
  - Sediakan tombol "Logout" yang jelas di header atau navigation bar.
  - Saat diklik:
    1. Kirim request `DELETE /api/users/logout` (atau `/api/user/logout`) dengan header `Authorization: Bearer <auth_token>`.
    2. Hapus `auth_token` dari `localStorage`.
    3. Redirect pengguna kembali ke `index.html`.

---

## 📁 Struktur File Target

Semua berkas statis ditempatkan di dalam folder `public`:

```text
public/
├── index.html       # UI Halaman Login (Pintu Masuk)
├── register.html    # UI Halaman Pendaftaran Akun
└── dashboard.html   # UI Dashboard Terlindungi & Aksi Logout
```

---

## 🔄 Alur Navigasi Pengguna (User Flow)

```text
               [ Belum Punya Akun ]
[index.html] ------------------------> [register.html]
  (Login)    <------------------------   (Daftar)
     |          [ Sudah Punya Akun ]        |
     |                                      | (Sukses Registrasi)
     | (Login Sukses)                       v
     +--------------------------------> [index.html]
     |
     v
[dashboard.html]
  (Beranda Terlindungi)
     |
     | (Klik Logout / Token Expired)
     v
[index.html]
```

---

## ✅ Kriteria Penerimaan (Acceptance Criteria)

- [ ] File `public/index.html`, `public/register.html`, dan `public/dashboard.html` tersedia dan dapat diakses melalui browser.
- [ ] Tampilan konsisten mengusung tema Dark Mode (`zinc-950` / `zinc-900`) dengan aksen `emerald` bergaya *shadcn/ui*.
- [ ] Form Login berhasil melakukan autentikasi, menyimpan token di `localStorage`, dan mengarahkan ke dashboard.
- [ ] Form Registrasi berhasil mendaftarkan pengguna baru dan mengarahkan ke halaman login jika sukses.
- [ ] Error handling berjalan baik: pesan error backend ditampilkan secara visual (alert merah), bukan silent failure.
- [ ] Halaman `dashboard.html` terlindungi: pengguna yang tidak memiliki token otomatis di-redirect ke halaman login.
- [ ] Data profil pengguna (`name`, `email`) muncul di `dashboard.html` setelah berhasil login.
- [ ] Tombol Logout menghapus sesi di server dan browser, lalu mengembalikan user ke halaman login.
- [ ] Tombol submit memiliki state interaktif (disabled + animasi loading saat request berjalan).

---

## 💡 Catatan Tambahan untuk Implementor

- Gunakan Vanilla JS murni tanpa build step (tidak memerlukan bundler seperti Vite/Webpack).
- Pastikan semua panggilan network menangani blok `try...catch` untuk mengantisipasi jaringan down / server offline.
- Simpan key token secara konsisten dengan nama: `'auth_token'`.
