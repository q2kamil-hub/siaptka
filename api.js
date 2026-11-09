/**
 * api.js — Lapisan API terpusat untuk SiapTKA
 * ============================================
 * SATU-SATUNYA file yang tahu cara memanggil backend GAS.
 * Semua halaman (guru.html, murid.html, admin.html) WAJIB memakai
 * fungsi di file ini. Jangan panggil fetch/JSONP langsung dari halaman.
 *
 * Jika nanti migrasi ke Supabase/Firebase: cukup ubah isi fungsi
 * _request() di bawah. Signature fungsi publik tetap sama.
 *
 * Pemakaian:
 *   await API.teacherLogin(email, password)
 *   await API.createClass({ teacher_id, nama_kelas, ... })
 */

(function (global) {
  'use strict';

  // ==========================================
  // KONFIGURASI
  // ==========================================
  var GAS_URL = "https://script.google.com/macros/s/AKfycbwYQpw801zHrr34qNaAjTkIRxDLXR_3ieFvH_MH8QrtcqARqcflzlbbtc8twn-1rtD4/exec";

  // Simpan identitas login guru agar tidak hilang saat refresh
  var STORAGE_KEY = 'siaptka_guru_session';

  // ==========================================
  // CORE: JSONP request (satu-satunya titik ke backend)
  // ==========================================
  /**
   * Kirim request ke GAS via JSONP.
   * @param {string} action  - nama aksi backend (mis. 'login', 'createClass')
   * @param {object} params  - parameter tambahan (key-value)
   * @returns {Promise<object>} - resolve dengan objek response dari GAS
   */
  function _request(action, params) {
    return new Promise(function (resolve, reject) {
      var callbackName = 'jsonp_' + Math.round(1e9 * Math.random()) + '_' + Date.now();
      var script = document.createElement('script');
      var timeoutId = null;

      function cleanup() {
        if (timeoutId) clearTimeout(timeoutId);
        if (script && script.parentNode) script.parentNode.removeChild(script);
        try { delete global[callbackName]; } catch (e) { global[callbackName] = undefined; }
      }

      global[callbackName] = function (response) {
        cleanup();
        if (response && response.code === 'SESSION_REVOKED') {
          notifySessionRevoked();
        }
        if (response && response.ok === false) {
          // Bukan error teknis — error bisnis (password salah, dll).
          // Tetap resolve agar halaman bisa tampilkan pesan dengan tenang.
          resolve(response);
        } else {
          resolve(response);
        }
      };

      script.onerror = function () {
        cleanup();
        reject(new Error('NETWORK_ERROR'));
      };

      var qs = 'action=' + encodeURIComponent(action) +
               '&callback=' + encodeURIComponent(callbackName) +
               '&_=' + Date.now(); // anti-cache

      if (params) {
        for (var k in params) {
          if (Object.prototype.hasOwnProperty.call(params, k) && params[k] != null) {
            qs += '&' + encodeURIComponent(k) + '=' + encodeURIComponent(params[k]);
          }
        }
      }

      script.src = GAS_URL + '?' + qs;
      document.body.appendChild(script);

      // Timeout 25 detik (GAS kadang lambat saat cold start)
      timeoutId = setTimeout(function () {
        cleanup();
        reject(new Error('TIMEOUT'));
      }, 25000);
    });
  }

  // ==========================================
  // SESSION (localStorage guru)
  // ==========================================
  function saveSession(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) { /* storage penuh / private mode */ }
  }

  function getSession() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  function clearSession() {
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
  }

  function notifySessionRevoked() {
    clearSession();
    if (global.dispatchEvent && typeof global.Event === 'function') {
      global.dispatchEvent(new global.Event('siaptka:session-revoked'));
    }
  }

  function _teacherRequest(action, params) {
    var session = getSession();
    if (!session || !session.id || !session.preview_token) {
      notifySessionRevoked();
      return Promise.resolve({
        ok: false,
        code: 'SESSION_REVOKED',
        message: 'Sesi guru tidak tersedia. Silakan login kembali.'
      });
    }

    var securedParams = {};
    Object.keys(params || {}).forEach(function (key) {
      securedParams[key] = params[key];
    });
    if (securedParams.teacher_id && String(securedParams.teacher_id) !== String(session.id)) {
      notifySessionRevoked();
      return Promise.resolve({
        ok: false,
        code: 'SESSION_REVOKED',
        message: 'Sesi guru tidak valid. Silakan login kembali.'
      });
    }
    securedParams.teacher_id = session.id;
    securedParams.preview_token = session.preview_token;
    return _request(action, securedParams);
  }

  // ==========================================
  // API PUBLIK
  // ==========================================
  var API = {

    // ---------- GURU ----------

    /**
     * Login guru.
     * @returns {Promise<{ok:boolean, guru?:{id,email,nama,sekolah}, message?:string}>}
     */
    teacherLogin: function (email, password) {
      return _request('teacherLogin', { email: email, password: password })
        .then(function (res) {
          if (res && res.ok && res.guru) {
            saveSession(res.guru);
          }
          return res;
        });
    },

    /**
     * Aktivasi akun guru dengan kode aktivasi (setelah pembelian).
     * @returns {Promise<{ok:boolean, guru?:{id,email,nama}, message?:string}>}
     */
    activateTeacher: function (email, nama, sekolah, kodeAktivasi, password) {
      return _request('activateTeacher', {
        email: email,
        nama: nama,
        sekolah: sekolah,
        kode_aktivasi: kodeAktivasi,
        password: password
      }).then(function (res) {
        if (res && res.ok && res.guru) {
          saveSession(res.guru);
        }
        return res;
      });
    },

    /**
     * Ambil data guru saat ini dari localStorage (sync, tidak ke server).
     */
    currentTeacher: function () {
      return getSession();
    },

    logout: function () {
      clearSession();
    },

    /**
     * Buat kelas baru.
     * @param {object} payload { teacher_id, nama_kelas, paket_id, durasi_menit, pin, acak, tampil_pembahasan }
     */
    createClass: function (payload) {
      return _teacherRequest('createClass', payload);
    },

    /**
     * Daftar kelas milik guru.
     * @param {string} teacherId
     */
    getMyClasses: function (teacherId) {
      return _teacherRequest('getMyClasses', { teacher_id: teacherId });
    },

    /**
     * Detail satu kelas (info + daftar murid + status).
     * @param {string} classId
     */
    getClassDetail: function (classId) {
      return _teacherRequest('getClassDetail', { class_id: classId });
    },

    /**
     * Hasil & analitik satu kelas (untuk tab Laporan).
     * @param {string} classId
     */
    getClassAnalytics: function (classId) {
      return _teacherRequest('getClassAnalytics', { class_id: classId });
    },

    /**
     * Tutup/buka kelas (stop submit).
     * @param {string} classId
     * @param {boolean} tutup  true = tutup
     */
    setClassClosed: function (classId, tutup) {
      return _teacherRequest('setClassClosed', { class_id: classId, tutup: tutup ? '1' : '0' });
    },

    /****
     * Edit kelas (nama, durasi, acak, tampil_pembahasan).
     * Ditolak jika sudah ada murid yang submit jawaban.
     * @param {string} classId
     * @param {object} payload { nama_kelas, durasi_menit, acak (bool), tampil_pembahasan (bool) }
     */
    editClass: function (classId, payload) {
      return _teacherRequest('editClass', {
        class_id: classId,
        nama_kelas: payload.nama_kelas,
        durasi_menit: payload.durasi_menit,
        acak: payload.acak ? '1' : '0',
        tampil_pembahasan: payload.tampil_pembahasan ? '1' : '0'
      });
    },

    /****
     * Hapus kelas (soft delete). Ubah status menjadi 'deleted'.
     * Data murid dan nilai tetap aman di database.
     * @param {string} classId
     */
    deleteClass: function (classId) {
      return _teacherRequest('deleteClass', { class_id: classId });
    },

    /****
     * Edit profil guru (nama, sekolah, password opsional).
     * Jika password diisi, current_password wajib juga diisi dan harus benar.
     * @param {object} payload { teacher_id, nama, sekolah, password (opsional), current_password (wajib jika password diisi) }
     */
    updateTeacherProfile: function (payload) {
      return _teacherRequest('editTeacherProfile', payload);
    },

    // ---------- MURID ----------

    /**
     * Murid join kelas dengan kode + nama.
     * @returns {Promise<{ok:boolean, student?:{id,nama}, class?:{id,nama_kelas,paket_id}, message?:string}>}
     */
    joinClass: function (kodeKelas, nama, absen, pin) {
      return _request('joinClass', {
        kode_kelas: kodeKelas,
        nama: nama,
        absen: absen || '',
        pin: pin || ''
      });
    },

    /**
     * Ambil soal untuk kelas (dari paket XML terkait).
     * @param {string} classId
     * @param {string} studentId
     */
    getQuestions: function (classId, studentId) {
      return _request('getQuestions', {
        class_id: classId,
        student_id: studentId
      });
    },

     /**
     * Submit jawaban murid.
     * @param {object} payload { class_id, student_id, jawaban (JSON string), durasi_detik }
     * @returns {Promise<{ok:boolean, skor?:number, pembahasan?:Array, message?:string}>}
     *   pembahasan hanya ada jika kelas.tampil_pembahasan = 1.
     *   Urutannya sama persis dengan urutan soal yang dikerjakan murid:
     *   [{
     *     soal_id, tipe ('pg'|'isian'), pertanyaan,
     *     pilihan: string[],   // semua opsi (mis. "A. 170") — kosong untuk tipe isian
     *     jawaban_user, kunci, benar, dijawab, skor
     *   }]
     */
    submitResult: function (payload) {
      return _request('submitResult', payload);
    },

    // ---------- PAKET (guru) ----------

    /**
     * Daftar paket soal aktif untuk dropdown di guru.html.
     * @param {string} teacherId — harus cocok dengan sesi guru yang tersimpan
     */
    getPackagesForTeacher: function (teacherId) {
      return _teacherRequest('getPackagesForTeacher', { teacher_id: teacherId || '' });
    },

    // ---------- PAKET PREVIEW (guru) ----------

    /**
     * Preview isi paket soal beserta kunci jawaban (HANYA GURU).
     * Tidak ada endpoint murid yang mengembalikan kunci jawaban.
     * @param {string} paketId
     * @param {string} teacherId
     */
    getPackagePreview: function (paketId, teacherId) {
      var session = getSession();
      if (!session || !session.id || session.id !== teacherId || !session.preview_token) {
        notifySessionRevoked();
        return Promise.resolve({
          ok: false,
          code: 'SESSION_REVOKED',
          message: 'Sesi guru tidak tersedia atau kedaluwarsa. Silakan keluar lalu login kembali.'
        });
      }

      return _teacherRequest('getPackagePreview', {
        paket_id: paketId,
        teacher_id: teacherId,
        preview_token: session.preview_token
      });
    },

    // ---------- ADMIN (super admin) ----------

    adminGenerateActivation: function (token, jumlah) {
      return _request('adminGenerateActivation', { token: token, jumlah: jumlah || 1 });
    },

    adminListTeachers: function (token) {
      return _request('adminListTeachers', { token: token });
    },

    adminSetTeacherBlocked: function (token, teacherId, blocked) {
      return _request('adminSetTeacherBlocked', {
        token: token,
        teacher_id: teacherId,
        is_blocked: blocked ? '1' : '0'
      });
    },

    adminForceLogoutTeacher: function (token, teacherId) {
      return _request('adminForceLogoutTeacher', {
        token: token,
        teacher_id: teacherId
      });
    },

    adminListPackages: function (token) {
      return _request('adminListPackages', { token: token });
    },

    /**
     * Tambah paket baru.
     * @param {object} payload { token, nama_paket, file_xml, harga }
     */
    adminCreatePackage: function (payload) {
      return _request('adminCreatePackage', payload);
    },

    /**
     * Aktifkan / nonaktifkan paket.
     * @param {string} token
     * @param {string} id
     * @param {boolean} aktif
     */
    adminTogglePackage: function (token, id, aktif) {
      return _request('adminTogglePackage', {
        token: token,
        id: id,
        aktif: aktif ? '1' : '0'
      });
    },

    /**
     * Hapus paket (ditolak jika masih dipakai kelas).
     */
    adminDeletePackage: function (token, id) {
      return _request('adminDeletePackage', { token: token, id: id });
    },

    adminResetTeacherActive: function (token, teacherId, tambahHari) {
      return _request('adminResetTeacherActive', {
        token: token, teacher_id: teacherId, tambah_hari: tambahHari || 365
      });
    },

    adminListUnusedActivations: function (token) {
      return _request('adminListUnusedActivations', { token: token });
    },

    /**
     * Statistik aktivasi & guru.
     */
    getActivationStats: function (token) {
      return _request('getActivationStats', { token: token });
    },

    // ---------- UTIL ----------

    /**
     * Cek apakah error adalah error teknis (jaringan/timeout).
     * Dipakai halaman untuk membedakan pesan UI.
     */
    isNetworkError: function (err) {
      return err && (err.message === 'NETWORK_ERROR' || err.message === 'TIMEOUT');
    },

    /**
     * Pesan ramah untuk error teknis.
     */
    friendlyError: function (err) {
      if (!err) return 'Terjadi kesalahan.';
      if (err.message === 'TIMEOUT') return 'Server terlalu lama merespons. Periksa koneksi Anda.';
      if (err.message === 'NETWORK_ERROR') return 'Gagal menghubungi server. Periksa koneksi internet.';
      return err.message || 'Terjadi kesalahan.';
    }
  };

  // Ekspos ke global
  global.API = API;

})(window);
