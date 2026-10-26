# Laporan pengujian — 26 Oktober 2026

## Status

Implementasi source tersedia untuk ketujuh tahap brief. Konfigurasi layanan eksternal dan acceptance test perangkat nyata **belum selesai**. Pembaruan 27 Oktober: konfigurasi Supabase tersedia di `.env.local` yang diabaikan Git; pengguna telah menjalankan migrasi/seed dengan hasil Success dan mengatur Google OAuth. Layar akses ditolak setelah login sudah terlihat; membership dua UUID dan tes RLS API langsung masih diperlukan. Belum ada deployment GitHub Pages.

## Pembaruan akses ? 27 Oktober 2026

Mode tamu dihapus atas permintaan pengguna. Modul sandbox, foto lokal, tombol masuk tamu dan cabang bypass login sudah dihapus. Flag tamu lama di sessionStorage tidak memengaruhi pemeriksaan Google/keanggotaan. 10 unit test utama tetap berlaku; browser smoke memeriksa halaman login pada empat ukuran viewport, offline app shell, dan tidak adanya akses tamu walaupun flag lama disetel. Pengguna menjalankan SQL pendaftaran Rheno dengan hasil Success; akses akun nyata perlu dicoba kembali di browser pengguna. Fadla tetap harus login Google dan diprovisikan administrator lewat UUID, bukan dari aplikasi.

| Tahap | Source yang tersedia | Batas verifikasi |
| --- | --- | --- |
| 1 | React/TS/Vite/Tailwind, UI responsif, navigasi | Build dan screenshot halaman setup; halaman anggota perlu login nyata |
| 2 | Google PKCE, UUID anggota, RLS, private bucket, skrip tes SQL | SQL/RLS belum dieksekusi, tidak ada Docker/Postgres lokal atau Supabase terhubung |
| 3 | Trip/destination CRUD, arsip, soft delete/restore, seed 10 tempat | Validasi TypeScript dan unit test; CRUD server masih perlu acceptance test |
| 4 | Realtime, refresh/reconnect, checklist, compare-and-swap | Unit test update versi/offline; sinkronisasi dua perangkat belum diuji |
| 5 | Album, cerita, caption, foto privat, optimasi, download | Build; upload nyata dan orientasi foto masih perlu perangkat |
| 6 | Dashboard, hitung mundur, manifest, ikon, SW app shell | Unit test zona waktu/progres; PWA iPhone belum diuji |
| 7 | Workflow Pages, setup, panduan Indonesia, ekspor | Build project path dan pemeriksaan aset; deploy/OAuth produksi belum dijalankan |

## Pemeriksaan otomatis lokal

Perintah untuk mengulang:

```text
npm ci
npm run lint
npm test
npm audit
npm run build
node scripts/verify-build.mjs
```

Unit tests mencakup batas tengah malam Jakarta, hari akhir perjalanan, status arsip/mendatang, rentang tanggal lintas bulan/tahun kabisat, penanganan Wishlist/Skipped/soft delete dalam progres, update hanya pada versi yang sesuai, konflik versi, penolakan perubahan offline, dan error database. Tes persistence memakai stub SDK khusus lingkungan tes; aplikasi produksi tidak memakai stub atau database simulasi.

Build diuji dengan `VITE_BASE_PATH=/OURSTORY/`. Vite menghasilkan manifest, ikon, precache app shell, dan service worker. Browser Chrome headless digunakan untuk screenshot setup, pengukuran viewport 320/390/768/1440 px, pemeriksaan exception, dan reload offline; screenshot disimpan lokal di `test-results/` (diabaikan Git). Ini bukan bukti kesesuaian iOS atau halaman anggota setelah autentikasi.

Hasil validasi lokal terakhir:

| Pemeriksaan | Hasil |
| --- | --- |
| Instalasi dependency dan lockfile | Lulus |
| ESLint | Lulus |
| Unit test | 10 lulus, 0 gagal, 2 file |
| TypeScript + build produksi `/OURSTORY/` | Lulus |
| `npm audit` (termasuk dev dependencies) | 0 kerentanan dilaporkan |
| Pemeriksaan aset, ikon, scope, manifest, precache | Lulus |
| Chrome headless 320, 390, 768, 1440 px | Setup dan hash deep-link render; tidak ada overflow horizontal |
| Service worker dan offline reload | App shell setup termuat, tanpa uncaught JS exception |
| Penolakan key administratif saat build | Lulus: build dengan dummy `sb_secret_...` sengaja ditolak sebelum bundling |
| Supabase SQL/RLS/storage live dan OAuth nyata | Belum dijalankan |
| iOS Safari, Android fisik, PWA terpasang, deploy GitHub | Belum dijalankan |

Pemeriksaan browser dapat diulang dengan `node scripts/browser-smoke.mjs` setelah menjalankan preview pada `/OURSTORY/` port 4173. Memakai Chrome yang sudah terinstal, profil sementara terpisah, dan CDP; set `CHROME_PATH` bila lokasi browser berbeda. Jangan menafsirkan tersedianya skrip SQL sebagai tes keamanan yang sudah lulus.

## Tes database lokal yang harus dijalankan

Pasang Docker, Supabase CLI, dan psql, lalu gunakan database lokal kosong:

```text
supabase start
supabase db reset
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -v ON_ERROR_STOP=1 -f supabase/tests/rls.sql
```

Skrip menggunakan tiga akun dummy `example.invalid`, menguji kedua anggota, perubahan versi, stale update, larangan self-authorization, akun ketiga, anon, dan kebijakan objek bucket privat. Transaksi di-rollback. **Jangan menjalankannya pada proyek pribadi berisi anggota/data asli.** Migrasi berlaku sekali melalui riwayat migrasi; hanya seed yang dirancang untuk diulang.

Tambahkan acceptance tests API live: insert/update destination/memory/photo bagi anggota, penolakan mutasi bagi akun ketiga, relasi memory lintas trip ditolak, akses public URL foto ditolak, signed URL kedaluwarsa, dan delete storage tidak dapat dilakukan anon. Periksa hasil setiap request, tidak cukup melihat layar akses ditolak.

## Acceptance test dua pengguna

- [ ] Rheno dan Fadla login Google; nama benar dan izin identik.
- [ ] Akun Google ketiga tidak dapat membaca/mengubah semua tabel atau bucket lewat SDK langsung.
- [ ] Anon tidak dapat mengambil itinerary atau foto.
- [ ] Buat/edit/archive/delete/restore trip; deep-link reload pada URL Pages.
- [ ] Buat/edit/pindah hari/ubah jam/urutkan destination, Wishlist tanpa tanggal.
- [ ] Checklist Visited tersimpan sebelum dialog; Skip for now tidak membatalkan; undo tidak menghapus kenangan; Skipped tidak dianggap Visited.
- [ ] Dua perangkat menerima perubahan Realtime; putus jaringan lalu reconnect/refresh.
- [ ] Buka edit item sama pada dua perangkat, simpan A lalu B; B harus mendapat konflik dan tidak menimpa A.
- [ ] Upload beberapa JPG/PNG/WebP termasuk EXIF rotated; cek orientasi, rasio, wajah asli, kompresi, error/retry; HEIC mendapat instruksi konversi.
- [ ] Preview/edit caption/download/hapus foto; album Destination dan Random moment; filter per trip.
- [ ] Simulasikan gagal simpan metadata setelah upload; berkas dihapus kembali. Periksa file yatim saat penggantian cover dan gagal hapus berkas.
- [ ] Ekspor JSON/teks; unduh foto satu per satu dan cek hasilnya.
- [ ] Android Chrome 360/390 px, Safari iPhone kecil, tablet, desktop, keyboard dan reduced motion.
- [ ] Instal Android PWA dan iPhone Home Screen; Google login dari PWA iOS kembali dengan sesi benar.
- [ ] Offline pada tab terbuka menampilkan data terakhir dan menolak edit; relaunch offline menampilkan app shell tanpa mengklaim data cloud tersimpan.
- [ ] Logout dua platform/PWA; back/reload tidak mengembalikan data privat ke UI.
- [ ] Supabase dijeda / request gagal: pesan layanan dan retry; pemulihan manual melalui dashboard.

## Batas yang diketahui

- Tidak ada impor JSON otomatis atau ZIP seluruh foto.
- Satu trip dibatasi maksimal 366 hari untuk menjaga date tabs tetap terkelola.
- Offline tanpa antrean mutasi dan tanpa cache persisten itinerary privat.
- Ikon/map placeholder adalah ilustrasi abstrak, bukan foto bisnis atau foto pasangan.
- Sampah bukan riwayat revisi penuh. Foto yang dihapus permanen memerlukan cadangan independen.
- Sampul lama dapat menyisakan berkas privat; perlu pembersihan administrator berdasarkan referensi, termasuk sampah.
- Pengukuran storage UI hanya menjumlahkan metadata foto album; dashboard Supabase merupakan sumber total kuota.
- Ketersediaan/kuota gratis dan perilaku OAuth iOS harus diverifikasi pada provider/perangkat, tidak dijamin oleh build lokal.
