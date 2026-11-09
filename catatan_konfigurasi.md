# SiapTKA — Catatan Konfigurasi dan Rilis

> **Status**: Versi 2.0 Stabil ✅
> **Tanggal pembaruan**: 9 November 2026
> **Ringkasan rilis**: Menyelesaikan manajemen admin Versi 1.9 dan menambahkan halaman 404 kustom.

---

## 1. Ringkasan Aplikasi

SiapTKA adalah aplikasi latihan Tes Kemampuan Akademik (TKA) berbasis web dan PWA.

| Komponen | Teknologi / penyimpanan |
|---|---|
| Frontend | HTML, CSS, JavaScript |
| Backend | Google Apps Script (GAS), API JSONP |
| Database | Google Sheets: `Teachers`, `Activations`, `Classes`, `Students`, `Results`, `Packages` |
| Berkas soal | XML UTF-8 di Google Drive, dibaca melalui `DriveApp` |
| Cache offline | Service Worker, saat ini `siaptka-v13` |
| Sesi guru/admin | `localStorage` pada perangkat dan browser masing-masing |

### Peran

| Peran | Halaman | Fungsi utama |
|---|---|---|
| Super Admin | `admin.html` | Mengelola guru, aktivasi, paket soal, dan sesi guru |
| Guru | `guru.html` | Mengelola kelas, memantau murid, melihat laporan dan preview paket |
| Murid | `murid.html` | Bergabung ke kelas, mengerjakan soal, menyimpan draft, dan melihat hasil sesuai konfigurasi kelas |
| Publik | `landing.html`, `index.html` | Informasi aplikasi dan gerbang akses/PWA |

---

## 2. Berkas Utama

| Berkas | Fungsi |
|---|---|
| `index.html` | Gerbang peran; akses aplikasi mengikuti status mode PWA standalone |
| `landing.html` | Halaman informasi publik SiapTKA |
| `guru.html` | Login/aktivasi guru, dashboard, kelas, dan laporan |
| `murid.html` | Alur murid, autosave jawaban, pengerjaan, dan review |
| `admin.html` | Panel super admin untuk guru, aktivasi, dan paket |
| `404.html` | Halaman khusus untuk alamat/halaman yang tidak ditemukan |
| `api.js` | Lapisan pemanggilan API JSONP dan penyimpanan sesi frontend |
| `Code.gs` | Router, validasi, dan logika backend Google Apps Script |
| `laporan.js` | Grafik serta ekspor laporan guru |
| `head.js` | Injeksi favicon dan metadata bersama |
| `sw.js` | Cache app shell dan perilaku offline |
| `manifest.json` | Identitas dan konfigurasi instalasi PWA |
| `soal.xml` | Contoh format paket soal |
| `konfigurasi_authoring_soal.md` | Panduan authoring soal TKA |
| `.htaccess` | Rewrite URL dan konfigurasi Apache/XAMPP |

---

## 3. Fitur Stabil

### Guru dan kelas
- Login dan aktivasi akun guru; password disimpan sebagai hash SHA-256 dengan salt.
- Pembuatan, pengubahan, penutupan, pembukaan, dan soft-delete kelas.
- Kelas yang sudah menerima submit tidak dapat diubah; kelas hanya dapat dihapus setelah ditutup.
- Dashboard menampilkan ringkasan kelas, daftar murid, laporan, serta preview paket soal khusus guru.
- Preview dan endpoint guru memerlukan sesi bertoken yang divalidasi oleh backend.

### Murid dan soal
- Murid bergabung menggunakan kode kelas dan PIN jika diatur.
- Draft jawaban tersimpan di perangkat murid dan dipulihkan saat kembali ke latihan.
- Tipe soal yang didukung: `pg`, `isian`, `uraian`, `benar_salah`, `pg_kompleks`, dan `memasangkan`.
- Penilaian pilihan ganda kompleks dan memasangkan mendukung skor parsial.
- Rendering notasi soal mengizinkan `<sup>` dan `<sub>` melalui whitelist; kunci jawaban dinilai di backend.

### Manajemen admin — Versi 1.9
- Admin dapat memblokir dan membuka blokir akun guru.
- Admin dapat mencabut seluruh sesi guru melalui **Force logout**.
- Perubahan status blokir mencabut sesi aktif. Permintaan guru berikutnya ditolak; guru harus login kembali setelah blokir dibuka.
- Kelas dan akses murid yang sudah berjalan tidak otomatis dihapus atau dinonaktifkan oleh tindakan blokir.
- Grafik tren aktivasi kode yang bersifat opsional secara resmi dikeluarkan dari cakupan Versi 1.9 dan dianggap selesai tanpa implementasi fitur.

### Versi 2.0
- Halaman `404.html` kustom untuk hosting statis dan Apache.
- Catatan konfigurasi diperbarui sebagai dokumentasi rilis stabil.

---

## 4. Backend dan Database

### Tab dan kolom spreadsheet

`initSheet()` membuat tab dan header yang belum tersedia. Kolom baru pada `Teachers` ditambahkan secara idempoten.

| Tab | Kolom |
|---|---|
| `Teachers` | `id`, `email`, `password_hash`, `salt`, `nama`, `sekolah`, `aktif_sampai`, `created_at`, `is_blocked`, `session_version` |
| `Activations` | `kode`, `dipakai_oleh`, `tanggal_pakai`, `status` |
| `Classes` | `id`, `teacher_id`, `nama_kelas`, `paket_id`, `kode_kelas`, `pin`, `durasi_menit`, `buka`, `tutup`, `acak`, `tampil_pembahasan`, `status`, `created_at` |
| `Students` | `id`, `class_id`, `nama`, `absen`, `waktu_masuk` |
| `Results` | `id`, `student_id`, `class_id`, `skor`, `jawaban_json`, `waktu_selesai`, `durasi_detik` |
| `Packages` | `id`, `nama_paket`, `file_xml`, `harga`, `aktif` |

Nilai `is_blocked` menggunakan `1` atau `0`. `session_version` dinaikkan untuk mencabut sesi; akun lama yang kolomnya baru ditambahkan menggunakan versi awal `1`. Backend membandingkan nilai spreadsheet dengan normalisasi string bila diperlukan.

### Konfigurasi dan deploy GAS
1. Pastikan `SPREADSHEET_ID` menunjuk ke spreadsheet yang benar.
2. Simpan `ADMIN_TOKEN` sebagai rahasia. Jangan menaruh token atau password di dokumentasi, commit, tautan, atau pesan.
3. Deploy sebagai Web App dengan **Execute as: Me** dan akses **Anyone** sesuai kebutuhan API JSONP.
4. Setiap perubahan `Code.gs` memerlukan deploy **New version**.
5. Untuk perubahan manajemen sesi, deploy backend dan frontend Versi 1.9/2.0 yang cocok. Login harus menerima `preview_token`; request dashboard menyertakan token tersebut.
6. File `.gs` disalin ke editor GAS secara manual bila proyek Apps Script tidak terhubung langsung ke repositori.

---

## 5. Format Paket `soal.xml`

Contoh struktur minimum:

```xml
<paket nama="Matematika Dasar" versi="1">
  <soal id="1" tipe="pg" skor="2">
    <pertanyaan>Hasil 12 × 15 adalah ...</pertanyaan>
    <pilihan>A. 170</pilihan>
    <pilihan>B. 180</pilihan>
    <pilihan>C. 190</pilihan>
    <pilihan>D. 200</pilihan>
    <jawaban>B</jawaban>
  </soal>
</paket>
```

Aturan penulisan:
- Simpan XML sebagai UTF-8 tanpa BOM; berkas di Google Drive harus dapat dibaca oleh akun GAS.
- Pilihan PG diawali huruf dan titik; kunci PG berisi huruf pilihan.
- Gunakan karakter UTF-8 untuk simbol seperti `×`, `÷`, `√`, `≤`, `≥`, dan `≠`.
- Escape tag notasi HTML di dalam XML, misalnya `&lt;sup&gt;` dan `&lt;sub&gt;`.
- Kunci `pg_kompleks` ditulis sebagai huruf dipisah koma, misalnya `A,C`.
- Kunci `memasangkan` ditulis sebagai daftar pasangan, misalnya `1-A,2-B,3-C`.
- Soal `uraian` dikumpulkan untuk penilaian manual dan mendapat skor otomatis nol.

---

## 6. Keamanan dan Sesi

- Password guru di-hash dengan SHA-256 dan salt unik; login memiliki jeda anti-brute-force sederhana.
- Endpoint admin memvalidasi token admin.
- Kunci jawaban tidak dikirim pada alur soal murid; pengecekan jawaban dilakukan di server.
- HTML keluaran menggunakan escaping; teks soal hanya membuka whitelist `<sup>` dan `<sub>`.
- Token sesi guru disimpan di `localStorage` dan dicocokkan dengan cache GAS serta `session_version` pada sheet.
- Force logout menaikkan versi sesi. Browser guru menghapus sesi lokal dan kembali ke layar login ketika menerima respons sesi dicabut pada permintaan API berikutnya.
- Autosave jawaban murid bersifat lokal pada perangkat murid.
- Service Worker melewatkan request ke GAS dan CDN; jangan cache respons API.
- Bila token admin atau password pernah dibagikan, segera ganti kredensial tersebut dan deploy ulang konfigurasi/backend.

---

## 7. Halaman 404 dan Hosting

`404.html` menggunakan tautan beranda dan halaman publik yang menyesuaikan root aplikasi untuk domain root, GitHub Pages pada path `/siaptka/`, dan instalasi lokal `/siaptka-1/`.

- **Apache/XAMPP**: `.htaccess` proyek sudah mengatur `ErrorDocument 404 /siaptka-1/404.html`. Pastikan `mod_rewrite` aktif dan `.htaccess` diizinkan.
- **Netlify**: Netlify otomatis memakai `404.html` di root publish directory untuk halaman yang tidak ditemukan.
- **GitHub Pages**: GitHub Pages memakai `404.html` di root branch/direktori publish. Pastikan file ikut dipublikasikan.
- Service Worker menggunakan cache `siaptka-v13` dan memasukkan `404.html` ke app shell.

Jika nama folder atau base path deployment berubah dari `/siaptka/` atau `/siaptka-1/`, sesuaikan deteksi root aplikasi di `404.html`.

---

## 8. Rilis dan Pemeliharaan

### Rilis stabil

**SiapTKA Versi 2.0 dinyatakan stabil** setelah fitur manajemen admin Versi 1.9 dan halaman 404 Versi 2.0 tersedia pada source proyek. Grafik tren aktivasi telah dikeluarkan dari cakupan berdasarkan keputusan produk dan tidak menjadi pekerjaan tertunda.

### Checklist publikasi
- [ ] Deploy `Code.gs` sebagai versi Web App baru jika backend berubah.
- [ ] Publikasikan berkas frontend, `404.html`, dan `sw.js`.
- [ ] Pastikan host menggunakan `404.html` dan route beranda pada base path yang benar.
- [ ] Uji beranda, login guru, join murid, panel admin, halaman tidak ditemukan, dan force logout.
- [ ] Pastikan Service Worker aktif dengan cache `siaptka-v13`.
- [ ] Pastikan tidak ada token admin, password, atau data sensitif di commit atau dokumentasi.

### Riwayat versi utama
- **1.5** — Pengelolaan kelas dan profil guru.
- **1.6** — Validasi dan normalisasi input.
- **1.7** — Autosave dan review jawaban.
- **1.8** — Variasi tipe soal, skor parsial, dan notasi matematika.
- **1.8.5** — Penyempurnaan dashboard guru dan preview paket.
- **1.9** — Blokir/nonaktifkan guru dan force logout.
- **2.0** — Halaman 404 kustom dan penandaan rilis stabil.
