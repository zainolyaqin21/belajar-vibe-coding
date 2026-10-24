# Belajar Vibe Coding - Backend Project

Inisialisasi fondasi backend menggunakan **Bun**, **ElysiaJS**, dan **Drizzle ORM** dengan database **MySQL**.

## 🛠️ Tech Stack
- **Runtime & Package Manager**: [Bun](https://bun.sh/)
- **Web Framework**: [ElysiaJS](https://elysiajs.com/)
- **ORM**: [Drizzle ORM](https://orm.drizzle.team/) & `drizzle-kit`
- **Database Driver**: MySQL (`mysql2`)
- **Language**: JavaScript (ESM)

---

## 🏗️ Struktur Direktori
```text
├── drizzle/                # Direktori file migrasi SQL hasil generate drizzle-kit
├── src/
│   ├── db/
│   │   ├── index.js        # Inisialisasi pool MySQL & Drizzle instance
│   │   └── schema.js       # Definisi schema/tabel database Drizzle
│   └── index.js            # Entry point aplikasi ElysiaJS
├── drizzle.config.js       # Konfigurasi Drizzle Kit untuk migrasi & introspeksi
├── .env.example            # Template variabel environment
├── .env                    # Variabel environment lokal
├── .gitignore              # Git ignore file
└── package.json            # Manifest project & scripts
```

---

## 🚀 Memulai Proyek

### 1. Instalasi Dependensi
```bash
bun install
```

### 2. Konfigurasi Environment
Salin file `.env.example` ke `.env` (jika belum ada) dan sesuaikan kredensial database Anda:
```bash
cp .env.example .env
```

Contoh konfigurasi di `.env`:
```env
PORT=3000

# Opsi 1: Connection string
DATABASE_URL=mysql://root:password@localhost:3306/belajar_vibe_coding

# Opsi 2: Parameter terpisah
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=password
DB_NAME=belajar_vibe_coding
```

### 3. Menjalankan Server
Mode development (dengan auto-reload):
```bash
bun run dev
```

Mode production:
```bash
bun run start
```

Server default berjalan di `http://localhost:3000`.

---

## 🛣️ API Endpoints

| Method | Endpoint  | Deskripsi                     |
| :----- | :-------- | :---------------------------- |
| `GET`  | `/`       | Informasi status dasar API    |
| `GET`  | `/health` | Healthcheck server & database |

---

## 🗄️ Database & Migrasi (Drizzle)

- **Generate migrasi dari schema**:
  ```bash
  bun run db:generate
  ```
- **Jalankan migrasi**:
  ```bash
  bun run db:migrate
  ```
- **Push schema langsung ke database**:
  ```bash
  bun run db:push
  ```
- **Buka Drizzle Studio**:
  ```bash
  bun run db:studio
  ```
