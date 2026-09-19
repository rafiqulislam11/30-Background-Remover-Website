/**
 * AntryGravity AI Provider Abstraction Layer
 *
 * SECURITY NOTE:
 * Never store provider API keys in this file or any frontend code.
 * API keys must be stored as server-side environment variables.
 * All AI requests go through your backend proxy endpoints.
 *
 * To connect a real provider:
 *  1. Set up a backend server (Node/Express, Supabase Edge Functions, etc.)
 *  2. Store your API key in a server-side env variable
 *  3. Create a proxy endpoint (e.g. POST /api/ai/remove-bg)
 *  4. Update AppConfig.aiProviders.primary.endpoint to point to it
 */

import AppConfig from '../../config/app.config.js';

export class AIProvider {
  /**
   * Remove background from an image file.
   * @param {File} file - The original image file
   * @param {Function} onProgress - Progress callback (0-100)
   * @returns {Promise<Blob>} - PNG with transparent background
   */
  static async removeBackground(file, onProgress) {
    const endpoint = AppConfig.aiProviders.primary.endpoint;
    return this._runWithFallback(
      () => this._callEndpoint(endpoint, file, onProgress, AppConfig.aiProviders.primary),
      () => this._callEndpoint(AppConfig.aiProviders.fallback.endpoint, file, onProgress, AppConfig.aiProviders.fallback),
    );
  }

  /**
   * Upscale an image.
   */
  static async upscale(file, scale = '2k', onProgress) {
    const endpoint = AppConfig.aiProviders.upscaler.endpoint;
    const formData = new FormData();
    formData.append('image', file);
    formData.append('scale', scale);

    const response = await this._fetchWithTimeout(endpoint, {
      method: 'POST',
      body: formData,
    }, AppConfig.aiProviders.upscaler.timeoutMs, onProgress);
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new AIProviderError(error.message || `Upscale failed (${response.status})`, response.status);
    }
    return response.blob();
  }

  /**
   * Generate an AI background from a text prompt.
   */
  static async generateBackground(prompt, onProgress) {
    const endpoint = AppConfig.aiProviders.bgGenerator.endpoint;
    const body = JSON.stringify({ prompt });
    const res = await this._fetchWithTimeout(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    }, AppConfig.aiProviders.bgGenerator.timeoutMs, onProgress);

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new AIProviderError(err.message || 'Failed to generate background', res.status);
    }
    return res.json(); // Returns { images: [{ url, id }] }
  }

  // ─── Private Helpers ─────────────────────────────────────

  static async _runWithFallback(primaryFn, fallbackFn) {
    try {
      return await primaryFn();
    } catch (err) {
      console.warn('[AIProvider] Primary provider failed, trying fallback:', err.message);
      try {
        return await fallbackFn();
      } catch (fallbackErr) {
        throw new AIProviderError(
          'Both primary and fallback AI providers failed. Please try again later.',
          503,
        );
      }
    }
  }

  static async _callEndpoint(endpoint, file, onProgress, providerConfig) {
    const formData = new FormData();
    formData.append('image', file);

    let attempts = 0;
    const maxAttempts = providerConfig.retryAttempts || 3;

    while (attempts < maxAttempts) {
      attempts++;
      try {
        const res = await this._fetchWithTimeout(
          endpoint,
          { method: 'POST', body: formData },
          providerConfig.timeoutMs || 30000,
          onProgress,
        );

        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));

          // Don't retry on client errors (4xx)
          if (res.status >= 400 && res.status < 500) {
            throw new AIProviderError(errBody.message || `Request failed (${res.status})`, res.status);
          }

          // Retry on server errors
          if (attempts >= maxAttempts) {
            throw new AIProviderError(errBody.message || `Server error (${res.status})`, res.status);
          }

          await this._delay(providerConfig.retryDelayMs || 1000);
          continue;
        }

        return await res.blob();
      } catch (err) {
        if (err instanceof AIProviderError) throw err;
        if (attempts >= maxAttempts) {
          throw new AIProviderError(err.message || 'Network error — please check your connection.', 0);
        }
        await this._delay(providerConfig.retryDelayMs || 1000);
      }
    }
  }

  static async _fetchWithTimeout(url, options, timeoutMs, onProgress) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timer);
      return response;
    } catch (err) {
      clearTimeout(timer);
      if (err.name === 'AbortError') {
        throw new AIProviderError('Request timed out. Please try again.', 408);
      }
      throw err;
    }
  }

  static _delay(ms) { return new Promise(r => setTimeout(r, ms)); }

  /**
   * Check if the AI service is reachable.
   */
  static async ping() {
    try {
      const res = await fetch(AppConfig.aiProviders.primary.endpoint + '/ping', { method: 'HEAD' });
      return res.ok;
    } catch { return false; }
  }

  /**
   * DEMO mode: simulate processing (for UI development without a backend).
   * Returns a canvas with the original image and a simple color-key removed BG.
   * This is CLEARLY a demo — not real AI segmentation.
   */
  static async demoRemoveBackground(file, onProgress) {
    return new Promise((resolve, reject) => {
      const steps = [10, 25, 40, 60, 80, 95, 100];
      let i = 0;
      const interval = setInterval(() => {
        if (onProgress) onProgress(steps[i]);
        i++;
        if (i >= steps.length) {
          clearInterval(interval);
          this._demoRemoveLightBackground(file).then(resolve).catch(reject);
        }
      }, 400);
    });
  }

  static async _demoRemoveLightBackground(file) {
    const bitmap = await createImageBitmap(file);
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    context.drawImage(bitmap, 0, 0);
    bitmap.close();

    const image = context.getImageData(0, 0, canvas.width, canvas.height);
    const { data, width, height } = image;
    const queue = [];
    const visited = new Uint8Array(width * height);
    const samplePoints = [
      [0, 0], [width - 1, 0], [0, height - 1], [width - 1, height - 1],
    ];
    const background = samplePoints.reduce((sum, [x, y]) => {
      const offset = (y * width + x) * 4;
      return [sum[0] + data[offset], sum[1] + data[offset + 1], sum[2] + data[offset + 2]];
    }, [0, 0, 0]).map(channel => channel / samplePoints.length);
    const threshold = 62;

    const distance = (offset) => Math.sqrt(
      (data[offset] - background[0]) ** 2
      + (data[offset + 1] - background[1]) ** 2
      + (data[offset + 2] - background[2]) ** 2,
    );
    const enqueue = (x, y) => {
      if (x < 0 || y < 0 || x >= width || y >= height) return;
      const index = y * width + x;
      if (visited[index]) return;
      visited[index] = 1;
      const offset = index * 4;
      if (distance(offset) <= threshold) queue.push(index);
    };

    for (let x = 0; x < width; x++) { enqueue(x, 0); enqueue(x, height - 1); }
    for (let y = 1; y < height - 1; y++) { enqueue(0, y); enqueue(width - 1, y); }
    while (queue.length) {
      const index = queue.pop();
      data[index * 4 + 3] = 0;
      const x = index % width;
      const y = Math.floor(index / width);
      enqueue(x - 1, y); enqueue(x + 1, y); enqueue(x, y - 1); enqueue(x, y + 1);
    }

    context.putImageData(image, 0, 0);
    return new Promise((resolve, reject) => {
      canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Could not create preview image.')), 'image/png');
    });
  }
}

export class AIProviderError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.name = 'AIProviderError';
    this.statusCode = statusCode;
  }
}
