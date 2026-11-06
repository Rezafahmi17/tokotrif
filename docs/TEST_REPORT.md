# Laporan pengujian — TemuToko Marketplace COD

Tanggal: 6 November 2026.

## Yang berhasil diverifikasi di lingkungan pembuatan

- [x] **Struktur source code** frontend / backend / database dibuat dan dibungkus ZIP.
- [x] **Jumlah tabel SQL = 20** (pemeriksaan definisi `CREATE TABLE`).
- [x] **Sintaks JavaScript backend** diperiksa menggunakan `node --check` pada seluruh modul.
- [x] **Sintaks JSX frontend** diperiksa dengan parser TypeScript (44+ file JSX, tanpa parsing error saat diperiksa).
- [x] **4 tes unit aturan bisnis** lulus memakai `node --test`: transisi status normal, penolakan transaksi lunas dua kali, pagination, dan slug.

## Belum diverifikasi / memerlukan pengujian di Windows + XAMPP

- [ ] Impor schema.sql dan kedua seed.sql melalui phpMyAdmin tanpa error.
- [ ] `GET /api/health` benar-benar terhubung ke MySQL.
- [ ] Seluruh alur login, daftar toko, persetujuan, dan penolakan.
- [ ] Upload foto, termasuk penolakan foto keenam dan file melebihi 2 MB.
- [ ] Isolasi antar toko dari seluruh akses objek melalui URL/API.
- [ ] Dua pelanggan memesan stok terakhir secara bersamaan (race condition).
- [ ] Transaksi konfirmasi lunas dan rollback atomik dalam database nyata.
- [ ] Chat Socket.IO antardua browser tanpa refresh.
- [ ] Export Excel dibuka di Excel/Google Sheets dan angka cocok dengan dashboard.
- [ ] Frontend responsive pada lebar 360px, 768px, 1280px.
- [ ] `npm run build` dan `npm run lint` frontend dengan dependensi terpasang.

**Catatan kejujuran verifikasi:** lingkungan pembuatan tidak memiliki server MySQL dan akses ke registry npm sedang tidak tersedia, sehingga hasil di atas **bukan** klaim bahwa seluruh checklist penerimaan PRD sudah lolos. Integrasi langsung masih perlu dijalankan oleh pengguna di komputer lokal.
