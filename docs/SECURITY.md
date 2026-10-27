# Checklist keamanan

Pengaturan Polaroid memakai satu tabel tambahan dengan RLS `is_member()`, validasi maksimal lima referensi foto dan crop, serta update berbasis versi. Pengguna hanya dapat mengubah kolom `photos`; tidak ada grant insert/delete atau perubahan membership. Bucket foto dan policy tabel lama tidak diperluas. Enam tes PostgreSQL lokal menguji policy/privilege konfigurasi baru; tes API/Storage live tetap wajib setelah aktivasi. Lihat `docs/POLAROID_GALLERY.md`.

## Implementasi source

- [x] UUID anggota diprovisikan hanya administrator; label unik membatasi dua anggota.
- [x] RLS dan grants untuk semua tabel aplikasi; anon tidak punya akses tabel.
- [x] Pengguna aplikasi tidak bisa menambah/mengubah/menghapus membership.
- [x] Private bucket, tidak ada public URL permanen atau overwrite policy.
- [x] URL tampilan bertanda tangan 180 detik; download melalui SDK authenticated.
- [x] Tidak ada service-role/client secret/password dalam source atau env contoh.
- [x] Policy tidak bergantung pada email yang dikirim browser.
- [x] Editor dan versi ditentukan trigger database. Frontend update memakai ID + versi lama.
- [x] Catatan dihapus lunak; foto permanen meminta konfirmasi.
- [x] Tidak ada cache SW untuk respons Auth/data/foto Supabase.
- [x] Query data hanya setelah membership diperiksa; pembatalan hasil request mencegah data sesi lama masuk ke sesi berikutnya.
- [x] Google Maps URL dibatasi ke domain Google yang sesuai; tautan baru menggunakan noopener.
- [x] React merender teks pengguna dengan escaping standar, tanpa innerHTML.
- [x] Metadata foto dihapus lewat re-encode canvas. File dan ukuran divalidasi ulang oleh storage.

## Wajib sebelum data pribadi

- [ ] Jalankan tes SQL di Supabase lokal yang bersih.
- [ ] Periksa dua UUID benar-benar akun Google terverifikasi milik masing-masing.
- [ ] Uji anon dan akun ketiga dengan API langsung, bukan hanya layar frontend.
- [ ] Uji unduh foto privat, URL kedaluwarsa, dan tidak adanya public object access.
- [ ] Uji logout dan sesi di Safari, Chrome, serta PWA iOS.
- [ ] Periksa repository dan hasil build tidak memuat secret administratif/data pribadi.
- [ ] Pastikan kuota gratis dan izin provider sesuai konfigurasi.
- [ ] Simpan cadangan metadata dan foto asli.

Foto yang sudah diunduh tidak bisa dicabut dari perangkat pemegangnya. Signed URL masih berlaku hingga masa berlakunya habis setelah logout. Kunci publishable adalah publik dan tidak boleh dianggap kontrol keamanan. Tidak ada klaim bahwa pengujian keamanan server telah lulus sebelum tes terhubung dijalankan.
