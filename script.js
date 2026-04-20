/* =============================================
   QR FORGE — script.js
   Features: Text | URL | UPI · Logo Overlay
             Color/Size · Download · Camera Scan
============================================= */
'use strict';

/* ──────────────────────────────────────────
   1. STATE
────────────────────────────────────────── */
const state = {
  currentType:   'text',    // text | url | image | upi
  currentTab:    'generate',
  scanMode:      'camera',
  imgSubTab:     'url',     // url | upload
  imageDataUrl:  null,      // base64 of uploaded image (image type)
  imageFileName: null,
  qrInstance:    null,
  scannerActive: false,
  codeReader:    null,
  isDark:        true,
  logoDataUrl:   null,      // base64 of the overlay logo
  logoFile:      null,
};

/* ──────────────────────────────────────────
   2. DOM REFS
────────────────────────────────────────── */
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];

const dom = {
  themeToggle: $('#themeToggle'),
  themeIcon:   $('.theme-icon'),
  html:        document.documentElement,

  tabBtns:       $$('.tab-bar > .tab-btn'),
  generatePanel: $('#generatePanel'),
  scanPanel:     $('#scanPanel'),

  typeBtns:     $$('.type-btn'),
  fieldText:    $('#field-text'),
  fieldUpi:     $('#field-upi'),
  fieldImage:   $('#field-image'),
  mainInput:    $('#mainInput'),
  charCount:    $('#charCount'),

  // Image type
  imgTabs:            $$('.img-tab'),
  imgUrlPanel:        $('#imgUrlPanel'),
  imgUploadPanel:     $('#imgUploadPanel'),
  imageUrl:           $('#imageUrl'),
  imgLivePreviewWrap: $('#imgLivePreviewWrap'),
  imgLivePreview:     $('#imgLivePreview'),
  imgLiveUrl:         $('#imgLiveUrl'),
  imgError:           $('#imgError'),
  imgUploadDrop:      $('#imgUploadDrop'),
  imgUploadFile:      $('#imgUploadFile'),
  imgUploadedPreview: $('#imgUploadedPreview'),
  imgUploadedImg:     $('#imgUploadedImg'),
  imgUploadName:      $('#imgUploadName'),
  imgUploadSize:      $('#imgUploadSize'),
  imgUploadRemove:    $('#imgUploadRemove'),

  // UPI fields
  upiId:          $('#upiId'),
  upiName:        $('#upiName'),
  upiAmount:      $('#upiAmount'),
  upiCurrency:    $('#upiCurrency'),
  upiNote:        $('#upiNote'),
  upiPreviewCode: $('#upiPreviewCode'),

  // Logo overlay
  logoUploadArea:   $('#logoUploadArea'),
  logoUploadInner:  $('#logoUploadInner'),
  logoFile:         $('#logoFile'),
  logoPreviewWrap:  $('#logoPreviewWrap'),
  logoPreviewImg:   $('#logoPreviewImg'),
  logoFilename:     $('#logoFilename'),
  logoRemoveBtn:    $('#logoRemoveBtn'),
  logoSizeRow:      $('#logoSizeRow'),
  logoSize:         $('#logoSize'),
  logoSizeVal:      $('#logoSizeVal'),

  // Customization
  qrColor:        $('#qrColor'),
  bgColor:        $('#bgColor'),
  qrColorPreview: $('#qrColorPreview'),
  bgColorPreview: $('#bgColorPreview'),
  qrSize:         $('#qrSize'),
  sizeVal:        $('#sizeVal'),
  errorLevel:     $('#errorLevel'),

  // Generate
  generateBtn: $('#generateBtn'),
  placeholder: $('#placeholder'),
  qrResult:    $('#qrResult'),
  qrcode:      $('#qrcode'),
  qrTypeBadge: $('#qrTypeBadge'),
  qrSizeInfo:  $('#qrSizeInfo'),
  downloadPNG: $('#downloadPNG'),
  copyBtn:     $('#copyBtn'),

  // Scanner
  cameraModeBtn: $('#cameraMode'),
  uploadModeBtn: $('#uploadMode'),
  cameraSection: $('#cameraSection'),
  uploadSection: $('#uploadSection'),
  scanVideo:     $('#scanVideo'),
  startScanBtn:  $('#startScanBtn'),
  stopScanBtn:   $('#stopScanBtn'),
  uploadDrop:    $('#uploadDrop'),
  uploadFile:    $('#uploadFile'),
  scanResult:    $('#scanResult'),
  scanText:      $('#scanText'),
  upiScanBreakdown: $('#upiScanBreakdown'),
  scanOpenBtn:   $('#scanOpenBtn'),
  scanCopyBtn:   $('#scanCopyBtn'),

  toast: $('#toast'),
};

/* ──────────────────────────────────────────
   3. TOAST
────────────────────────────────────────── */
let toastTimer;
function showToast(msg, duration = 2600) {
  clearTimeout(toastTimer);
  dom.toast.textContent = msg;
  dom.toast.classList.add('show');
  toastTimer = setTimeout(() => dom.toast.classList.remove('show'), duration);
}

/* ──────────────────────────────────────────
   4. THEME TOGGLE
────────────────────────────────────────── */
function initTheme() {
  const saved = localStorage.getItem('qrforge-theme') || 'dark';
  applyTheme(saved);
}
function applyTheme(theme) {
  state.isDark = theme === 'dark';
  dom.html.setAttribute('data-theme', theme);
  dom.themeIcon.textContent = state.isDark ? '🌙' : '☀️';
  localStorage.setItem('qrforge-theme', theme);
}
dom.themeToggle.addEventListener('click', () => applyTheme(state.isDark ? 'light' : 'dark'));

/* ──────────────────────────────────────────
   5. TAB SWITCHING (Generate / Scan)
────────────────────────────────────────── */
dom.tabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const tab = btn.dataset.tab;
    if (tab === state.currentTab) return;
    state.currentTab = tab;
    dom.tabBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    if (tab === 'generate') {
      dom.generatePanel.classList.remove('hidden');
      dom.scanPanel.classList.add('hidden');
      stopCamera();
    } else {
      dom.generatePanel.classList.add('hidden');
      dom.scanPanel.classList.remove('hidden');
    }
  });
});

/* ──────────────────────────────────────────
   6. INPUT TYPE SWITCHING
────────────────────────────────────────── */
dom.typeBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const type = btn.dataset.type;
    if (type === state.currentType) return;
    state.currentType = type;
    dom.typeBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    // Hide all fields
    dom.fieldText.classList.add('hidden');
    dom.fieldUpi.classList.add('hidden');
    dom.fieldImage.classList.add('hidden');

    if (type === 'text' || type === 'url') {
      dom.fieldText.classList.remove('hidden');
      dom.mainInput.placeholder = type === 'url'
        ? 'https://your-website.com'
        : 'Enter any text, message, or content…';
    } else if (type === 'image') {
      dom.fieldImage.classList.remove('hidden');
    } else if (type === 'upi') {
      dom.fieldUpi.classList.remove('hidden');
      updateUpiPreview();
    }
  });
});

/* Char counter */
dom.mainInput.addEventListener('input', () => {
  dom.charCount.textContent = dom.mainInput.value.length;
});

/* ──────────────────────────────────────────
   7a. IMAGE TYPE — sub-tabs, URL preview, upload
────────────────────────────────────────── */
// Sub-tab switching (URL ↔ Upload)
dom.imgTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    const which = tab.dataset.imgtab;
    if (which === state.imgSubTab) return;
    state.imgSubTab = which;
    dom.imgTabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    if (which === 'url') {
      dom.imgUrlPanel.classList.remove('hidden');
      dom.imgUploadPanel.classList.add('hidden');
    } else {
      dom.imgUploadPanel.classList.remove('hidden');
      dom.imgUrlPanel.classList.add('hidden');
    }
  });
});

// Live URL preview
let urlPreviewTimer;
dom.imageUrl && dom.imageUrl.addEventListener('input', () => {
  clearTimeout(urlPreviewTimer);
  const val = dom.imageUrl.value.trim();
  dom.imgLivePreviewWrap.classList.add('hidden');
  dom.imgError.classList.add('hidden');
  if (!val) return;
  urlPreviewTimer = setTimeout(() => previewImageUrl(val), 600);
});

function previewImageUrl(url) {
  const img = dom.imgLivePreview;
  img.onload = () => {
    dom.imgLivePreviewWrap.classList.remove('hidden');
    dom.imgError.classList.add('hidden');
    dom.imgLiveUrl.textContent = url;
  };
  img.onerror = () => {
    dom.imgLivePreviewWrap.classList.add('hidden');
    dom.imgError.classList.remove('hidden');
  };
  img.src = url;
}

// Upload from device
dom.imgUploadDrop && dom.imgUploadDrop.addEventListener('click', () => dom.imgUploadFile.click());
dom.imgUploadDrop && dom.imgUploadDrop.addEventListener('dragover', (e) => {
  e.preventDefault(); dom.imgUploadDrop.style.borderColor = 'var(--accent)';
});
dom.imgUploadDrop && dom.imgUploadDrop.addEventListener('dragleave', () => { dom.imgUploadDrop.style.borderColor = ''; });
dom.imgUploadDrop && dom.imgUploadDrop.addEventListener('drop', (e) => {
  e.preventDefault(); dom.imgUploadDrop.style.borderColor = '';
  const file = e.dataTransfer.files[0];
  if (file && file.type.startsWith('image/')) loadImageUpload(file);
  else showToast('⚠️ Please drop an image file.');
});
dom.imgUploadFile && dom.imgUploadFile.addEventListener('change', () => {
  const file = dom.imgUploadFile.files[0];
  if (file) loadImageUpload(file);
});

function loadImageUpload(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    state.imageDataUrl  = e.target.result;
    state.imageFileName = file.name;

    dom.imgUploadedImg.src = e.target.result;
    dom.imgUploadName.textContent = file.name.length > 30 ? file.name.substring(0,27)+'…' : file.name;
    const kb = (file.size / 1024).toFixed(1);
    dom.imgUploadSize.textContent = `${kb} KB`;
    if (file.size > 150 * 1024) dom.imgUploadSize.textContent += ' ⚠️ Large — may exceed QR capacity';

    dom.imgUploadedPreview.classList.remove('hidden');
    dom.imgUploadDrop.style.display = 'none';
    showToast('🖼️ Image loaded — click Generate!');
  };
  reader.readAsDataURL(file);
}

dom.imgUploadRemove && dom.imgUploadRemove.addEventListener('click', () => {
  state.imageDataUrl  = null;
  state.imageFileName = null;
  dom.imgUploadFile.value = '';
  dom.imgUploadedPreview.classList.add('hidden');
  dom.imgUploadDrop.style.display = '';
  showToast('✕ Image removed');
});

/* ──────────────────────────────────────────
   7b. UPI LIVE PREVIEW
────────────────────────────────────────── */
[dom.upiId, dom.upiName, dom.upiAmount, dom.upiCurrency, dom.upiNote].forEach(el => {
  if (el) el.addEventListener('input', updateUpiPreview);
});

function updateUpiPreview() {
  const id  = (dom.upiId.value || '').trim();
  const name = (dom.upiName.value || '').trim();
  const amt  = (dom.upiAmount.value || '').trim();
  const cur  = dom.upiCurrency.value || 'INR';
  const note = (dom.upiNote.value || '').trim();

  if (!id) {
    dom.upiPreviewCode.textContent = 'upi://pay?…';
    return;
  }
  let str = `upi://pay?pa=${encodeURIComponent(id)}`;
  if (name) str += `&pn=${encodeURIComponent(name)}`;
  if (amt)  str += `&am=${encodeURIComponent(amt)}`;
  str += `&cu=${cur}`;
  if (note) str += `&tn=${encodeURIComponent(note)}`;
  dom.upiPreviewCode.textContent = str;
}

/* ──────────────────────────────────────────
   8. LOGO / PHOTO UPLOAD
────────────────────────────────────────── */
// Click on the upload area triggers file picker
dom.logoUploadInner.addEventListener('click', () => dom.logoFile.click());

// Drag & drop support
dom.logoUploadArea.addEventListener('dragover', (e) => {
  e.preventDefault();
  dom.logoUploadArea.style.borderColor = 'var(--accent)';
});
dom.logoUploadArea.addEventListener('dragleave', () => {
  dom.logoUploadArea.style.borderColor = '';
});
dom.logoUploadArea.addEventListener('drop', (e) => {
  e.preventDefault();
  dom.logoUploadArea.style.borderColor = '';
  const file = e.dataTransfer.files[0];
  if (file && file.type.startsWith('image/')) loadLogoFile(file);
  else showToast('⚠️ Please drop an image file.');
});

dom.logoFile.addEventListener('change', () => {
  const file = dom.logoFile.files[0];
  if (file) loadLogoFile(file);
});

function loadLogoFile(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    state.logoDataUrl = e.target.result;
    state.logoFile = file;

    // Show preview
    dom.logoPreviewImg.src = e.target.result;
    dom.logoFilename.textContent = file.name.length > 28
      ? file.name.substring(0, 25) + '…'
      : file.name;
    dom.logoUploadInner.classList.add('hidden');
    dom.logoPreviewWrap.classList.remove('hidden');
    dom.logoUploadArea.classList.add('has-logo');
    dom.logoSizeRow.classList.remove('hidden');
    showToast('🖼️ Logo ready — generate your QR!');
  };
  reader.readAsDataURL(file);
}

dom.logoRemoveBtn.addEventListener('click', () => {
  state.logoDataUrl = null;
  state.logoFile = null;
  dom.logoFile.value = '';
  dom.logoPreviewImg.src = '';
  dom.logoPreviewWrap.classList.add('hidden');
  dom.logoUploadInner.classList.remove('hidden');
  dom.logoUploadArea.classList.remove('has-logo');
  dom.logoSizeRow.classList.add('hidden');
  showToast('✕ Logo removed');
});

dom.logoSize.addEventListener('input', () => {
  dom.logoSizeVal.textContent = dom.logoSize.value;
});

/* ──────────────────────────────────────────
   9. COLOR & SIZE CONTROLS
────────────────────────────────────────── */
dom.qrColor.addEventListener('input', () => { dom.qrColorPreview.style.background = dom.qrColor.value; });
dom.bgColor.addEventListener('input', () => { dom.bgColorPreview.style.background = dom.bgColor.value; });
dom.qrSize.addEventListener('input',  () => { dom.sizeVal.textContent = dom.qrSize.value; });

/* ──────────────────────────────────────────
   10. BUILD QR DATA STRING
────────────────────────────────────────── */
function buildQRData() {
  const type = state.currentType;

  if (type === 'text' || type === 'url') {
    const val = dom.mainInput.value.trim();
    if (!val) { showToast('⚠️ Please enter some content first!'); return null; }
    if (type === 'url' && !/^https?:\/\//i.test(val)) {
      showToast('⚠️ URL should start with https://');
      return null;
    }
    return val;
  }

  if (type === 'image') {
    if (state.imgSubTab === 'url') {
      const url = (dom.imageUrl.value || '').trim();
      if (!url) { showToast('⚠️ Please enter an image URL'); return null; }
      if (!/^https?:\/\//i.test(url)) { showToast('⚠️ URL must start with https://'); return null; }
      // QR encodes the direct image URL — any QR scanner will open/display it
      return url;
    } else {
      // Uploaded image — embed full base64 data URI in QR
      if (!state.imageDataUrl) { showToast('⚠️ Please upload an image first'); return null; }
      // Warn if too large
      const estimatedBytes = state.imageDataUrl.length * 0.75;
      if (estimatedBytes > 2953) { // QR v40-H max bytes
        showToast('⚠️ Image too large for QR! Try a smaller file or use "Paste URL" instead.', 4000);
        // Still attempt — let QRCode.js throw if truly too big
      }
      return state.imageDataUrl;
    }
  }

  if (type === 'upi') {
    const id   = dom.upiId.value.trim();
    const name = dom.upiName.value.trim();
    if (!id)   { showToast('⚠️ Please enter the UPI ID (e.g. name@upi)'); return null; }
    if (!name) { showToast('⚠️ Please enter the payee name'); return null; }
    if (!/^[\w.\-]+@[\w]+$/.test(id)) {
      showToast('⚠️ UPI ID format looks wrong (use name@bank)');
      return null;
    }
    const amt  = dom.upiAmount.value.trim();
    const cur  = dom.upiCurrency.value || 'INR';
    const note = dom.upiNote.value.trim();
    let str = `upi://pay?pa=${encodeURIComponent(id)}&pn=${encodeURIComponent(name)}`;
    if (amt && parseFloat(amt) > 0) str += `&am=${parseFloat(amt).toFixed(2)}`;
    str += `&cu=${cur}`;
    if (note) str += `&tn=${encodeURIComponent(note)}`;
    return str;
  }

  return null;
}

/* ──────────────────────────────────────────
   11. GENERATE QR CODE
────────────────────────────────────────── */
dom.generateBtn.addEventListener('click', generateQR);
dom.mainInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && e.ctrlKey) generateQR();
});

function generateQR() {
  const data = buildQRData();
  if (!data) return;

  const size     = parseInt(dom.qrSize.value);
  const fgColor  = dom.qrColor.value;
  const bgColor  = dom.bgColor.value;
  const errLevel = { L: QRCode.CorrectLevel.L, M: QRCode.CorrectLevel.M, Q: QRCode.CorrectLevel.Q, H: QRCode.CorrectLevel.H }[dom.errorLevel.value] || QRCode.CorrectLevel.M;

  // Clear previous
  dom.qrcode.innerHTML = '';
  if (state.qrInstance) {
    try { state.qrInstance.clear(); } catch (_) {}
    state.qrInstance = null;
  }

  // Show result area (hide placeholder)
  dom.placeholder.classList.add('hidden');
  dom.qrResult.classList.remove('hidden');

  // Animate in
  dom.qrcode.style.animation = 'none';
  void dom.qrcode.offsetWidth; // reflow
  dom.qrcode.style.animation = '';

  // Update badges
  const badgeLabels = { text: 'TEXT', url: 'URL', image: '🖼 IMAGE', upi: '₹ UPI' };
  dom.qrTypeBadge.textContent = badgeLabels[state.currentType] || 'QR';
  const isUpi = state.currentType === 'upi';
  const isImg = state.currentType === 'image';
  dom.qrTypeBadge.className = 'qr-type-badge'
    + (isUpi ? ' upi-badge-style' : '')
    + (isImg ? ' img-badge-style' : '');
  dom.qrSizeInfo.textContent = `${size} × ${size} px`;

  // Generate QR
  try {
    state.qrInstance = new QRCode(dom.qrcode, {
      text:           data,
      width:          size,
      height:         size,
      colorDark:      fgColor,
      colorLight:     bgColor,
      correctLevel:   errLevel,
    });
  } catch (err) {
    showToast('❌ Data too large for this QR size — try H error correction or larger size.');
    dom.qrcode.innerHTML = '';
    dom.placeholder.classList.remove('hidden');
    dom.qrResult.classList.add('hidden');
    return;
  }

  // Overlay logo after QR renders (QRCode.js is sync for canvas, but give a tick)
  setTimeout(() => {
    if (state.logoDataUrl) overlayLogo(size);
    showToast('✅ QR Code generated!');
  }, 100);
}

/* ──────────────────────────────────────────
   12. LOGO OVERLAY ON CANVAS
────────────────────────────────────────── */
function overlayLogo(qrSize) {
  // QRCode.js renders a <canvas> inside dom.qrcode
  const canvas = dom.qrcode.querySelector('canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const logoSizePct = parseInt(dom.logoSize.value) / 100;
  const logoW = Math.round(qrSize * logoSizePct);
  const logoH = logoW;
  const x = Math.round((qrSize - logoW) / 2);
  const y = Math.round((qrSize - logoH) / 2);

  const img = new Image();
  img.onload = () => {
    // White rounded padding behind logo so QR modules don't bleed through
    const pad = Math.round(logoW * 0.12);
    const rx  = Math.round((logoW + pad * 2) * 0.18); // corner radius

    ctx.save();

    // Draw rounded white background
    roundRect(ctx, x - pad, y - pad, logoW + pad * 2, logoH + pad * 2, rx);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    // Clip to same rounded rect, draw logo
    roundRect(ctx, x, y, logoW, logoH, Math.round(rx * 0.6));
    ctx.clip();
    ctx.drawImage(img, x, y, logoW, logoH);

    ctx.restore();
  };
  img.src = state.logoDataUrl;
}

/** Helper: draw rounded rectangle path */
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/* ──────────────────────────────────────────
   13. DOWNLOAD QR CODE
────────────────────────────────────────── */
dom.downloadPNG.addEventListener('click', () => {
  const canvas = dom.qrcode.querySelector('canvas');
  const img    = dom.qrcode.querySelector('img');

  if (canvas) {
    const link = document.createElement('a');
    const type  = state.currentType;
    const label = type === 'upi' ? 'upi-payment' : type === 'image' ? 'image-link' : type;
    link.download = `qrforge-${label}-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    showToast('📥 QR Code downloaded!');
    return;
  }

  if (img) {
    const tempCanvas = document.createElement('canvas');
    const size = parseInt(dom.qrSize.value);
    tempCanvas.width  = size;
    tempCanvas.height = size;
    tempCanvas.getContext('2d').drawImage(img, 0, 0);
    const link = document.createElement('a');
    link.download = `qrforge-${Date.now()}.png`;
    link.href = tempCanvas.toDataURL('image/png');
    link.click();
    showToast('📥 QR Code downloaded!');
    return;
  }

  showToast('⚠️ Generate a QR code first!');
});

/* ──────────────────────────────────────────
   14. COPY QR CODE IMAGE
────────────────────────────────────────── */
dom.copyBtn.addEventListener('click', async () => {
  const canvas = dom.qrcode.querySelector('canvas');
  if (!canvas) { showToast('⚠️ Generate a QR code first!'); return; }

  try {
    canvas.toBlob(async (blob) => {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      showToast('📋 Copied to clipboard!');
    });
  } catch (_) {
    const dataUrl = canvas.toDataURL();
    await navigator.clipboard.writeText(dataUrl);
    showToast('📋 Image data URL copied!');
  }
});

/* ──────────────────────────────────────────
   15. QR SCANNER — CAMERA
────────────────────────────────────────── */
dom.cameraModeBtn.addEventListener('click', () => switchScanMode('camera'));
dom.uploadModeBtn.addEventListener('click', () => switchScanMode('upload'));

function switchScanMode(mode) {
  state.scanMode = mode;
  if (mode === 'camera') {
    dom.cameraModeBtn.classList.add('active');
    dom.uploadModeBtn.classList.remove('active');
    dom.cameraSection.classList.remove('hidden');
    dom.uploadSection.classList.add('hidden');
  } else {
    dom.uploadModeBtn.classList.add('active');
    dom.cameraModeBtn.classList.remove('active');
    dom.uploadSection.classList.remove('hidden');
    dom.cameraSection.classList.add('hidden');
    stopCamera();
  }
  dom.scanResult.classList.add('hidden');
}

dom.startScanBtn.addEventListener('click', startCamera);
dom.stopScanBtn.addEventListener('click', () => { stopCamera(); showToast('📷 Camera stopped.'); });

async function startCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    dom.scanVideo.srcObject = stream;
    state.scannerActive = true;
    dom.startScanBtn.classList.add('hidden');
    dom.stopScanBtn.classList.remove('hidden');

    if ('BarcodeDetector' in window) {
      runBarcodeDetector();
    } else if (window.ZXing) {
      runZXingScanner();
    } else {
      showToast('❌ QR scanning not supported in this browser.');
      stopCamera();
    }
  } catch (err) {
    if (err.name === 'NotAllowedError') showToast('🚫 Camera permission denied.');
    else showToast('❌ Could not access camera: ' + err.message);
  }
}

async function runBarcodeDetector() {
  const detector = new BarcodeDetector({ formats: ['qr_code'] });
  async function detect() {
    if (!state.scannerActive) return;
    try {
      const codes = await detector.detect(dom.scanVideo);
      if (codes.length > 0) { handleScanResult(codes[0].rawValue); return; }
    } catch (_) {}
    requestAnimationFrame(detect);
  }
  requestAnimationFrame(detect);
}

function runZXingScanner() {
  try {
    const codeReader = new ZXing.BrowserQRCodeReader();
    state.codeReader = codeReader;
    codeReader.decodeFromVideoDevice(null, dom.scanVideo, (result) => {
      if (result && state.scannerActive) handleScanResult(result.getText());
    });
  } catch (e) {
    showToast('QR scanner unavailable in this browser.');
  }
}

function stopCamera() {
  state.scannerActive = false;
  if (state.codeReader) {
    try { state.codeReader.reset(); } catch (_) {}
    state.codeReader = null;
  }
  const stream = dom.scanVideo.srcObject;
  if (stream) { stream.getTracks().forEach(t => t.stop()); dom.scanVideo.srcObject = null; }
  dom.stopScanBtn.classList.add('hidden');
  dom.startScanBtn.classList.remove('hidden');
}

/* ──────────────────────────────────────────
   16. HANDLE SCAN RESULT
────────────────────────────────────────── */
function handleScanResult(text) {
  stopCamera();
  dom.scanText.textContent = text;
  dom.scanResult.classList.remove('hidden');
  showToast('✅ QR Code scanned!');

  // URL button
  const isUrl = /^https?:\/\//i.test(text);
  dom.scanOpenBtn.classList.toggle('hidden', !isUrl);

  // Detect UPI and show breakdown
  if (/^upi:\/\/pay\?/i.test(text)) {
    renderUpiScanBreakdown(text);
  } else {
    dom.upiScanBreakdown.classList.add('hidden');
    dom.upiScanBreakdown.innerHTML = '';
  }
}

function renderUpiScanBreakdown(upiString) {
  // Parse UPI params
  const url    = new URL(upiString.replace('upi://', 'https://upi/'));
  const params = new URLSearchParams(url.search);
  const pa  = params.get('pa')  || '—';
  const pn  = params.get('pn')  || '—';
  const am  = params.get('am')  || 'Any amount';
  const cu  = params.get('cu')  || 'INR';
  const tn  = params.get('tn')  || '';

  const fields = [
    { label: 'UPI ID',     value: pa },
    { label: 'Payee Name', value: pn },
    { label: 'Amount',     value: am !== 'Any amount' ? `${cu} ${am}` : 'Any amount' },
  ];
  if (tn) fields.push({ label: 'Note', value: tn });

  dom.upiScanBreakdown.innerHTML = fields.map(f =>
    `<div class="upi-field">
       <span class="upi-field-label">${f.label}</span>
       <span class="upi-field-value">${escapeHtml(f.value)}</span>
     </div>`
  ).join('');
  dom.upiScanBreakdown.classList.remove('hidden');
}

function escapeHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

dom.scanOpenBtn.addEventListener('click', () => {
  const url = dom.scanText.textContent;
  if (url) window.open(url, '_blank', 'noopener');
});

dom.scanCopyBtn.addEventListener('click', async () => {
  const text = dom.scanText.textContent;
  if (!text) return;
  await navigator.clipboard.writeText(text);
  showToast('📋 Copied to clipboard!');
});

/* ──────────────────────────────────────────
   17. QR SCANNER — IMAGE UPLOAD
────────────────────────────────────────── */
dom.uploadDrop.addEventListener('click', () => dom.uploadFile.click());
dom.uploadDrop.addEventListener('dragover', (e) => { e.preventDefault(); dom.uploadDrop.style.borderColor = 'var(--accent)'; });
dom.uploadDrop.addEventListener('dragleave', () => { dom.uploadDrop.style.borderColor = ''; });
dom.uploadDrop.addEventListener('drop', (e) => {
  e.preventDefault(); dom.uploadDrop.style.borderColor = '';
  const file = e.dataTransfer.files[0];
  if (file) scanImageFile(file);
});
dom.uploadFile.addEventListener('change', () => { const file = dom.uploadFile.files[0]; if (file) scanImageFile(file); });

async function scanImageFile(file) {
  if (!file.type.startsWith('image/')) { showToast('⚠️ Please upload an image file.'); return; }
  showToast('🔍 Scanning image…');

  // BarcodeDetector
  if ('BarcodeDetector' in window) {
    try {
      const bitmap  = await createImageBitmap(file);
      const detector = new BarcodeDetector({ formats: ['qr_code'] });
      const codes   = await detector.detect(bitmap);
      if (codes.length > 0) { handleScanResult(codes[0].rawValue); return; }
    } catch (_) {}
  }

  // ZXing fallback
  if (window.ZXing) {
    try {
      const reader = new ZXing.BrowserQRCodeReader();
      const imgUrl = URL.createObjectURL(file);
      const result = await reader.decodeFromImageUrl(imgUrl);
      URL.revokeObjectURL(imgUrl);
      if (result) { handleScanResult(result.getText()); return; }
    } catch (_) {}
  }

  showToast('❌ No QR code found in the image.');
}

/* ──────────────────────────────────────────
   18. KEYBOARD SHORTCUT
────────────────────────────────────────── */
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    if (state.currentTab === 'generate') generateQR();
  }
});

/* ──────────────────────────────────────────
   19. INIT
────────────────────────────────────────── */
(function init() {
  initTheme();
  dom.mainInput.placeholder = 'Type or paste anything here…';
})();