/**
 * AntryGravity – Central Application Configuration
 * All configurable values live here. Never store secret API keys in this file.
 * Server-side secrets must be stored in environment variables on the backend.
 */

const AppConfig = {
  app: {
    name: 'AntryGravity',
    tagline: 'AI Image Studio',
    version: '1.0.0',
    url: 'https://antrygravity.com',
    supportEmail: 'support@antrygravity.com',
    apiUrl: '/api', // Backend proxy URL — set to your server
  },

  // Use the browser preview until the server-side AI proxy is configured.
  demoMode: true,

  // ─── File Upload Limits ────────────────────────────────────────────────────
  upload: {
    maxFileSizeMB: 25,
    maxFileSizeBytes: 25 * 1024 * 1024,
    supportedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'],
    supportedExtensions: ['jpg', 'jpeg', 'png', 'webp'],
    maxBatchFiles: 50,
  },

  // ─── Credit Costs (configurable from Admin) ────────────────────────────────
  credits: {
    costs: {
      backgroundRemoval: 1,
      upscale2k: 2,
      upscale4k: 4,
      upscale8k: 8,
      aiBackground: 3,
      passportPhoto: 2,
      productStudio: 2,
      batchPerImage: 1,
      fineEdgeRefine: 1,
      shadowGenerate: 1,
      enhance: 1,
    },
    // Refund behavior: 'always' | 'never' | 'on_failure'
    refundPolicy: 'on_failure',
  },

  // ─── Subscription Plans ────────────────────────────────────────────────────
  plans: {
    free: {
      id: 'free',
      name: 'Free',
      price: 0,
      currency: 'USD',
      interval: 'month',
      credits: 5,
      features: {
        maxResolution: '2K',
        watermark: true,
        batchProcessing: false,
        apiAccess: false,
        priorityProcessing: false,
        advancedTools: false,
      },
    },
    pro: {
      id: 'pro',
      name: 'Pro',
      price: 9.99,
      currency: 'USD',
      interval: 'month',
      credits: 500,
      features: {
        maxResolution: '4K',
        watermark: false,
        batchProcessing: true,
        apiAccess: false,
        priorityProcessing: false,
        advancedTools: true,
      },
    },
    business: {
      id: 'business',
      name: 'Business',
      price: 29.99,
      currency: 'USD',
      interval: 'month',
      credits: 2000,
      features: {
        maxResolution: '8K',
        watermark: false,
        batchProcessing: true,
        apiAccess: true,
        priorityProcessing: true,
        advancedTools: true,
        teamMembers: 5,
      },
    },
    enterprise: {
      id: 'enterprise',
      name: 'Enterprise',
      price: null, // Custom pricing
      currency: 'USD',
      interval: 'month',
      credits: -1, // Unlimited
      features: {
        maxResolution: '8K',
        watermark: false,
        batchProcessing: true,
        apiAccess: true,
        priorityProcessing: true,
        advancedTools: true,
        teamMembers: -1, // Unlimited
        customBranding: true,
        dedicatedSupport: true,
      },
    },
  },

  // ─── AI Provider Configuration ─────────────────────────────────────────────
  // NOTE: API keys must NEVER be stored here. Configure them server-side.
  aiProviders: {
    primary: {
      name: 'remove.bg',
      endpoint: '/api/ai/remove-bg', // Server-side proxy
      model: 'default',
      timeoutMs: 30000,
      retryAttempts: 3,
      retryDelayMs: 1000,
    },
    fallback: {
      name: 'clipdrop',
      endpoint: '/api/ai/clipdrop', // Server-side proxy
      model: 'default',
      timeoutMs: 30000,
      retryAttempts: 2,
      retryDelayMs: 1500,
    },
    upscaler: {
      name: 'real-esrgan',
      endpoint: '/api/ai/upscale',
      timeoutMs: 60000,
      retryAttempts: 2,
    },
    bgGenerator: {
      name: 'stable-diffusion',
      endpoint: '/api/ai/generate-bg',
      timeoutMs: 45000,
      retryAttempts: 2,
    },
  },

  // ─── Export Options ────────────────────────────────────────────────────────
  export: {
    formats: ['png', 'jpg', 'webp'],
    quality: {
      low: 0.5,
      medium: 0.75,
      high: 0.9,
      maximum: 1.0,
    },
    resolutions: {
      original: null,
      '2k': 2048,
      '4k': 4096,
      '8k': 8192,
    },
  },

  // ─── Processing States ─────────────────────────────────────────────────────
  processingStates: [
    { id: 'uploading',   label: 'Uploading...',          progress: 10 },
    { id: 'analyzing',  label: 'Analyzing Image...',     progress: 25 },
    { id: 'detecting',  label: 'Detecting Subject...',   progress: 40 },
    { id: 'removing',   label: 'Removing Background...', progress: 60 },
    { id: 'refining',   label: 'Refining Edges...',      progress: 80 },
    { id: 'finalizing', label: 'Finalizing...',          progress: 95 },
    { id: 'complete',   label: 'Complete!',              progress: 100 },
  ],

  // ─── Passport Photo Standards ──────────────────────────────────────────────
  passportSizes: {
    us_passport:    { w: 51, h: 51, unit: 'mm', label: 'US Passport (2×2 in)' },
    uk_passport:    { w: 35, h: 45, unit: 'mm', label: 'UK Passport' },
    eu_passport:    { w: 35, h: 45, unit: 'mm', label: 'EU Passport' },
    in_passport:    { w: 35, h: 45, unit: 'mm', label: 'India Passport' },
    visa_us:        { w: 51, h: 51, unit: 'mm', label: 'US Visa' },
    custom:         { w: null, h: null, unit: 'mm', label: 'Custom Size' },
  },

  // ─── Social Links ──────────────────────────────────────────────────────────
  social: {
    twitter: '#',
    instagram: '#',
    facebook: '#',
    linkedin: '#',
    youtube: '#',
    github: '#',
  },

  // ─── Feature Flags ─────────────────────────────────────────────────────────
  features: {
    googleLogin: false,     // Enable when OAuth is configured
    aiBackground: true,
    upscaler: true,
    passportPhoto: true,
    productStudio: true,
    batchProcessing: true,
    apiAccess: true,
  },
};

// Freeze config to prevent accidental mutations
Object.freeze(AppConfig);

export default AppConfig;
