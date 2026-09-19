/**
 * AntryGravity Before/After Comparison Slider
 * Touch + mouse drag support
 */
export class BeforeAfterSlider {
  constructor(container) {
    this.container = container;
    this.isDragging = false;
    this.position = 50; // percentage

    if (!container) return;

    this.afterEl  = container.querySelector('.ba-after, .compare-after');
    this.handle   = container.querySelector('.ba-handle, .compare-handle, #upscale-handle');

    this._bind();
    this._setPosition(50);
  }

  _bind() {
    const onStart = (e) => {
      this.isDragging = true;
      this.container.style.cursor = 'col-resize';
      e.preventDefault();
    };

    const onMove = (e) => {
      if (!this.isDragging) return;
      const rect  = this.container.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const pct   = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
      this._setPosition(pct);
    };

    const onEnd = () => {
      this.isDragging = false;
      this.container.style.cursor = 'col-resize';
    };

    if (this.handle) {
      this.handle.addEventListener('mousedown', onStart);
      this.handle.addEventListener('touchstart', onStart, { passive: false });
    }
    this.container.addEventListener('mousedown', onStart);
    this.container.addEventListener('touchstart', onStart, { passive: false });
    window.addEventListener('mousemove', onMove);
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('mouseup', onEnd);
    window.addEventListener('touchend', onEnd);
  }

  _setPosition(pct) {
    this.position = pct;
    if (this.afterEl)  this.afterEl.style.clipPath = `inset(0 ${100 - pct}% 0 0)`;
    if (this.handle)   this.handle.style.left = `${pct}%`;
  }

  setPosition(pct) { this._setPosition(pct); }
  reset()          { this._setPosition(50); }
}
