/**
 * AntryGravity Tool Page
 * Background Remover + Editor logic
 */
import { ThemeManager } from '../core/theme.js';
import { UploadZone } from '../components/upload-zone.js';
import { AIProvider } from '../services/ai-provider.js';
import { CreditService } from '../services/credit-service.js';
import { ProjectService } from '../services/project-service.js';
import { Notifications } from '../components/notifications.js';
import { BeforeAfterSlider } from '../components/before-after.js';
import AppConfig from '../../config/app.config.js';

let currentFile = null;
let originalDataUrl = null;
let processedBlob = null;
let historyStack  = [];
let historyIndex  = -1;
let zoom = 100;
let currentBackgroundColor = '#ffffff';
let processingCancelled = false;

document.addEventListener('DOMContentLoaded', () => {
  ThemeManager.init();
  Notifications.init();
  initThemeToggle();
  initNavbarScroll();
  initUploadZone();
  initToolbarButtons();
  initEditorControls();
  initExportPanel();
  initKeyboardShortcuts();
});

// ─── Theme ────────────────────────────────────────────────
function initThemeToggle() {
  document.querySelectorAll('[data-theme-toggle]').forEach(btn => {
    btn.addEventListener('click', () => ThemeManager.toggle());
  });
}

function initNavbarScroll() {
  const navbar = document.getElementById('navbar');
  if (!navbar) return;
  window.addEventListener('scroll', () => navbar.classList.toggle('scrolled', window.scrollY > 20), { passive: true });
}

// ─── Upload Zone ──────────────────────────────────────────
function initUploadZone() {
  const uploadContainer = document.getElementById('upload-zone');
  if (!uploadContainer) return;

  const zone = new UploadZone(uploadContainer, {
    onFile: handleFileSelected,
    onError: (msg) => Notifications.error('Upload Error', msg),
  });

  // Upload button
  const uploadBtn = document.getElementById('upload-btn');
  if (uploadBtn) uploadBtn.addEventListener('click', () => zone.open());
}

async function handleFileSelected(file) {
  currentFile = file;

  // Read as DataURL for preview
  originalDataUrl = await readFileAsDataURL(file);

  // Show workspace, hide upload zone
  document.getElementById('upload-section')?.classList.add('hidden');
  document.getElementById('editor-section')?.classList.remove('hidden');

  // Show original in canvas
  renderImageToCanvas('original-canvas', originalDataUrl);

  // Check credits
  const cost = CreditService.getCost('backgroundRemoval');
  const canAfford = CreditService.canAfford('backgroundRemoval');

  if (!canAfford) {
    Notifications.error('Insufficient Credits', `You need ${cost} credits. Please upgrade your plan.`);
    showUploadAgain();
    return;
  }

  // Start processing
  startProcessing();
}

async function startProcessing() {
  const progressBar   = document.getElementById('processing-progress');
  const processingView = document.getElementById('processing-view');
  const editorView    = document.getElementById('editor-view');

  processingView?.classList.remove('hidden');
  editorView?.classList.add('hidden');

  const steps = AppConfig.processingStates;
  let stepIdx = 0;

  const updateStep = (pct) => {
    while (stepIdx < steps.length - 1 && pct >= steps[stepIdx + 1].progress) stepIdx++;
    const step = steps[stepIdx];
    if (progressBar) progressBar.style.width = `${pct}%`;
    document.querySelectorAll('.processing-step').forEach((el, i) => {
      el.classList.toggle('active', i === stepIdx);
      el.classList.toggle('done', i < stepIdx);
    });
    const label = document.getElementById('processing-label');
    if (label) label.textContent = step.label;
  };

  try {
    processingCancelled = false;
    // Use the configured backend when available; keep the local demo usable for UI previews.
    const useDemo = AppConfig.demoMode === true;
    processedBlob = useDemo
      ? await AIProvider.demoRemoveBackground(currentFile, updateStep)
      : await AIProvider.removeBackground(currentFile, updateStep);

    if (processingCancelled) return;

    // Deduct credits after successful processing
    CreditService.deduct('backgroundRemoval');

    // Save project
    const project = ProjectService.create({
      name: currentFile.name.replace(/\.[^.]+$/, ''),
      type: 'background-removal',
      originalUrl: originalDataUrl,
    });

    processingView?.classList.add('hidden');
    editorView?.classList.remove('hidden');

    // Show result
    const resultUrl = URL.createObjectURL(
      processedBlob instanceof Blob ? processedBlob : currentFile
    );
    await renderImageToCanvas('editor-canvas', resultUrl);
    await renderImageToCanvas('before-canvas', originalDataUrl);
    captureHistory();

    Notifications.success('Done!', 'Background removed successfully.');
    updateCreditsDisplay();

  } catch (err) {
    processingView?.classList.add('hidden');
    document.getElementById('error-view')?.classList.remove('hidden');

    const errMsg = document.getElementById('error-message');
    if (errMsg) errMsg.textContent = err.message || 'Processing failed. Please try again.';

    Notifications.error('Processing Failed', err.message);

    // Optionally refund
    CreditService.refund('backgroundRemoval');
  }
}

function renderImageToCanvas(canvasId, src) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      canvas.width  = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      resolve();
    };
    img.onerror = reject;
    img.src = src;
  });
}

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = e => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function showUploadAgain() {
  document.getElementById('upload-section')?.classList.remove('hidden');
  document.getElementById('editor-section')?.classList.add('hidden');
}

// ─── Toolbar ──────────────────────────────────────────────
function initToolbarButtons() {
  document.querySelectorAll('.toolbar-btn[data-tool]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.toolbar-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      showPanel(btn.dataset.tool);
    });
  });
}

function showPanel(toolName) {
  document.querySelectorAll('[data-panel]').forEach(p => p.classList.add('hidden'));
  const panel = document.querySelector(`[data-panel="${toolName}"]`);
  if (panel) panel.classList.remove('hidden');
}

// ─── Editor Controls ──────────────────────────────────────
function initEditorControls() {
  // Zoom
  document.getElementById('zoom-in')?.addEventListener('click',  () => setZoom(zoom + 10));
  document.getElementById('zoom-out')?.addEventListener('click', () => setZoom(zoom - 10));
  document.getElementById('zoom-fit')?.addEventListener('click', () => setZoom(100));

  // Undo / Redo / Reset
  document.getElementById('btn-undo')?.addEventListener('click', undo);
  document.getElementById('btn-redo')?.addEventListener('click', redo);
  document.getElementById('btn-reset')?.addEventListener('click', resetEditor);

  // Retry
  document.getElementById('btn-retry')?.addEventListener('click', () => {
    document.getElementById('error-view')?.classList.add('hidden');
    startProcessing();
  });

  // New image
  document.querySelectorAll('#btn-new-image').forEach(btn => {
    btn.addEventListener('click', showUploadAgain);
  });

  document.getElementById('btn-cancel-processing')?.addEventListener('click', () => {
    processingCancelled = true;
    document.getElementById('processing-view')?.classList.add('hidden');
    showUploadAgain();
    Notifications.info('Cancelled', 'Image processing was cancelled.');
  });

  // Background options
  document.querySelectorAll('.bg-option').forEach(opt => {
    opt.addEventListener('click', () => {
      document.querySelectorAll('.bg-option').forEach(o => o.classList.remove('active'));
      opt.classList.add('active');
      applyBackground(opt.dataset.bg);
    });
  });

  // Range sliders
  document.querySelectorAll('input[type="range"]').forEach(slider => {
    slider.addEventListener('input', () => {
      const label = slider.nextElementSibling;
      if (label && label.classList.contains('panel-row-value')) {
        label.textContent = slider.value + (slider.dataset.unit || '');
      }
    });
  });

  // Color swatches
  document.querySelectorAll('.color-swatch').forEach(sw => {
    sw.addEventListener('click', () => {
      document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
      sw.classList.add('active');
      currentBackgroundColor = sw.dataset.color || currentBackgroundColor;
      applyBackground('solid');
    });
  });

  document.getElementById('custom-color')?.addEventListener('input', (event) => {
    currentBackgroundColor = event.target.value;
    applyBackground('solid');
  });

  // Shadow mode buttons
  document.querySelectorAll('.shadow-mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.shadow-mode-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // Edge presets
  document.querySelectorAll('.edge-preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.edge-preset-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      Notifications.info('Preset Applied', `Fine edge mode: ${btn.textContent.trim()}`);
    });
  });

  // Brush tool
  const brushSizeSlider = document.getElementById('brush-size');
  const brushCircle = document.querySelector('.brush-circle');
  if (brushSizeSlider && brushCircle) {
    brushSizeSlider.addEventListener('input', () => {
      const size = parseInt(brushSizeSlider.value);
      brushCircle.style.width  = size + 'px';
      brushCircle.style.height = size + 'px';
    });
  }
}

function setZoom(pct) {
  zoom = Math.max(10, Math.min(400, pct));
  const wrap = document.getElementById('canvas-wrap');
  if (wrap) wrap.style.transform = `scale(${zoom / 100})`;
  const display = document.getElementById('zoom-display');
  if (display) display.textContent = zoom + '%';
}

function captureHistory() {
  const canvas = document.getElementById('editor-canvas');
  if (!canvas?.width || !canvas?.height) return;
  historyStack = historyStack.slice(0, historyIndex + 1);
  historyStack.push(canvas.toDataURL('image/png'));
  historyIndex = historyStack.length - 1;
}

async function restoreHistory(index) {
  if (!historyStack[index]) return;
  historyIndex = index;
  await renderImageToCanvas('editor-canvas', historyStack[historyIndex]);
}

function undo() {
  if (historyIndex <= 0) { Notifications.info('Undo', 'Nothing to undo.'); return; }
  restoreHistory(historyIndex - 1).then(() => Notifications.info('Undo', 'Previous edit restored.'));
}

function redo() {
  if (historyIndex >= historyStack.length - 1) { Notifications.info('Redo', 'Nothing to redo.'); return; }
  restoreHistory(historyIndex + 1).then(() => Notifications.info('Redo', 'Edit restored.'));
}

function resetEditor() {
  if (!processedBlob) return;
  const url = URL.createObjectURL(processedBlob);
  renderImageToCanvas('editor-canvas', url).then(() => {
    URL.revokeObjectURL(url);
    historyStack = [];
    historyIndex = -1;
    captureHistory();
    Notifications.info('Reset', 'Editor reset to the processed image.');
  });
}

async function applyBackground(type) {
  const canvas = document.getElementById('editor-canvas');
  if (!canvas || !processedBlob) return;
  const ctx = canvas.getContext('2d');

  const image = new Image();
  image.src = URL.createObjectURL(processedBlob);
  await new Promise((resolve, reject) => {
    image.onload = resolve;
    image.onerror = reject;
  });
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (type === 'solid') {
    ctx.fillStyle = currentBackgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  } else if (type === 'gradient') {
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, '#667eea');
    gradient.addColorStop(1, '#764ba2');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.drawImage(image, 0, 0);
  URL.revokeObjectURL(image.src);
  captureHistory();
  Notifications.info('Background Applied', `Background set to: ${type}`);
}

// ─── Export ───────────────────────────────────────────────
function initExportPanel() {
  // Format selection
  document.querySelectorAll('.export-format-btn[data-format]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.export-format-btn[data-format]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // Quality selection
  document.querySelectorAll('.export-quality-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.export-quality-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // Download button
  document.querySelectorAll('#btn-download, #btn-download-bar').forEach(btn => {
    btn.addEventListener('click', downloadResult);
  });
}

function downloadResult() {
  const formatBtn = document.querySelector('.export-format-btn[data-format].active');
  const format = formatBtn?.dataset.format || 'png';
  const canvas = document.getElementById('editor-canvas');
  if (!canvas) { Notifications.error('No Image', 'Process an image first.'); return; }

  const mime = format === 'jpg' ? 'image/jpeg' : format === 'webp' ? 'image/webp' : 'image/png';
  const qualityBtn = document.querySelector('.export-quality-btn.active');
  const qualityMap = { low: 0.5, medium: 0.75, high: 0.9, maximum: 1.0 };
  const quality = qualityMap[qualityBtn?.dataset.quality || 'high'] || 0.9;

  canvas.toBlob((blob) => {
    if (!blob) { Notifications.error('Export Error', 'Could not generate image.'); return; }
    const url  = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href     = url;
    link.download = `antrygravity-result.${format}`;
    link.click();
    URL.revokeObjectURL(url);
    Notifications.success('Downloaded!', `Image saved as ${format.toUpperCase()}.`);
  }, mime, quality);
}

// ─── Keyboard Shortcuts ───────────────────────────────────
function initKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    const ctrl = e.ctrlKey || e.metaKey;
    if (ctrl && e.key === 'z') { e.preventDefault(); undo(); }
    if (ctrl && e.key === 'y') { e.preventDefault(); redo(); }
    if (ctrl && e.key === 's') { e.preventDefault(); downloadResult(); }
    if (e.key === '=') setZoom(zoom + 10);
    if (e.key === '-') setZoom(zoom - 10);
    if (e.key === '0') setZoom(100);
  });
}

function updateCreditsDisplay() {
  const el = document.querySelector('[data-credits-display]');
  if (el) el.textContent = CreditService.getBalance();
}
