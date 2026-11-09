Berikut adalah pembaruan lengkap untuk **`Catatan_Konfigurasi.md`** yang mencerminkan status akhir **Versi 1.8** (dengan pembaruan rendering `murid.html` untuk mendukung `<sup>`/`<sub>`), serta peta jalan (roadmap) untuk versi-versi selanjutnya.

Silakan salin kode di bawah ini dan timpa isi file `Catatan_Konfigurasi.md` Anda.

```markdown
# 📘 Dokumentasi Proyek: SiapTKA — Latihan TKA

> **Status rilis terakhir**: Versi 1.8.5 ✅
> **Pengembangan saat ini**: Versi 1.9 — blokir/nonaktifkan guru dan force logout telah diimplementasikan; grafik tren aktivasi masih direncanakan.
> **Terakhir diperbarui**: Implementasi manajemen sesi admin Versi 1.9 (`siaptka-v12`).
> **Tahap Selanjutnya**: Versi 1.9 (Manajemen Lanjutan Admin)

---

## 1. Arsitektur & Stack

| Komponen | Teknologi |
|---|---|
| **Frontend** | HTML, CSS, Vanilla JS (hosting: GitHub Pages / Netlify) |
| **Backend** | Google Apps Script (GAS) — API JSONP |
| **Database** | Google Sheets (6 tab: Teachers, Activations, Classes, Students, Results, Packages) |
| **Penyimpanan Soal** | Google Drive (`*.xml`, dibaca `DriveApp` di `Code.gs`) |
| **Tipe Aplikasi** | PWA (standalone) dengan **Installation Gate** ketat |
| **Metode API** | JSONP (GET + callback) via lapisan `api.js` |
| **Session Guru** | `localStorage` (`siaptka_guru_session`) |
| **Session Admin** | `localStorage` (`siaptka_admin_token`) |
| **Draft Jawaban Murid** | `localStorage` (`siaptka_autosave_[class_id]_[student_id]`, auto-hapus setelah submit, TTL 7 hari) |

### Alur Peran
```
👑 Super Admin (token)  →  👩‍🏫 Guru (email+password)  →  🧑‍🎓 Murid (kode kelas + PIN)
     admin.html               guru.html                  murid.html
```

---

## 2. Daftar File Frontend (GitHub / Netlify)

| File | Fungsi | Status |
|---|---|---|
| `/` (index.html) | Gerbang peran + **PWA gate ketat** | ✅ |
| `/landing` (landing.html) | Halaman jualan publik (boleh dibuka di browser biasa) | ✅ |
| `/guru` (guru.html) | Login/aktivasi guru, dashboard, buat kelas, edit/hapus kelas, laporan. **Kartu kelas punya toggle buka/tutup sendiri, detail kelas menampilkan ringkasan konfigurasi, dan tersedia Preview Paket Soal (khusus guru).** | ✅ |
| `/murid` (murid.html) | Join via kode kelas + PIN, kerjakan soal (auto-save), submit, pembahasan + review opsi. **Mendukung rendering `<sup>`/`<sub>` pada teks soal.** | ✅ |
| `/admin` (admin.html) | Panel admin (token), kelola aktivasi & paket soal, reset aktif | ✅ |
| `api.js` | **Lapisan API terpusat** — satu-satunya file yang tahu GAS | ✅ |
| `laporan.js` | Grafik (Chart.js) + ekspor Excel/PDF untuk guru | ✅ |
| `head.js` | Injeksi terpusat favicon & meta tag (anti-duplikasi) | ✅ |
| `sw.js` | Service Worker (cache versi terbaru) | ✅ |
| `manifest.json` | Konfigurasi PWA (branding indigo/amber) | ✅ |
| `icon-192.png`, `icon-512.png`, `icon-maskable-512.png` | Ikon PWA | ✅ |
| `favicon-32.png`, `favicon-16.png` | Favicon | ✅ |

---

## 3. Daftar File Backend (Google Apps Script)

### `Code.gs` — Fitur Kunci
- **JSONP Routing**: `doGet(e)` dengan penanganan error (try-catch).
- **Database Init**: `initSheet()` (idempoten, buat 6 tab + header otomatis).
- **Guru**: Login (SHA-256 + salt), Aktivasi (kode 1 tahun), Pembuatan Kelas (validasi paket), **Edit Kelas** (nama, durasi, acak, tampil pembahasan — diblokir jika sudah ada submit), **Hapus Kelas** (soft delete → status `deleted`, data murid & nilai aman).
- **Murid**: Join (validasi PIN & kelas, ditolak jika kelas `deleted`), Ambil Soal (acak deterministik), Submit (pencocokan & pembahasan).
- **Admin**: Generate Aktivasi, Daftar Guru, Kelola Paket (Create/Toggle/Delete), Statistik, Reset Aktif, Unduh Kode Unused.
- **Blokir Guru (Versi 1.9)**: Admin dapat memblokir/membuka blokir akun. Perubahan status membatalkan sesi aktif; login dan endpoint guru ditolak saat akun diblokir. Kelas serta akses murid yang sudah berjalan tetap tersedia.
- **Force Logout (Versi 1.9)**: Admin dapat mencabut seluruh sesi guru. Setiap endpoint guru memvalidasi token sesi dan versi sesi yang disimpan di sheet; perangkat dipaksa kembali ke login saat permintaan berikutnya.
- **Migrasi kolom Guru**: `initSheet()` menambahkan kolom `is_blocked` dan `session_version` ke tab `Teachers` yang sudah ada; baris lama dianggap tidak diblokir dan menggunakan versi sesi `1`.
- **Sinkronisasi Tipe Data**: Menggunakan `String(cls.tampil_pembahasan) === '1'` untuk mengatasi konversi angka/teks dari Google Sheets.
- **Scoring**: `hitungSkorSoal` mendukung penilaian parsial untuk `pg_kompleks` dan `memasangkan`.

### Konfigurasi GAS
- **Deploy**: Web App → Execute as **Me**, Access **Anyone**.
- Selalu pilih **"New version"** saat mengubah `Code.gs`.
- Deploy backend dan frontend Versi 1.9 berdekatan: API guru kini mengirim token sesi dan backend menolaknya jika sesi dicabut. Service Worker `siaptka-v12` memuat ulang aset frontend.
- **Pembacaan XML**: Pastikan `DriveApp` membaca file dengan encoding **UTF-8** (`getDataAsString('UTF-8')`) agar simbol matematika (÷, ×, √) tidak rusak menjadi karakter `�`.
- Variabel kunci:
  ```javascript
  var SPREADSHEET_ID = '1G9qOfRcP0akLDJMPG5e-upT8uH0jcTiNRQrG8fA550I';
  var ADMIN_TOKEN    = 'TKA_Super_Rahasia_2026!';
  var GURU_MASA_AKTIF_HARI = 365;
  ```

---

## 4. Struktur Database (Google Spreadsheet)

| Tab | Kolom |
|---|---|
| `Teachers` | id, email, password_hash, salt, nama, sekolah, aktif_sampai, created_at, is_blocked (`1`/`0`), session_version |
| `Activations` | kode, dipakai_oleh, tanggal_pakai, status (`unused`/`used`) |
| `Classes` | id, teacher_id, nama_kelas, paket_id, kode_kelas, pin, durasi_menit, buka, tutup, acak, tampil_pembahasan, status, created_at |
| `Students` | id, class_id, nama, absen, waktu_masuk |
| `Results` | id, student_id, class_id, skor, jawaban_json, waktu_selesai, durasi_detik |
| `Packages` | id, nama_paket, file_xml, harga, aktif (`1`/`0`) |

**Catatan Penting**: Google Sheets sering mengubah input `1` menjadi angka (number) dan `0` menjadi boolean/angka. Backend selalu menggunakan `String(value)` sebelum membandingkan dengan `'1'`.

---

## 5. Format `soal.xml` (Google Drive)

Contoh: `/paket/matematika.xml` → **upload ke Google Drive** dengan nama `matematika.xml`, sharing **"Anyone with the link – Viewer"**. Simpan file sebagai **UTF-8 (without BOM)**.

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
  <soal id="2" tipe="pg" skor="2">
    <pertanyaan>Nilai dari 2&lt;sup&gt;3&lt;/sup&gt; adalah ...</pertanyaan>
    <pilihan>A. 6</pilihan>
    <pilihan>B. 8</pilihan>
    <pilihan>C. 9</pilihan>
    <pilihan>D. 12</pilihan>
    <jawaban>B</jawaban>
  </soal>
</paket>
```

**Aturan Penulisan XML**:
1. Pilihan wajib diawali huruf + titik (`"A. ..."`), jawaban PG = huruf, isian = teks.
2. **Simbol Khusus**: Gunakan karakter UTF-8 murni (×, ÷, √, ≤, ≥, ≠). **Dilarang** menggunakan huruf `v` untuk akar.
3. **Pangkat/Indeks**: Karena ini file XML, tag HTML **wajib** di-escape. Gunakan `&lt;sup&gt;` untuk pangkat dan `&lt;sub&gt;` untuk indeks.
4. Simpan file sebagai UTF-8 tanpa BOM agar tidak muncul karakter `�` di halaman siswa.

---

## 6. Keamanan yang Sudah Diterapkan

| Lapisan | Implementasi |
|---|---|
| **PWA Gate** | Pilihan peran hanya muncul dalam mode standalone. Browser biasa selalu menampilkan petunjuk instalasi (termasuk Safari/iOS); status instalasi tidak ditebak dari `localStorage`. |
| **Password Hashing** | SHA-256 + salt unik per guru. |
| **Anti Brute-force** | `Utilities.sleep(800)` di `handleTeacherLogin`. |
| **Kunci Jawaban** | Tidak dikirim ke `murid.html`; pencocokan di server. |
| **Auto-save Murid** | Draft jawaban hanya tersimpan di perangkat murid (`localStorage`), dihapus otomatis setelah submit berhasil. |
| **Anti Submit Ganda** | Dicek di server berdasarkan `student_id` + `class_id`. |
| **Admin Token** | Semua endpoint admin divalidasi dengan token rahasia. |
| **Escape HTML** | Fungsi `esc()` untuk atribut, dan `rich()` untuk teks soal (mengizinkan whitelist `<sup>` dan `<sub>` guna mencegah XSS). |
| **SW Cache** | Request ke GAS & CDN tidak di-cache. |

---

## 7. Roadmap Pengembangan (Versi Selanjutnya)

### ✅ Prioritas 1: Manajemen Kelas & Guru (Versi 1.5 — SELESAI)
- [x] **Edit Kelas**: Guru dapat mengubah nama kelas, durasi, acak, dan tampil pembahasan selama belum ada murid yang submit.
- [x] **Hapus Kelas (Soft Delete)**: Mengubah status kelas menjadi `deleted`.
- [x] **Edit Profil Guru**: Form untuk mengganti Nama, Sekolah, dan Password.

### ✅ Prioritas 2: Validasi & Normalisasi Input (Versi 1.6 — SELESAI)
- [x] **Normalisasi Form**: `.trim()` dan standarisasi huruf di semua input frontend & backend.
- [x] **Validasi PIN/Kode Kelas**: Pastikan input murid hanya huruf/angka, tanpa spasi.
- [x] **Validasi Form Kelas**: Durasi min 1 menit, max 180 menit.
- [x] **Hapus Kelas dengan Syarat Tutup**: Kelas hanya dapat dihapus jika statusnya `closed`.

### ✅ Prioritas 3: Auto-save & Review Jawaban (Versi 1.7 — SELESAI)
- [x] **Auto-save Jawaban**: draft disimpan di `localStorage` dengan kunci `siaptka_autosave_[class_id]_[student_id]`.
- [x] **Ingat Form Join**: kode/nama/absen/PIN terakhir disimpan sehingga setelah refresh murid cukup menekan "Mulai Latihan".
- [x] **Review Jawaban (semua opsi)**: `handleSubmitResult` mengirim `pilihan`, `tipe`, dan `dijawab` per soal.
- [x] **Service Worker**: `CACHE_VERSION` dinaikkan agar murid menerima `murid.html` versi baru.

### ✅ Prioritas 4: Variasi Tipe Soal & Rendering (Versi 1.8 — SELESAI)
- [x] Menambahkan dukungan tipe soal **uraian**, **benar/salah**, **pilihan ganda kompleks**, dan **memasangkan**.
- [x] **Penilaian parsial** untuk pilihan ganda kompleks dan memasangkan.
- [x] Memperbarui halaman murid agar setiap tipe soal ditampilkan dengan bentuk input yang sesuai.
- [x] **Dukungan Notasi Matematika**: Memperbarui `murid.html` dengan fungsi `rich()` yang mengizinkan tag `<sup>` dan `<sub>` (di-escape dari XML) untuk merender pangkat dan indeks bawah dengan rapi.

#### Aturan Skor per Tipe Soal (di Code.gs, sisi server)

| Tipe | Format kunci (`<jawaban>`) | Penilaian |
|---|---|---|
| `pg` | Huruf tunggal (mis. `B`) | Skor penuh jika huruf cocok, selain itu 0. |
| `isian` | Teks bebas | Skor penuh jika teks cocok (case-insensitive), selain itu 0. |
| `uraian` | Kosong (tidak digunakan) | **Skor 0** — dikumpulkan sebagai teks, penilain manual di luar aplikasi. |
| `benar_salah` | `benar` atau `salah` | Skor penuh jika jawaban murid sama persis (case-insensitive), selain itu 0. |
| `pg_kompleks` | Daftar huruf dipisah koma (mis. `A,C`) | Skor dibagi rata untuk setiap kunci benar. Setiap opsi benar yang dipilih = 1 bagian. Opsi salah tidak menambah/mengurangi. Total per soal tidak melebihi skor maks. |
| `memasangkan` | Daftar pasangan `1-A,2-B,3-C` | Skor dibagi rata untuk setiap pasangan kiri yang cocok. Pasangan yang tidak cocok/belum dipilih = 0. Total per soal tidak melebihi skor maks. |

### Versi 1.8.5 — Penyempurnaan Dashboard Guru
- [x] **Preview Paket Soal**: Guru dapat melihat isi paket soal beserta kunci jawabannya dari form buat kelas dan detail kelas. Preview memakai sesi guru bertoken dan tidak menggunakan endpoint soal murid yang sengaja tidak mengirim kunci.
- [x] **Toggle Buka/Tutup di Kartu Kelas**: Kontrol tersedia langsung pada kartu tanpa membuka detail, disertai konfirmasi, indikator status, dan pemulihan tombol jika request gagal.
- [x] **Ringkasan Konfigurasi Kelas**: Detail kelas menampilkan paket soal, durasi, PIN, status acak urutan soal, dan status tampilkan pembahasan ke murid.
- [x] **Perapian Tata Letak Guru**: Tata letak kartu, detail, dan kontrol preview responsif; diperiksa pada lebar layar 375 px tanpa horizontal overflow.

### Perbaikan PWA — Gerbang Akses Mobile
- [x] Halaman indeks selalu menampilkan pesan saat dibuka dari browser biasa, termasuk jika browser tidak mendukung prompt instalasi.
- [x] Pilihan peran hanya dibuka berdasarkan mode standalone; penanda `localStorage` tidak lagi dapat membuka akses setelah aplikasi dihapus.
- [x] Petunjuk instalasi dibedakan untuk iOS/Safari, Android, dan browser desktop.
- [x] Kegagalan pendaftaran Service Worker ditampilkan dengan pesan yang jelas; cache kini `siaptka-v12` untuk memuat perubahan manajemen sesi.

### Versi 1.9 — Manajemen Lanjutan Admin
Fitur kontrol untuk Anda sebagai pemilik aplikasi.
- [x] Blokir/Nonaktifkan Guru: Tambah kolom `is_blocked`, tombol blokir/buka blokir pada `admin.html`, dan penolakan akses endpoint guru saat akun diblokir. Perubahan status mencabut sesi guru; kelas yang sudah ada dan akses murid tidak dinonaktifkan.
- [x] Force Logout: Admin menaikkan versi sesi guru; semua token lama ditolak oleh endpoint guru dan browser kembali ke layar login ketika melakukan permintaan berikutnya.
- [ ] (Opsional) Grafik tren aktivasi kode.

### Versi 2.0 — Utilitas & Optimasi (Rilis Final)
Penyempurnaan teknis sebelum rilis besar.
- [ ] Halaman 404.html kustom.
- [ ] (Opsional) Script backup mingguan di GAS.
- [ ] Pembaruan `Catatan_Konfigurasi.md` secara menyeluruh untuk menandai rilis stabil.

---

## 8. File yang Perlu Dilampirkan Saat Pindah ke Chat Baru

Untuk melanjutkan ke Versi 1.9, lampirkan file berikut ke chat baru:
1. **`Code.gs`** (Backend versi 1.9 — blokir guru, validasi sesi, dan force logout).
2. **`api.js`** (Lapisan API versi 1.9 dengan token sesi guru).
3. **`guru.html`** (Frontend guru).
4. **`murid.html`** (Frontend murid dengan dukungan tipe soal baru + Auto-save + Review Jawaban + Render `<sup>`/`<sub>`).
5. **`admin.html`** (Panel admin versi 1.6).
6. **`sw.js`** (Service Worker — `CACHE_VERSION` saat ini `siaptka-v12`).
7. **`soal.xml`** (Contoh tipe soal baru: uraian, benar_salah, pg_kompleks, memasangkan, beserta notasi `<sup>`).
8. **File ini (`Catatan_Konfigurasi.md`)**.
9. **`Konfigurasi_Authoring_Soal.md`** (Panduan prompt AI untuk membuat soal TKA).

*(File lain tidak perlu dilampirkan kecuali ada error spesifik di file tersebut).*

---

### ⚠️ Catatan Penting: Copy-Paste Manual Code.gs ke Google Apps Script

Setelah menyelesaikan perubahan kode di VS Code, salin isi file `Code.gs` dan tempel secara manual ke editor Google Apps Script, lalu pilih **"New version"** saat deploy. Google Apps Script tidak mendukung upload file `.gs` secara langsung — harus dilakukan copy-paste manual.

---

### ⚠️ Catatan Penting: Konfigurasi Server untuk URL Rewriting

Menghapus ekstensi `.html` dari tautan hanya berfungsi jika server dikonfigurasi untuk melayani file `.html` saat URL tanpa ekstensi diakses. Berikut contoh konfigurasi:

**Netlify** (`_redirects` di root publik):
```
/guru    /guru.html    200
/murid   /murid.html   200
/admin   /admin.html   200
/landing /landing.html 200
/        /index.html   200
```

**Apache (`.htaccess`)**:
```
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^([a-zA-Z0-9_-]+)$ $1.html [L]
```

**GitHub Pages**: Tidak mendukung rewrite native. Gunakan folder per halaman (mis. `guru/index.html`) atau hosting lain yang mendukung rewrite.
```