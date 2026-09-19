/**
 * AntryGravity Upload Zone
 * Drag & drop, click, paste, and mobile file picker support
 */
import AppConfig from '../../config/app.config.js';

export class UploadZone {
  /**
   * @param {HTMLElement} container
   * @param {Object} options
   * @param {Function} options.onFile - called with a valid File
   * @param {Function} options.onError - called with an error message string
   */
  constructor(container, { onFile, onError } = {}) {
    this.container = container;
    this.onFile    = onFile  || (() => {});
    this.onError   = onError || ((msg) => console.error(msg));
    this.fileInput = null;
    this._build();
    this._bind();
  }

  _build() {
    // Create hidden file input
    this.fileInput = document.createElement('input');
    this.fileInput.type     = 'file';
    this.fileInput.accept   = AppConfig.upload.supportedTypes.join(',');
    this.fileInput.style.display = 'none';
    this.fileInput.setAttribute('aria-label', 'Select image to upload');
    this.container.appendChild(this.fileInput);
  }

  _bind() {
    // Click to open file picker
    this.container.addEventListener('click', (e) => {
      if (e.target.closest('button, a')) return;
      this.fileInput.click();
    });

    this.fileInput.addEventListener('change', () => {
      if (this.fileInput.files[0]) this._handleFile(this.fileInput.files[0]);
    });

    // Drag events
    this.container.addEventListener('dragover', (e) => {
      e.preventDefault();
      this.container.classList.add('drag-over');
    });

    this.container.addEventListener('dragleave', (e) => {
      if (!this.container.contains(e.relatedTarget)) {
        this.container.classList.remove('drag-over');
      }
    });

    this.container.addEventListener('drop', (e) => {
      e.preventDefault();
      this.container.classList.remove('drag-over');
      const file = e.dataTransfer.files[0];
      if (file) this._handleFile(file);
    });

    // Paste from clipboard
    document.addEventListener('paste', (e) => {
      const items = Array.from(e.clipboardData?.items || []);
      const imgItem = items.find(i => i.type.startsWith('image/'));
      if (imgItem) {
        const file = imgItem.getAsFile();
        if (file) this._handleFile(file);
      }
    });
  }

  _handleFile(file) {
    // Validate type
    if (!AppConfig.upload.supportedTypes.includes(file.type)) {
      this.onError(`Unsupported file type: ${file.type}. Please use ${AppConfig.upload.supportedExtensions.join(', ').toUpperCase()}.`);
      return;
    }

    // Validate size
    if (file.size > AppConfig.upload.maxFileSizeBytes) {
      const maxMB = AppConfig.upload.maxFileSizeMB;
      this.onError(`File is too large. Maximum size is ${maxMB}MB.`);
      return;
    }

    this.onFile(file);
  }

  /** Programmatically trigger file picker */
  open() { this.fileInput.click(); }

  /** Set loading/disabled state */
  setDisabled(disabled) {
    this.container.style.pointerEvents = disabled ? 'none' : '';
    this.container.style.opacity = disabled ? '0.6' : '';
  }
}
