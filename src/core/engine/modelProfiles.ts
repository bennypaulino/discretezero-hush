/**
 * Model Profiles - Comprehensive AI Model Specifications
 *
 * Defines time-based response budgets, context windows, and device requirements
 * for all supported on-device AI models.
 *
 * Phase 1 of P1.11 Dynamic Context Budgets implementation.
 *
 * Key Innovation: Response budgets based on TIME, not arbitrary token counts.
 * - Fast models (Gemma) can give longer responses (1600 tokens in 64s)
 * - Slow models (Llama 8B) give shorter responses (1200 tokens in 100s)
 * - All models finish responses in acceptable time windows (6-100 seconds)
 */

import type { PerformanceMode } from '../state/types';

/**
 * Time-based response budget configuration
 *
 * With streaming (Branch 1), users see first words in 1-2 seconds, then watch
 * text appear token-by-token. This makes longer generation times acceptable.
 */
export interface ResponseTimeBudget {
  targetSeconds: number; // Target total time (latency + streaming)
  tokens: number; // Max tokens for this budget
}

export interface ThoughtfulResponseBudget {
  targetSecondsFree: number; // Free tier time budget
  tokensFree: number; // Free tier token budget
  targetSecondsPro: number; // Pro tier time budget (2x Free)
  tokensPro: number; // Pro tier token budget (2x Free)
}

/**
 * Comprehensive model profile
 *
 * Contains all information needed to use a model: context window, inference speed,
 * time-based response budgets, device requirements, and inference configuration.
 */
export interface ModelProfile {
  // Identity
  id: string; // Unique identifier (e.g., 'gemma-2-2b')
  name: string; // Display name (e.g., 'Gemma 2B')
  family: 'gemma' | 'llama' | 'phi'; // Model family
  version: string; // Model version (e.g., '2.0', '3.2')

  // File information
  fileName: string; // GGUF filename
  downloadUrl: string; // HuggingFace download URL
  sizeBytes: number; // File size in bytes

  // Context & Performance
  contextWindow: number; // Maximum context window size (tokens)
  recommendedContextUsage: number; // Safe context size (leave headroom)
  avgTokensPerSecond: number; // Inference speed on typical device

  // Device Requirements
  minDeviceRAM: number; // Minimum RAM in GB
  minChipGeneration: number; // Minimum Apple chip (13 = A13)
  chatTemplate: 'gemma' | 'llama'; // Prompt template format

  // Time-based Response Budgets
  responseTimeBudgets: {
    quick: ResponseTimeBudget; // Fast responses (1-2 sentences)
    thoughtful: ThoughtfulResponseBudget; // Detailed responses (Free vs Pro)
  };

  // Inference Configuration
  batchSize: number; // Batch size for inference
  gpuLayers: number; // GPU layer offloading (-1 = all layers)
}

/**
 * Model profile definitions
 *
 * Ordered by speed (fastest to slowest):
 * - Gemma 2B: 25 tokens/sec (EFFICIENT mode)
 * - Llama 3.2 3B: 20 tokens/sec (BALANCED mode)
 * - Llama 3.1 8B: 12 tokens/sec (QUALITY mode)
 */
const MODEL_PROFILES: Record<string, ModelProfile> = {
  'gemma-2-2b': {
    // Identity
    id: 'gemma-2-2b',
    name: 'Gemma 2B',
    family: 'gemma',
    version: '2.0',

    // File information
    fileName: 'gemma-2-2b-it-Q4_K_M.gguf',
    downloadUrl:
      'https://huggingface.co/lmstudio-community/gemma-2-2b-it-GGUF/resolve/main/gemma-2-2b-it-Q4_K_M.gguf',
    sizeBytes: 1717986560, // ~1.6GB

    // Context & Performance
    contextWindow: 8192,
    recommendedContextUsage: 7000, // Leave 1K headroom for safety
    avgTokensPerSecond: 25, // FAST model

    // Device Requirements
    minDeviceRAM: 4, // Runs on 4GB devices
    minChipGeneration: 13, // A13+ (iPhone 11)
    chatTemplate: 'gemma',

    // Time-based Response Budgets
    // With streaming: Users see first words in ~1-2s, then watch text appear
    responseTimeBudgets: {
      quick: {
        targetSeconds: 6, // Fast response (1-2s latency + 4-5s streaming)
        tokens: 150, // 25 tokens/sec × 6s = 150 tokens
      },
      thoughtful: {
        targetSecondsFree: 32,
        tokensFree: 800, // 25 × 32 = 800 (streaming makes this comfortable)
        targetSecondsPro: 64,
        tokensPro: 1600, // 25 × 64 = 1600 (2x boost! Pro users watching text)
      },
    },

    // Inference Configuration
    batchSize: 512,
    gpuLayers: -1, // Offload all layers to GPU
  },

  'llama-3.2-3b': {
    // Identity
    id: 'llama-3.2-3b',
    name: 'Llama 3.2 3B',
    family: 'llama',
    version: '3.2',

    // File information
    fileName: 'Llama-3.2-3B-Instruct-Q4_K_M.gguf',
    downloadUrl:
      'https://huggingface.co/lmstudio-community/Llama-3.2-3B-Instruct-GGUF/resolve/main/Llama-3.2-3B-Instruct-Q4_K_M.gguf',
    sizeBytes: 2147483648, // ~2GB

    // Context & Performance
    contextWindow: 131072, // 128K context!
    recommendedContextUsage: 100000, // Leave 28K headroom
    avgTokensPerSecond: 20, // Medium speed

    // Device Requirements
    minDeviceRAM: 6, // Requires 6GB for stable performance
    minChipGeneration: 15, // A15+ (iPhone 13)
    chatTemplate: 'llama',

    // Time-based Response Budgets
    // With streaming: First words in ~1-2s, comfortable to watch 60-70s of streaming
    responseTimeBudgets: {
      quick: {
        targetSeconds: 7,
        tokens: 140, // 20 tokens/sec × 7s ≈ 140 tokens
      },
      thoughtful: {
        targetSecondsFree: 35,
        tokensFree: 700, // 20 × 35 = 700
        targetSecondsPro: 70,
        tokensPro: 1400, // 20 × 70 = 1400 (2x boost!)
      },
    },

    // Inference Configuration
    batchSize: 512,
    gpuLayers: -1, // Offload all layers to GPU
  },

  'llama-3.1-8b': {
    // Identity
    id: 'llama-3.1-8b',
    name: 'Llama 3.1 8B',
    family: 'llama',
    version: '3.1',

    // File information
    fileName: 'Meta-Llama-3.1-8B-Instruct-Q4_K_M.gguf',
    downloadUrl:
      'https://huggingface.co/lmstudio-community/Meta-Llama-3.1-8B-Instruct-GGUF/resolve/main/Meta-Llama-3.1-8B-Instruct-Q4_K_M.gguf',
    sizeBytes: 5260123136, // ~4.9GB

    // Context & Performance
    contextWindow: 131072, // 128K context
    recommendedContextUsage: 120000, // Larger model, can push context more
    avgTokensPerSecond: 12, // SLOW but high quality

    // Device Requirements
    minDeviceRAM: 8, // Requires 8GB (iPhone 13 Pro+, iPhone 14 Pro+, iPhone 15 series)
    minChipGeneration: 17, // A17+ (iPhone 15 Pro)
    chatTemplate: 'llama',

    // Time-based Response Budgets
    // With streaming: Quality mode users expect depth over speed
    // Watching 90 seconds of streaming is fine for best quality responses
    responseTimeBudgets: {
      quick: {
        targetSeconds: 10,
        tokens: 120, // 12 tokens/sec × 10s = 120 tokens
      },
      thoughtful: {
        targetSecondsFree: 50,
        tokensFree: 600, // 12 × 50 = 600
        targetSecondsPro: 100,
        tokensPro: 1200, // 12 × 100 = 1200 (2x boost! Quality > speed)
      },
    },

    // Inference Configuration
    batchSize: 512,
    gpuLayers: -1, // Offload all layers to GPU
  },
};

/**
 * Map performance mode to model profile ID
 */
const MODE_TO_MODEL_ID: Record<PerformanceMode, string> = {
  efficient: 'gemma-2-2b',
  balanced: 'llama-3.2-3b',
  quality: 'llama-3.1-8b',
};

/**
 * Get model profile for a performance mode
 *
 * @param mode - Performance mode (efficient/balanced/quality)
 * @returns Complete model profile with all specifications
 * @throws Error if mode not found (should never happen with valid PerformanceMode)
 */
export function getModelProfile(mode: PerformanceMode): ModelProfile {
  const modelId = MODE_TO_MODEL_ID[mode];
  const profile = MODEL_PROFILES[modelId];

  if (!profile) {
    throw new Error(`Model profile not found for mode: ${mode}`);
  }

  return profile;
}

/**
 * Get model profile by ID
 *
 * @param id - Model ID (e.g., 'gemma-2-2b')
 * @returns Model profile or undefined if not found
 */
export function getModelById(id: string): ModelProfile | undefined {
  return MODEL_PROFILES[id];
}

/**
 * Get all model profiles
 *
 * @returns Array of all model profiles
 */
export function getAllModelProfiles(): ModelProfile[] {
  return Object.values(MODEL_PROFILES);
}

/**
 * Get model ID for a performance mode
 *
 * @param mode - Performance mode
 * @returns Model ID string
 */
export function getModelIdForMode(mode: PerformanceMode): string {
  return MODE_TO_MODEL_ID[mode];
}

/**
 * Check if a model ID is valid
 *
 * @param id - Model ID to check
 * @returns True if model exists
 */
export function isValidModelId(id: string): boolean {
  return id in MODEL_PROFILES;
}
