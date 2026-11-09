(function () {
  'use strict';

  if (!('serviceWorker' in navigator) || window.__siaptkaUpdateInitialized) return;
  window.__siaptkaUpdateInitialized = true;

  var registration = null;
  var dismissed = false;
  var updateStarted = false;
  var hadController = Boolean(navigator.serviceWorker.controller);

  var style = document.createElement('style');
  style.textContent =
    '#siaptka-update-notice{position:fixed;right:16px;bottom:calc(16px + env(safe-area-inset-bottom,0px));z-index:10000;width:min(440px,calc(100% - 32px));padding:16px;background:#fff;border:1px solid #bfdbfe;border-radius:14px;box-shadow:0 12px 36px rgba(15,23,42,.2);color:#1f2937;font:14px/1.5 Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}'+
    '#siaptka-update-notice[hidden]{display:none}'+
    '#siaptka-update-notice .siaptka-update-heading{margin:0 0 4px;color:#1e3a8a;font-size:15px;font-weight:800}'+
    '#siaptka-update-notice .siaptka-update-copy{margin:0;color:#475569}'+
    '#siaptka-update-notice .siaptka-update-actions{display:flex;align-items:center;justify-content:flex-end;gap:8px;margin-top:12px}'+
    '#siaptka-update-notice button{min-height:40px;padding:8px 13px;border:1px solid #cbd5e1;border-radius:8px;background:#fff;color:#334155;font:inherit;font-weight:700;cursor:pointer}'+
    '#siaptka-update-notice button:focus-visible{outline:3px solid #93c5fd;outline-offset:2px}'+
    '#siaptka-update-notice #siaptka-update-now{border-color:#1e3a8a;background:#1e3a8a;color:#fff}'+
    '#siaptka-update-notice #siaptka-update-now:hover{background:#2563eb}'+
    '#siaptka-update-notice button:disabled{opacity:.65;cursor:wait}'+
    '@media(max-width:420px){#siaptka-update-notice{right:12px;bottom:calc(12px + env(safe-area-inset-bottom,0px));width:calc(100% - 24px)}}';
  document.head.appendChild(style);

  var notice = document.createElement('section');
  notice.id = 'siaptka-update-notice';
  notice.setAttribute('role', 'status');
  notice.setAttribute('aria-live', 'polite');
  notice.hidden = true;
  notice.innerHTML =
    '<p class="siaptka-update-heading">Pembaruan aplikasi tersedia</p>' +
    '<p class="siaptka-update-copy">Perbarui SiapTKA agar mendapatkan fitur dan perbaikan terbaru.</p>' +
    '<div class="siaptka-update-actions">' +
      '<button type="button" id="siaptka-update-later">Nanti</button>' +
      '<button type="button" id="siaptka-update-now">Update sekarang</button>' +
    '</div>';
  document.body.appendChild(notice);

  var updateButton = document.getElementById('siaptka-update-now');
  var laterButton = document.getElementById('siaptka-update-later');

  function showUpdateAvailable() {
    if (!dismissed) notice.hidden = false;
  }

  function monitorInstallingWorker(worker) {
    if (!worker) return;
    worker.addEventListener('statechange', function () {
      if (worker.state === 'installed' && navigator.serviceWorker.controller) {
        showUpdateAvailable();
      }
    });
  }

  function checkForUpdate() {
    if (!registration || !navigator.onLine) return;
    registration.update().catch(function (error) {
      console.warn('[PWA] Pemeriksaan pembaruan gagal:', error);
    });
  }

  laterButton.addEventListener('click', function () {
    dismissed = true;
    notice.hidden = true;
  });

  updateButton.addEventListener('click', function () {
    if (!registration || !registration.waiting) {
      notice.hidden = true;
      checkForUpdate();
      return;
    }
    if (!window.confirm('SiapTKA akan dimuat ulang untuk menerapkan pembaruan. Pastikan pekerjaan Anda sudah tersimpan.')) return;

    updateStarted = true;
    updateButton.disabled = true;
    updateButton.textContent = 'Memperbarui...';
    registration.waiting.postMessage('SKIP_WAITING');
  });

  navigator.serviceWorker.addEventListener('controllerchange', function () {
    if (!hadController && !updateStarted) return;
    hadController = true;
    window.location.reload();
  });

  window.addEventListener('online', checkForUpdate);
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') checkForUpdate();
  });

  window.addEventListener('siaptka:service-worker-error', function (event) {
    console.error('[PWA] Service worker tidak dapat didaftarkan:', event.detail);
  });

  navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' })
    .then(function (registered) {
      registration = registered;
      if (registration.waiting && navigator.serviceWorker.controller) {
        showUpdateAvailable();
      }
      if (registration.installing) monitorInstallingWorker(registration.installing);

      registration.addEventListener('updatefound', function () {
        monitorInstallingWorker(registration.installing);
      });
      checkForUpdate();
    })
    .catch(function (error) {
      window.dispatchEvent(new CustomEvent('siaptka:service-worker-error', { detail: error }));
    });
})();
