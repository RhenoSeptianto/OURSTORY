# Our Travel Stories ♡ — Rheno & Fadla

Aplikasi privat untuk dua orang, dibuat di workspace `D:\OURSTORY`. React + TypeScript + Vite, Tailwind, Lucide, Supabase, dan PWA. Tidak menggunakan server aplikasi tambahan, API Maps berbayar, atau database simulasi. Tanpa konfigurasi cloud, halaman menampilkan status setup, bukan data privat palsu.

## Menjalankan lokal

1. Instal Node.js 22 LTS (minimal 22.13; disarankan patch terbaru).
2. `npm ci`
3. Salin `.env.example` ke `.env.local`. Isi URL proyek dan **publishable key** Supabase (`sb_publishable_...`). Jangan memakai service-role, secret key, Google client secret, atau password database di env Vite.
4. Untuk lokal, isi `VITE_BASE_PATH=/` di `.env.local`.
5. `npm run dev`, buka URL yang dicetak Vite (biasanya `http://127.0.0.1:5173`).

## Supabase dan Google OAuth

1. Buat proyek **Supabase Free**. Simpan password database hanya di pengelola password.
2. Jalankan `supabase/migrations/001_schema.sql` di SQL Editor administrator sekali. Untuk workflow CLI, migrasi dikelola melalui riwayat migrasi Supabase. Jalankan `supabase/seed.sql`; seed aman diulang dan tidak menimpa itinerary yang sudah diedit.
3. Di Google Cloud Console, buat OAuth consent screen dan OAuth client bertipe Web application. Tambahkan dua akun sebagai test users jika consent screen masih Testing. Testing Google dapat mengharuskan login ulang berkala; ikuti konfigurasi Google yang berlaku.
4. Redirect URI Google adalah `https://PROJECT_REF.supabase.co/auth/v1/callback` (salin persis dari Supabase Authentication → Providers → Google). Isi client ID dan secret **hanya** di dashboard Supabase.
5. Aktifkan Google provider. Matikan provider email/password jika tidak diperlukan. Di Authentication → URL Configuration, isi Site URL produksi `https://USERNAME.github.io/REPO/`. Tambahkan redirect allowlist persis untuk URL produksi tersebut dan `http://127.0.0.1:5173/` (tambahkan `http://localhost:5173/` hanya bila dipakai).
6. Aplikasi menggunakan PKCE dan navigasi OAuth pada jendela yang sama. Redirect kembali ke root proyek sebelum HashRouter mengambil alih. Jangan memasukkan `/#/...` sebagai redirect Google.
7. Kedua pemilik masuk sekali menggunakan Google. Mereka akan melihat akses ditolak sebelum UUID diotorisasi. Akun Google ketiga juga boleh memiliki sesi Auth tetapi tidak memperoleh data aplikasi.
8. Administrator memeriksa Authentication → Users: cocokkan akun Google yang benar, status verifikasi email, dan provider Google. Salin UUID terverifikasi masing-masing. Jalankan SQL berikut **di dashboard administrator**, mengganti placeholder, jangan commit UUID atau email nyata:

```sql
insert into public.authorized_members(id,display_name) values
 ('UUID_RHENO_TERVERIFIKASI','Rheno'),
 ('UUID_FADLA_TERVERIFIKASI','Fadla');
```

Tabel mengizinkan tepat dua label unik, tidak memberi izin insert/update/delete kepada pengguna aplikasi, dan RLS memakai UUID sesi. Untuk mengganti akun, administrator perlu mencadangkan data dan memigrasikan referensi created_by/updated_by; jangan menghapus pengguna Auth lama begitu saja. Untuk mencabut akses segera, lakukan migrasi referensi dan cabut membership/sesi melalui administrator. URL foto bertanda tangan yang telah diterbitkan berlaku hingga 3 menit.

9. Segarkan aplikasi, pastikan nama akun benar. **Lakukan tes RLS dan akses storage sebelum mengunggah data pribadi.** Detail di `docs/TESTING.md` dan `docs/SECURITY.md`.

Referensi resmi: [Google OAuth](https://supabase.com/docs/guides/auth/social-login/auth-google), [redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls), [private Storage](https://supabase.com/docs/guides/storage/serving/downloads).

## Deploy GitHub Pages

1. Buat repository GitHub tanpa data pribadi. Dari workspace: `git init`, `git add .`, `git commit -m "Build Our Travel Stories"`, `git branch -M main`; tambahkan remote repository Anda dan push. Periksa daftar berkas sebelum commit; `.env.local` harus diabaikan.
2. Settings → Secrets and variables → Actions → **Variables**: isi `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`. Keduanya merupakan konfigurasi publik; RLS yang melindungi data. Tidak perlu secret administratif di build.
3. Settings → Pages → Source: **GitHub Actions**.
4. Workflow `.github/workflows/deploy.yml` menjalankan lint, unit tests, build, lalu deploy `dist`. Base path otomatis memakai nama repo, termasuk huruf besar/kecil. Untuk repository khusus `USERNAME.github.io`, ubah `VITE_BASE_PATH` workflow menjadi `/`.
5. Update allowlist OAuth sesuai URL Pages final. Halaman memakai HashRouter, misalnya `https://USERNAME.github.io/OURSTORY/#/trips/UUID`, sehingga refresh deep-link tidak memerlukan server rewrite.
6. Untuk memeriksa build manual dari project path: `$env:VITE_BASE_PATH='/OURSTORY/'; npm run build; npm run preview`, buka `/OURSTORY/`.
7. Pastikan workflow lulus dan URL HTTPS berfungsi sebelum memasang PWA. Repo publik dapat digunakan untuk GitHub Pages gratis; data aplikasi tetap di Supabase privat. Hosting Pages dari repo privat mengikuti ketersediaan paket GitHub Anda.

## Arsitektur dan perawatan

- `src/useStories.ts`: pemeriksaan UUID anggota sebelum query data, sesi Auth, subscription Realtime, refresh saat fokus/reconnect, polling pemulihan tiap 60 detik **hanya selama aplikasi terbuka**.
- `src/lib.ts`: persistence dengan compare-and-swap `version`, perhitungan tanggal zona tujuan, kompresi foto standar canvas tanpa AI.
- `src/App.tsx`, `forms.tsx`, `components.tsx`: dashboard, CRUD trip dan itinerary, album, sampah, ekspor, upload dan URL foto privat.
- `supabase/migrations`: relasi, RLS, audit metadata, trigger versi/editor, bucket privat, publikasi Realtime.
- `public/`: ikon raster dari SVG asli dan aset PWA; `node scripts/icons.mjs` untuk regenerasi.
- `npm run lint`, `npm test`, `npm run build` untuk pemeriksaan lokal. `package-lock.json` mengunci versi terpasang.
- `node scripts/verify-build.mjs` memeriksa aset hasil build; `node scripts/browser-smoke.mjs` memeriksa halaman setup dan offline app shell lewat Chrome lokal setelah preview `/OURSTORY/` berjalan pada port 4173.

Sampah bersifat soft delete tanpa batas retensi otomatis. Trip yang dihapus menyembunyikan anak-anaknya di UI; pulihkan trip untuk membuka anak-anaknya kembali. Riwayat aktivitas hanya merekam jenis perubahan, ID dan aktor, bukan salinan konten historis. Konflik edit menolak penyimpanan yang memakai versi lama dan meminta refresh. Form tetap terbuka sehingga isi dapat disalin sebelum mencoba ulang. Perubahan checklist disimpan dulu; menutup dialog kenangan tidak membatalkannya.

Foto JPG/PNG/WebP hingga 25 MB diperkecil maks. 1800 px dan ditargetkan ≤1,5 MB. MIME dan ukuran divalidasi di klien serta bucket; canvas menulis ulang piksel sehingga metadata GPS tidak ikut disalin. EXIF orientation diproses oleh browser. HEIC perlu diekspor sebagai JPG. Salinan lossy tidak menjamin identik per piksel; identitas visual tidak direkonstruksi AI. Upload menampilkan tahap optimasi/upload/simpan, bukan persentase jaringan palsu. Pilih ulang file untuk retry. Download foto dilakukan satu per satu, tanpa memuat seluruh pustaka ke memori.

## Privasi, offline, biaya, dan batas operasional

Service worker hanya precache app shell/aset build, tidak memakai runtime cache untuk Supabase. Data privat disimpan dalam memori tab, tidak di IndexedDB/localStorage; sesi Auth tersimpan oleh SDK. Saat offline, data yang sudah dimuat tetap terlihat di tab terbuka, edit dinonaktifkan. Setelah menutup aplikasi, tidak ada jaminan itinerary tersedia offline. Logout menghapus sesi dan data React; browser mundur tidak membuka salinan data dari SW.

Target operasional Rp0 memakai GitHub Pages dan Supabase Free, **tanpa jaminan ketersediaan atau batas gratis tetap**. Pantau Storage, egress, database, dan Realtime di dashboard; jangan mengaktifkan upgrade berbayar tanpa keputusan sendiri. [Supabase Free dapat dijeda setelah aktivitas rendah selama tujuh hari](https://supabase.com/docs/guides/platform/free-project-pausing); pulihkan lewat dashboard. Aplikasi menampilkan retry ketika layanan gagal. Tidak ada keep-alive buatan saat aplikasi tertutup.

Foto yang diganti menjadi sampul dapat meninggalkan versi lama di bucket. Hapus berkas yatim hanya setelah membandingkan seluruh referensi `trips.cover_path`, `destinations.photo_path`, dan `memory_photos.path`, termasuk catatan di sampah. Jangan menghapus berkas yang masih dipakai. Gunakan dashboard administrator untuk pemeliharaan, bukan service-role di browser. Teks ekspor dan JSON tidak menyertakan file foto; unduh foto via album. Belum ada impor JSON otomatis atau ekspor ZIP massal.

**Belum dapat dianggap siap untuk data pribadi sebelum konfigurasi provider, tes RLS live, uji login Google dan PWA di perangkat nyata selesai.** Lihat laporan pengujian untuk membedakan pemeriksaan otomatis dan yang masih harus dilakukan manual.

Panduan pemakaian: [Bahasa Indonesia](docs/PANDUAN.md). Laporan uji: [TESTING](docs/TESTING.md). Checklist keamanan: [SECURITY](docs/SECURITY.md).
