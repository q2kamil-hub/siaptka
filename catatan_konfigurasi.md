Berikut adalah pembaruan lengkap untuk **`Catatan_Konfigurasi.md`** yang mencerminkan status akhir **Versi 1.4** dan peta jalan (roadmap) untuk versi-versi selanjutnya.

Silakan salin kode di bawah ini dan timpa isi file `Catatan_Konfigurasi.md` Anda.

```markdown
# 📘 Dokumentasi Proyek: SiapTKA — Latihan TKA

> **Status**: Versi 1.6 ✅ (Validasi & Normalisasi Input + Hapus Kelas dengan Syarat Tutup)
> **Terakhir diperbarui**: Setelah implementasi Versi 1.6.
> **Tahap Selanjutnya**: Versi 2.0 (Penyatukan Prioritas 3, 4, 5 — Admin, UX Murid, Utilitas)

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
| `/guru` (guru.html) | Login/aktivasi guru, dashboard, buat kelas, edit/hapus kelas, laporan | ✅ |
| `/murid` (murid.html) | Join via kode kelas + PIN, kerjakan soal, submit, pembahasan | ✅ |
| `/admin` (admin.html) | Panel admin (token), kelola aktivasi & paket soal, reset aktif | ✅ |
| `api.js` | **Lapisan API terpusat** — satu-satunya file yang tahu GAS | ✅ |
| `laporan.js` | Grafik (Chart.js) + ekspor Excel/PDF untuk guru | ✅ |
| `head.js` | Injeksi terpusat favicon & meta tag (anti-duplikasi) | ✅ |
| `sw.js` | Service Worker (cache v6) | ✅ |
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
- **Sinkronisasi Tipe Data**: Menggunakan `String(cls.tampil_pembahasan) === '1'` untuk mengatasi konversi angka/teks dari Google Sheets.

### Konfigurasi GAS
- **Deploy**: Web App → Execute as **Me**, Access **Anyone**.
- Selalu pilih **"New version"** saat mengubah `Code.gs`.
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
| `Teachers` | id, email, password_hash, salt, nama, sekolah, aktif_sampai, created_at |
| `Activations` | kode, dipakai_oleh, tanggal_pakai, status (`unused`/`used`) |
| `Classes` | id, teacher_id, nama_kelas, paket_id, kode_kelas, pin, durasi_menit, buka, tutup, acak, tampil_pembahasan, status, created_at |
| `Students` | id, class_id, nama, absen, waktu_masuk |
| `Results` | id, student_id, class_id, skor, jawaban_json, waktu_selesai, durasi_detik |
| `Packages` | id, nama_paket, file_xml, harga, aktif (`1`/`0`) |

**Catatan Penting**: Google Sheets sering mengubah input `1` menjadi angka (number) dan `0` menjadi boolean/angka. Backend selalu menggunakan `String(value)` sebelum membandingkan dengan `'1'`.

---

## 5. Format `soal.xml` (Google Drive)

Contoh: `/paket/matematika.xml` → **upload ke Google Drive** dengan nama `matematika.xml`, sharing **"Anyone with the link – Viewer"**.

```xml
<paket nama="Matematika Dasar" versi="1">
  <soal id="1" tipe="pg" skor="10">
    <pertanyaan>Hasil 12 × 15 adalah ...</pertanyaan>
    <pilihan>A. 170</pilihan>
    <pilihan>B. 180</pilihan>
    <pilihan>C. 190</pilihan>
    <pilihan>D. 200</pilihan>
    <jawaban>B</jawaban>
  </soal>
  <soal id="2" tipe="isian" skor="10">
    <pertanyaan>Hasil 7 × 8 adalah ...</pertanyaan>
    <jawaban>56</jawaban>
  </soal>
</paket>
```
**Aturan**: Pilihan wajib diawali huruf + titik (`"A. ..."`), jawaban PG = huruf, isian = teks, simpan UTF-8 tanpa BOM.

---

## 6. Keamanan yang Sudah Diterapkan

| Lapisan | Implementasi |
|---|---|
| **PWA Gate** | Form login/aktivasi hanya muncul jika `isStandalone === true` atau `pwa_installed === 'true'`. |
| **Password Hashing** | SHA-256 + salt unik per guru. |
| **Anti Brute-force** | `Utilities.sleep(800)` di `handleTeacherLogin`. |
| **Kunci Jawaban** | Tidak dikirim ke `murid.html`; pencocokan di server. |
| **Anti Submit Ganda** | Dicek di server berdasarkan `student_id` + `class_id`. |
| **Admin Token** | Semua endpoint admin divalidasi dengan token rahasia. |
| **Escape HTML** | `esc()` di semua output dinamis (anti-XSS). |
| **SW Cache** | Request ke GAS & CDN tidak di-cache. |

---

## 7. Roadmap Pengembangan (Versi Selanjutnya)

Karena Versi 1.5 sudah selesai, fokus beralih ke standar aplikasi SaaS (Software as a Service).

### ✅ Prioritas 1: Manajemen Kelas & Guru (Versi 1.5 — SELESAI)
- [x] **Edit Kelas**: Guru dapat mengubah nama kelas, durasi, acak, dan tampil pembahasan selama belum ada murid yang submit.
- [x] **Hapus Kelas (Soft Delete)**: Mengubah status kelas menjadi `deleted` agar hilang dari dashboard, tapi data nilai tetap aman di database.
- [x] **Buka/Tutup Kelas Cepat**: Tombol di dashboard guru tanpa masuk ke detail (sudah ada dari v1.4).
- [ ] **Edit Profil Guru**: Form untuk mengganti Nama, Sekolah, dan Password (diposkan ke v1.7).

### ✅ Prioritas 2: Validasi & Normalisasi Input (Versi 1.6 — SELESAI)
- [x] **Normalisasi Form**: `.trim()` dan standarisasi huruf (kapital nama, lowercase email) di semua input frontend & backend.
  - Frontend: email di-lowercase di `doLogin`/`doActivate` (guru.html), kode kelas di-uppercase di `doActivate`, nama di-capitalize per kata di `doActivate` (guru.html), `.trim()` pada semua input form.
  - Backend: email di-trim + lowercase di `handleTeacherLogin`/`handleActivateTeacher` (Code.gs), nama di-trim di `handleActivateTeacher`, kode di-trim + uppercase di `handleJoinClass`, nama di-trim di `handleJoinClass`.
- [x] **Validasi PIN/Kode Kelas**: Pastikan input murid hanya huruf/angka, tanpa spasi.
  - Frontend: regex `/^[A-Z0-9]+$/` di `doJoin()` (murid.html) sebelum panggil API.
  - Backend: regex `/^[A-Z0-9]+$/` di `handleJoinClass()` (Code.gs) untuk kode dan PIN.
- [x] **Validasi Form Kelas**: Durasi min 1 menit, max 180 menit.
  - Frontend: input durasi memiliki `min="1"` di modal buat/edit kelas (guru.html).
  - Backend: cek `durasi < 1 || durasi > 180` di `handleCreateClass` dan `handleEditClass` (Code.gs).
- [x] **Edit Profil Guru**: Form untuk mengganti Nama, Sekolah, dan Password.
  - Frontend: modal baru `modal-edit-profile` di `guru.html`, tombol "Profil" di topbar, fungsi `openEditProfileModal()` dan `doEditProfile()`.
  - Backend: handler baru `handleEditTeacherProfile` (Code.gs) dengan validasi password saat ini saat mengganti password, API `updateTeacherProfile` di `api.js`.
- [x] **Hapus Kelas dengan Syarat Tutup**: Kelas hanya dapat dihapus (soft delete) jika statusnya `closed` (tutup). Jika belum ditutup, penghapusan ditolak dengan pesan *"Kelas harus ditutup terlebih dahulu sebelum dapat dihapus."*

Versi 1.7 — Auto-save & Review Jawaban (Fokus Murid)
Ini adalah fitur UX yang paling mendesak agar murid tidak panik jika koneksi terputus atau tidak sengaja me-refresh.
□ Auto-save: Simpan jawaban sementara di localStorage murid.
□ Review Jawaban: Tampilkan mana opsi yang dipilih murid (benar/salah) di halaman pembahasan.

Versi 1.8 — Mode Gelap (Dark Mode)
Fitur estetika yang berdampak besar pada kenyamanan pengguna.
□ Toggle tema (Terang/Gelap) di halaman Guru dan Murid.
□ Simpan preferensi tema di localStorage.
□ Sesuaikan variabel warna CSS (:root).

Versi 1.9 — Manajemen Lanjutan Admin
Fitur kontrol untuk Anda sebagai pemilik aplikasi.
□ Blokir/Nonaktifkan Guru: Tambah kolom is_blocked di database, dan tombol aksi di admin.html.
□ Force Logout: Mekanisme untuk memaksa guru logout dari perangkat lain.
□ (Opsional) Grafik tren aktivasi kode.

Versi 2.0 — Utilitas & Optimasi (Rilis Final)
Penyempurnaan teknis sebelum rilis besar.
□ Halaman 404.html kustom.
□ (Opsional) Script backup mingguan di GAS.
□ Pembaruan Catatan_Konfigurasi.md secara menyeluruh untuk menandai rilis stabil.

---

## 8. File yang Perlu Dilampirkan Saat Pindah ke Chat Baru

Untuk melanjutkan ke Versi 2.0, lampirkan file berikut ke chat baru:
1. **`Code.gs`** (Backend lengkap versi 1.6 + fitur Admin baru v2.0).
2. **`api.js`** (Lapisan API lengkap versi 1.6 + fungsi Admin baru v2.0).
3. **`guru.html`** (Frontend guru dengan Mode Gelap v2.0).
4. **`murid.html`** (Frontend murid dengan Auto-save, Review Jawaban, Mode Gelap v2.0).
5. **`admin.html`** (Panel admin dengan Blokir Guru, Grafik Pendapatan, Force Logout v2.0).
6. **`404.html`** (Halaman error custom v2.0 — file baru).
7. **File ini (`Catatan_Konfigurasi.md`)**.

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
