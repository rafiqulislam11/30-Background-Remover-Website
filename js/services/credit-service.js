/**
 * AntryGravity Credit Service
 * Manages user credits with configurable costs from AppConfig.
 */
import AppConfig from '../../config/app.config.js';
import { Auth } from '../core/auth.js';

let demoBalance = 245;

export const CreditService = {
  /**
   * Get current user's credit balance
   */
  getBalance() {
    const user = Auth.currentUser();
    return user ? (user.credits || 0) : (AppConfig.demoMode ? demoBalance : 0);
  },

  /**
   * Get cost of an operation
   */
  getCost(operation) {
    return AppConfig.credits.costs[operation] ?? 0;
  },

  /**
   * Check if user has enough credits
   */
  canAfford(operation) {
    return this.getBalance() >= this.getCost(operation);
  },

  /**
   * Deduct credits for an operation (call AFTER successful processing)
   */
  deduct(operation) {
    const cost = this.getCost(operation);
    const user = Auth.currentUser();
    if (!user && AppConfig.demoMode) {
      if (demoBalance < cost) throw new Error('Insufficient credits');
      demoBalance -= cost;
      return demoBalance;
    }
    if (!user) throw new Error('Not authenticated');
    if (user.credits < cost) throw new Error('Insufficient credits');
    return Auth.updateUser({ credits: user.credits - cost });
  },

  /**
   * Refund credits (for failed jobs, based on config)
   */
  refund(operation) {
    if (AppConfig.credits.refundPolicy === 'never') return null;
    const cost = this.getCost(operation);
    const user = Auth.currentUser();
    if (!user && AppConfig.demoMode) {
      demoBalance += cost;
      return demoBalance;
    }
    if (!user) return null;
    return Auth.updateUser({ credits: user.credits + cost });
  },

  /**
   * Get credit breakdown for display
   */
  getCostBreakdown(operations) {
    return operations.map(op => ({
      operation: op,
      label: this._operationLabel(op),
      cost: this.getCost(op),
    }));
  },

  _operationLabel(op) {
    const labels = {
      backgroundRemoval: 'Background Removal',
      upscale2k:         'Upscale to 2K',
      upscale4k:         'Upscale to 4K',
      upscale8k:         'Upscale to 8K',
      aiBackground:      'AI Background',
      passportPhoto:     'Passport Photo',
      productStudio:     'Product Studio',
      batchPerImage:     'Batch (per image)',
      fineEdgeRefine:    'Fine Edge Refine',
      shadowGenerate:    'Shadow',
      enhance:           'Enhancement',
    };
    return labels[op] || op;
  },
};
