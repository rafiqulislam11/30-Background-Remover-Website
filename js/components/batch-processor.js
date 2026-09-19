/**
 * AntryGravity Batch Processor
 * Async queue that processes files one-by-one without blocking the UI.
 * Uses a simple async generator to avoid Web Worker complexity.
 */
import { AIProvider } from '../services/ai-provider.js';
import AppConfig from '../../config/app.config.js';

export class BatchProcessor {
  constructor({ onItemStart, onItemProgress, onItemComplete, onItemError, onAllComplete }) {
    this.queue       = [];
    this.running     = false;
    this.aborted     = false;
    this.onItemStart    = onItemStart    || (() => {});
    this.onItemProgress = onItemProgress || (() => {});
    this.onItemComplete = onItemComplete || (() => {});
    this.onItemError    = onItemError    || (() => {});
    this.onAllComplete  = onAllComplete  || (() => {});
  }

  addFiles(files) {
    if (files.length > AppConfig.upload.maxBatchFiles) {
      throw new Error(`Maximum ${AppConfig.upload.maxBatchFiles} files per batch.`);
    }
    this.queue = Array.from(files).map((file, idx) => ({
      id:     `batch-${Date.now()}-${idx}`,
      file,
      status: 'pending',  // pending | processing | done | failed
      result: null,
      error:  null,
      progress: 0,
    }));
    return this.queue;
  }

  async start() {
    if (this.running) return;
    this.running = true;
    this.aborted = false;

    for (const item of this.queue) {
      if (this.aborted) break;
      if (item.status !== 'pending') continue;

      item.status = 'processing';
      this.onItemStart(item);

      try {
        const process = AppConfig.demoMode
          ? AIProvider.demoRemoveBackground
          : AIProvider.removeBackground;
        const resultBlob = await process.call(
          AIProvider,
          item.file,
          (pct) => {
            item.progress = pct;
            this.onItemProgress(item, pct);
          },
        );

        item.status = 'done';
        item.result = URL.createObjectURL(resultBlob instanceof Blob ? resultBlob : item.file);
        item.progress = 100;
        this.onItemComplete(item);
      } catch (err) {
        item.status = 'failed';
        item.error  = err.message || 'Processing failed';
        this.onItemError(item, item.error);
      }
    }

    this.running = false;
    this.onAllComplete(this.queue);
  }

  abort() { this.aborted = true; }

  retryFailed() {
    this.queue.forEach(item => {
      if (item.status === 'failed') {
        item.status   = 'pending';
        item.error    = null;
        item.progress = 0;
      }
    });
    return this.start();
  }

  getStats() {
    return {
      total:      this.queue.length,
      pending:    this.queue.filter(i => i.status === 'pending').length,
      processing: this.queue.filter(i => i.status === 'processing').length,
      done:       this.queue.filter(i => i.status === 'done').length,
      failed:     this.queue.filter(i => i.status === 'failed').length,
    };
  }

  getDoneItems()   { return this.queue.filter(i => i.status === 'done'); }
  getFailedItems() { return this.queue.filter(i => i.status === 'failed'); }
}
