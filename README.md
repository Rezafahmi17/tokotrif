# TemuToko — Marketplace Multi-Toko COD

Proyek source code **JavaScript** untuk dibuka di **Visual Studio Code**. Diimplementasikan berdasarkan *PRD dan Skema Prompt — Marketplace Multi-Toko COD* (6 November 2026), dengan frontend Next.js, backend Express + Socket.IO, dan MySQL terpisah.

**Pembayaran hanya COD tunai** saat pembeli bertemu penjual. **Tidak ada kurir, ongkos kirim, payment gateway, atau pembayaran digital.** Ini adalah implementasi awal untuk dijalankan dan diuji secara lokal, **belum siap produksi** sebelum integrasi, keamanan, dan seluruh 16 skenario PRD diuji penuh.

## 1. Prasyarat

- Windows 10/11 dengan **VS Code**.
- **Node.js 20 atau 22 LTS** dan npm.
- **XAMPP** (Apache untuk phpMyAdmin dan MySQL/MariaDB). Start MySQL; Apache jika ingin impor lewat phpMyAdmin.
- Internet saat pertama kali menjalankan `npm install`.

## 2. Buka proyek di VS Code

1. Ekstrak ZIP `TemuToko-Marketplace-COD-VSCode.zip` ke folder pilihan, misalnya `D:\Marketplace-COD`.
2. Buka VS Code → **File > Open Workspace from File**.
3. Pilih file **`Marketplace-COD.code-workspace`** di dalam folder `marketplace`.
4. Buka dua terminal VS Code untuk **backend** dan **frontend**.

## 3. Impor database melalui XAMPP/phpMyAdmin

1. Start **MySQL** dan **Apache** di XAMPP.
2. Kunjungi `http://localhost/phpmyadmin` (sesuaikan jika port Apache bukan 80).
3. Klik tab **SQL** atau **Import**, impor berurutan:
   1. `database/schema.sql` — membuat database `marketplace_cod` dan **20 tabel**.
   2. `database/seed.sql` — admin awal, 8 kategori, 1 hero banner, pengaturan 30 hari.
   3. `database/seed_demo.sql` — **opsional untuk demo**, menambah 2 toko disetujui, 10 produk, dan 1 customer.
4. Refresh panel kiri dan pastikan `marketplace_cod` memiliki 20 tabel.

> **Khusus pengguna yang MySQL XAMPP-nya di port 3307:** ganti `DB_PORT=3307` pada `backend/.env`! Port Apache/phpMyAdmin berbeda dengan port MySQL.

## 4. Jalankan backend di port 5000

Di terminal **PowerShell** VS Code:

```powershell
cd backend
Copy-Item .env.example .env
npm install
npm run dev
```

Buka `backend/.env` lalu periksa bagian:

```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=marketplace_cod
JWT_SECRET=ganti_dengan_random_string_minimal_32_karakter_yang_sangat_acak
CLIENT_ORIGIN=http://localhost:3000
```

Jika MySQL XAMPP dipasang di port 3307, ubah `DB_PORT=3307`. Jika akun `root` mempunyai sandi, isi `DB_PASSWORD`. **Ganti JWT_SECRET dengan nilai acak kuat (minimal 32 karakter), jangan pakai nilai contoh untuk hosting publik.** Restart backend setelah mengubah `.env`.

Tes backend melalui browser: **http://localhost:5000/api/health**. Jika berhasil dan terhubung ke database, API menjawab JSON berisi `success: true` dan `database: connected`. Jika gagal, cek XAMPP dan `backend/.env`.

## 5. Jalankan frontend di port 3000

Buka terminal VS Code kedua:

```powershell
cd frontend
Copy-Item .env.local.example .env.local
npm install
npm run dev
```

Buka **http://localhost:3000**. Frontend mengakses API di `http://localhost:5000/api` dan Socket.IO pada `http://localhost:5000`.

Saat menjalankan via dua terminal, **biarkan kedua terminal tetap menyala**. Tekan `Ctrl+C` pada tiap terminal untuk menghentikan server.

## 6. Akun awal (HANYA UNTUK LOKAL / DEMO)

| Peran | Email | Sandi |
|---|---|---|
| Super Admin | `admin@marketplace.local` | `AdminCOD123!` |
| Admin Toko 1 (hanya jika seed_demo diimpor) | `toko.satu@demo.local` | `DemoCOD123!` |
| Admin Toko 2 (hanya jika seed_demo diimpor) | `toko.dua@demo.local` | `DemoCOD123!` |
| Customer demo (hanya jika seed_demo diimpor) | `pembeli@demo.local` | `DemoCOD123!` |

**Ganti semua sandi setelah setup.** Hash bcrypt (cost 12) tersimpan di database, bukan sandi teks biasa. Untuk menghasilkan hash sandi lain: `cd backend && npm run hash -- "SandiBaru123!"`.

Jika tidak memasukkan `seed_demo.sql`, buat akun pembeli di `/daftar` dan ajukan toko di `/daftar-toko`, kemudian setujui melalui `/super-admin/verifikasi`.

## 7. Cara menguji alur COD

1. Login Super Admin di `/masuk`, lalu buka `/super-admin/verifikasi` untuk menerima pendaftaran toko.
2. Login penjual yang sudah disetujui → `/admin-toko`. Tambah produk dan foto melalui **Produk**.
3. Login pembeli dari browser lain/incognito. Buka produk, tambah ke **Keranjang**.
4. Buka **Checkout**. Keranjang yang terdiri dari dua toko menghasilkan **dua pesanan**. Stok fisik **belum dikurangi**; kuantitas ditahan dalam `products.reserved`.
5. Dari detail produk, tekan **Chat**; penjual juga bisa membuka `/chat`. Sepakati lokasi dan waktu COD.
6. Penjual buka **Pesanan** → **Terima dan sepakati COD**, masukkan lokasi dan tanggal/jam.
7. Setelah pembeli benar-benar membayar tunai, penjual tekan **Konfirmasi lunas**. Dalam **satu transaksi SQL**, `stock` dan `reserved` dikurangi, `sold_count` bertambah, pendapatan otomatis tercatat, dan riwayat pesanan diperbarui.
8. Pembeli tekan **Barang sudah diterima**, lalu dapat mengirim rating dan ulasan.
9. Penjual buka **Keuangan**, catat pengeluaran, lihat grafik, dan **Unduh Excel (.xlsx)**.

Catatan desain: pembeli hanya dapat membatalkan ketika pesanan `pending` (sebelum kesepakatan COD); penjual dapat membatalkan ketika `pending` atau `confirmed`, sesuai diagram utama di PRD halaman 3. Pembatalan melepas `reserved`.

## 8. Struktur folder

```text
marketplace/
├── Marketplace-COD.code-workspace
├── frontend/
│   ├── app/            # beranda, autentikasi, produk, toko, checkout, dashboard
│   ├── components/     # header, footer, kartu produk, dashboard, UI
│   ├── context/        # sesi dan keranjang
│   ├── lib/api.js      # fetch wrapper, format Rupiah
│   ├── .env.local.example
│   └── package.json
├── backend/
│   ├── src/
│   │   ├── config/     # koneksi dan env MySQL
│   │   ├── services/   # transaksi dan aturan bisnis
│   │   ├── routes/     # endpoint REST
│   │   ├── sockets/    # Socket.IO chat
│   │   ├── middlewares/, utils/
│   │   └── app.js, server.js
│   ├── tests/
│   ├── requests.http
│   ├── .env.example
│   └── package.json
├── database/
│   ├── schema.sql
│   ├── seed.sql
│   └── seed_demo.sql
└── docs/
    ├── PRD-source.txt
    └── TEST_REPORT.md
```

## 9. Endpoint ringkas

| Prefix | Fungsi utama |
|---|---|
| `/api/auth` | daftar, daftar toko, masuk, keluar, profil, reset sandi |
| `/api/catalog` | beranda, produk, kategori, toko publik |
| `/api/admin` | verifikasi, toko, kategori, banner, audit log, pengaturan |
| `/api/store` | profil toko, dashboard, keuangan |
| `/api/store/products` | produk, foto, stok dan riwayat |
| `/api/store/orders` | jadwal COD, lunas, batal |
| `/api/cart` | keranjang pembeli |
| `/api/orders` | checkout, detail, pembatalan, terima, ulasan |
| `/api/chat` | thread, pesan, penanda dibaca |
| `/api/notifications` | notifikasi pengguna |

Seluruh rute privat memakai cookie JWT `httpOnly`. Data penjual selalu dibatasi melalui `store_id` dari sesi backend; bukan dari request browser. Input divalidasi Zod, SQL memakai parameter. File gambar maksimal 2 MB dan dikonversi ke WebP.

## 10. Uji dan pencadangan

```powershell
cd backend
npm test
npm run lint
npm run build
```

```powershell
cd frontend
npm run lint
npm run build
```

Backup contoh pada MySQL di PATH:

```powershell
mysqldump -h 127.0.0.1 -P 3306 -u root -p marketplace_cod > marketplace_backup.sql
```

Ganti `-P 3307` jika port MySQL adalah 3307. Untuk XAMPP, executable `mysqldump.exe` biasanya berada di `C:\xampp\mysql\bin\`.

## 11. Keterbatasan dan kewajiban QA

- Paket sumber disiapkan tanpa menjalankan server MySQL langsung; **migrasi schema, login end-to-end, upload, chart, chat real-time, concurrency, dan build Next.js masih harus diuji pada mesin yang memiliki MySQL dan dependensi npm**. Baca `docs/TEST_REPORT.md`.
- Tidak ada mekanisme pembayaran online. Tidak ada otomasi pembatalan kedaluwarsa maupun kode serah-terima tahap 2.
- Antarmuka menggunakan font Plus Jakarta Sans melalui Google Fonts dengan fallback `system-ui` saat offline.
- Backend `NODE_ENV=production` membutuhkan HTTPS untuk cookie `Secure`, domain dan CORS sesuai alamat hosting, penyimpanan gambar persisten, SMTP aktif, database user non-root, reverse proxy, dan uji keamanan.
- Jangan memakai akun demo atau `JWT_SECRET` contoh di produksi.
