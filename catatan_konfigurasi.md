Berikut adalah pembaruan lengkap untuk **`Catatan_Konfigurasi.md`** yang mencerminkan status akhir **Versi 1.4** dan peta jalan (roadmap) untuk versi-versi selanjutnya.

Silakan salin kode di bawah ini dan timpa isi file `Catatan_Konfigurasi.md` Anda.

```markdown
# 📘 Dokumentasi Proyek: SiapTKA — Latihan TKA

> **Status**: Versi 1.7 ✅ (Auto-save Jawaban Murid + Review Semua Opsi di Pembahasan)
> **Terakhir diperbarui**: Setelah implementasi Versi 1.7.
> **Tahap Selanjutnya**: Versi 1.8 (Mode Gelap — Toggle Terang/Gelap untuk Guru & Murid)

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
| `/guru` (guru.html) | Login/aktivasi guru, dashboard, buat kelas, edit/hapus kelas, laporan | ✅ |
| `/murid` (murid.html) | Join via kode kelas + PIN, kerjakan soal (auto-save), submit, pembahasan + review opsi | ✅ |
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
| **Auto-save Murid** | Draft jawaban hanya tersimpan di perangkat murid (`localStorage`), dihapus otomatis setelah submit berhasil, dan divalidasi ulang terhadap `class_id` + `student_id` saat dipulihkan. |
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

### ✅ Prioritas 3: Auto-save & Review Jawaban (Versi 1.7 — SELESAI)
Fitur UX agar murid tidak kehilangan jawaban saat refresh atau koneksi terputus.

- [x] **Auto-save Jawaban**: draft disimpan di `localStorage` dengan kunci `siaptka_autosave_[class_id]_[student_id]`.
  - Disimpan langsung saat murid memilih opsi PG; **debounce 500 ms** saat mengetik isian; juga disimpan saat `pagehide` / `visibilitychange`.
  - Isi draft: `answers`, `remaining_sec`, `current_index`, `updated_at` (skema `v: 1`).
  - Dipulihkan di `startQuiz()` lewat `restoreDraft()`: jawaban kembali ke `state.answers`, timer **melanjutkan sisa waktu** (tidak reset), murid kembali ke soal terakhir, dan muncul toast "N jawaban dipulihkan".
  - Dihapus (`clearDraft()`) setelah submit berhasil atau saat server menyatakan `already_done`. Jika submit **gagal** (jaringan/kelas ditutup), draft **tetap** disimpan.
  - `pruneOldDrafts()` membersihkan draft berumur lebih dari 7 hari saat halaman dimuat.
- [x] **Ingat Form Join**: kode/nama/absen/PIN terakhir disimpan (`siaptka_murid_lastjoin`) sehingga setelah refresh murid cukup menekan "Mulai Latihan". Ini penting karena `student_id` diturunkan dari **nama** — nama berbeda berarti murid baru dan draft lama tidak ditemukan.
- [x] **Review Jawaban (semua opsi)**: `handleSubmitResult` (Code.gs) kini mengirim `pilihan`, `tipe`, dan `dijawab` per soal, dengan urutan **sama** seperti saat murid mengerjakan (termasuk pengacakan `acak=1`, memakai `shuffleWithSeed`). `renderPembahasan()` (murid.html) menampilkan daftar opsi A–D: **hijau** = kunci jawaban, **merah** = pilihan murid yang salah, plus tag "Kunci" / "Jawaban Anda" dan catatan bila soal tidak dijawab. Soal tipe isian tetap memakai tampilan baris "Jawaban Anda" vs "Kunci Jawaban".
- [x] **Service Worker**: `CACHE_VERSION` dinaikkan ke `siaptka-v7` agar murid menerima `murid.html` versi baru.

**Batasan yang diketahui**: draft bersifat per-browser/per-perangkat (hilang jika data browser dibersihkan atau mode incognito), tidak dikirim ke server, dan hanya dapat dipulihkan bila murid join dengan **nama yang sama**.

### Versi 1.8 — Pengembangan Variasi Tipe Soal

Saat ini, soal yang ditampilkan kepada murid dan format XML yang tersedia mendukung tipe **pilihan ganda** dan **isian singkat**. Pada versi ini, pengembangan difokuskan pada penambahan variasi tipe soal agar paket latihan dapat menyajikan lebih banyak bentuk pertanyaan.

□ Menambahkan dukungan tipe soal **uraian**.  
□ Menambahkan dukungan tipe soal **benar/salah**.  
□ Menambahkan dukungan tipe soal **pilihan ganda kompleks** (murid dapat memilih lebih dari satu jawaban).  
□ **Penilaian pilihan ganda kompleks secara parsial**: murid memperoleh poin untuk setiap jawaban benar yang dipilih, tanpa harus memilih seluruh jawaban benar untuk mendapat nilai. Jawaban yang keliru tidak memperoleh poin.
□ Menambahkan dukungan tipe soal **memasangkan jawaban**.  
□ Memperbarui format XML agar dapat menyimpan pertanyaan, pilihan atau pasangan jawaban, kunci, dan skor sesuai tipe soal.  
□ Memperbarui halaman murid agar setiap tipe soal ditampilkan dengan bentuk input dan interaksi yang sesuai.  
□ Menyesuaikan proses penyimpanan jawaban, penilaian, dan pembahasan berdasarkan tipe soal.  
□ Memastikan tipe soal yang sudah tersedia—pilihan ganda dan isian singkat—tetap berfungsi seperti sebelumnya.

**Catatan pengembangan**: Mekanisme penilaian dan pembahasan untuk setiap tipe soal, khususnya uraian dan pilihan ganda kompleks, perlu disesuaikan dengan karakteristik jawabannya.

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

Untuk melanjutkan ke Versi 1.8 (Mode Gelap), lampirkan file berikut ke chat baru:
1. **`Code.gs`** (Backend lengkap versi 1.7 — pembahasan mengirim `pilihan`/`tipe`/`dijawab`).
2. **`api.js`** (Lapisan API lengkap versi 1.7).
3. **`guru.html`** (Frontend guru — target utama penambahan dark mode).
4. **`murid.html`** (Frontend murid dengan Auto-save + Review Jawaban v1.7).
5. **`admin.html`** (Panel admin versi 1.6).
6. **`sw.js`** (Service Worker — `CACHE_VERSION` saat ini `siaptka-v7`).
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
