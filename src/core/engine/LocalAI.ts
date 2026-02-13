// src/core/engine/LocalAI.ts
// On-device AI inference using llama.rn
import { initLlama, LlamaContext, releaseAllLlama } from 'llama.rn';
import { Paths } from 'expo-file-system';
import * as FileSystem from 'expo-file-system/legacy';
import NetInfo from '@react-native-community/netinfo';
import * as Battery from 'expo-battery';
import * as Notifications from 'expo-notifications';
import { AppState, type NativeEventSubscription } from 'react-native';
import { PERSONALITIES } from './GroqAI';
import type { AppFlavor } from '../../config';
import type { ResponseStyleHush, ResponseStyleClassified, ResponseStyleDiscretion, PerformanceMode, Message } from '../state/rootStore';
import { useChatStore } from '../state/rootStore';
import { estimateTokens } from '../utils/tokenCounter';

// Model configurations
interface ModelConfig {
  fileName: string;
  contextSize: number;
  batchSize: number;
  gpuLayers: number; // -1 = all layers on GPU (Metal/Vulkan)
  downloadUrl: string; // HuggingFace or CDN URL
  sizeBytes: number; // For progress tracking
}

const MODEL_CONFIGS: Record<PerformanceMode, ModelConfig> = {
  efficient: {
    fileName: 'gemma-2-2b-it-Q4_K_M.gguf',
    contextSize: 8192,
    batchSize: 512,
    gpuLayers: -1,
    downloadUrl: 'https://huggingface.co/lmstudio-community/gemma-2-2b-it-GGUF/resolve/main/gemma-2-2b-it-Q4_K_M.gguf',
    sizeBytes: 1717986560, // ~1.6GB
  },
  balanced: {
    fileName: 'Llama-3.2-3B-Instruct-Q4_K_M.gguf',
    contextSize: 131072,
    batchSize: 512,
    gpuLayers: -1,
    downloadUrl: 'https://huggingface.co/lmstudio-community/Llama-3.2-3B-Instruct-GGUF/resolve/main/Llama-3.2-3B-Instruct-Q4_K_M.gguf',
    sizeBytes: 2147483648, // ~2GB
  },
  quality: {
    fileName: 'Meta-Llama-3.1-8B-Instruct-Q4_K_M.gguf',
    contextSize: 131072,
    batchSize: 512,
    gpuLayers: -1,
    downloadUrl: 'https://huggingface.co/lmstudio-community/Meta-Llama-3.1-8B-Instruct-GGUF/resolve/main/Meta-Llama-3.1-8B-Instruct-Q4_K_M.gguf',
    sizeBytes: 5260123136, // ~4.9GB
  },
};

// Singleton context
let llamaContext: LlamaContext | null = null;
let currentModel: PerformanceMode | null = null;

// Active downloads (stored globally to survive component unmounts)
const activeDownloads = new Map<PerformanceMode, FileSystem.DownloadResumable>();

// Clear stale downloads on module initialization
activeDownloads.clear();

// Memory pressure handling (P1 fix: proper types for event listeners)
let memoryWarningSubscription: NativeEventSubscription | null = null;
let appStateSubscription: NativeEventSubscription | null = null;
let backgroundTimer: NodeJS.Timeout | null = null;

/**
 * Setup memory pressure monitoring
 * Listens for:
 * 1. Memory warnings (iOS) → release model immediately
 * 2. App backgrounding → release model after 5 minutes
 */
function setupMemoryMonitoring(): void {
  // Only setup once
  if (memoryWarningSubscription || appStateSubscription) {
    return;
  }

  // 1. Listen for memory warnings (iOS)
  memoryWarningSubscription = AppState.addEventListener('memoryWarning', async () => {
    if (__DEV__) {
      console.warn('[LocalAI] Memory pressure detected - releasing model');
    }
    await releaseModelDueToMemoryPressure();
  });

  // 2. Listen for app state changes (background/foreground)
  appStateSubscription = AppState.addEventListener('change', (nextAppState) => {
    if (nextAppState === 'background') {
      // P1 fix: Clear any existing timer first to prevent timer accumulation
      if (backgroundTimer) {
        clearTimeout(backgroundTimer);
        backgroundTimer = null;
      }

      // Start 5-minute timer when app goes to background
      if (__DEV__) {
        console.log('[LocalAI] App backgrounded - starting 5min timer');
      }
      backgroundTimer = setTimeout(async () => {
        if (__DEV__) {
          console.log('[LocalAI] Background >5min - releasing model');
        }
        await releaseModelDueToMemoryPressure();
      }, 5 * 60 * 1000); // 5 minutes
    } else if (nextAppState === 'active') {
      // Cancel timer when app returns to foreground
      if (backgroundTimer) {
        if (__DEV__) {
          console.log('[LocalAI] App foregrounded - canceling release timer');
        }
        clearTimeout(backgroundTimer);
        backgroundTimer = null;
      }
    }
  });

  if (__DEV__) {
    console.log('[LocalAI] Memory monitoring active');
  }
}

/**
 * Release model due to memory pressure or background timeout
 * Preserves currentModel for potential re-initialization
 */
async function releaseModelDueToMemoryPressure(): Promise<void> {
  if (llamaContext) {
    const previousMode = currentModel;
    await releaseAllLlama();
    llamaContext = null;
    // Keep currentModel set so we know which model to re-initialize if needed
    // currentModel = null; // Don't clear this

    // P1 fix: Cleanup event listeners to prevent accumulation
    cleanupMemoryMonitoring();

    if (__DEV__) {
      console.log(`[LocalAI] Model released due to memory pressure (was: ${previousMode})`);
    }

    // Update store to indicate model needs re-initialization
    // This allows UI to show "Model unloaded due to memory pressure" if needed
  }
}

/**
 * Cleanup memory monitoring listeners
 */
function cleanupMemoryMonitoring(): void {
  if (memoryWarningSubscription) {
    memoryWarningSubscription.remove();
    memoryWarningSubscription = null;
  }

  if (appStateSubscription) {
    appStateSubscription.remove();
    appStateSubscription = null;
  }

  if (backgroundTimer) {
    clearTimeout(backgroundTimer);
    backgroundTimer = null;
  }

  if (__DEV__) {
    console.log('[LocalAI] Memory monitoring cleaned up');
  }
}

/**
 * Clean up orphaned downloads (downloads that are in the Map but not actually active)
 * Call this on app startup or when suspecting stale state
 */
export async function cleanupOrphanedDownloads(): Promise<void> {
  const modes: PerformanceMode[] = ['efficient', 'balanced', 'quality'];

  for (const mode of modes) {
    const resumable = activeDownloads.get(mode);
    if (resumable) {
      // Check if file is already downloaded
      const fileExists = await isModelDownloaded(mode);
      if (fileExists) {
        // Download complete but not cleaned up
        activeDownloads.delete(mode);
        if (__DEV__) {
          console.log(`[LocalAI] Cleaned up completed download: ${mode}`);
        }
      } else {
        // Try to verify if download is actually active
        try {
          // Attempt to pause and resume to check if download is valid
          await resumable.pauseAsync();
          await resumable.resumeAsync();
        } catch {
          // Dead download, clean up
          activeDownloads.delete(mode);
          if (__DEV__) {
            console.log(`[LocalAI] Cleaned up orphaned download: ${mode}`);
          }
        }
      }
    }
  }
}

// Export model configs for UI
export { MODEL_CONFIGS };

// Validation result interface
interface ValidationResult {
  canProceed: boolean;
  warning?: 'cellular_data' | 'low_battery';
  error?: 'no_connection' | 'insufficient_storage';
  message?: string;
  requiresConfirmation?: boolean;
}

/**
 * Validate download requirements (network, storage, battery)
 */
export async function validateDownloadRequirements(): Promise<ValidationResult> {
  // Check 1: Network connectivity
  const netInfo = await NetInfo.fetch();

  if (!netInfo.isConnected || !netInfo.isInternetReachable) {
    return {
      canProceed: false,
      error: 'no_connection',
      message: 'No internet connection detected',
    };
  }

  // Check 2: Cellular warning (don't block - allow with confirmation)
  if (netInfo.type === 'cellular') {
    return {
      canProceed: true,
      warning: 'cellular_data',
      message: 'This will use 1.6 GB of cellular data',
      requiresConfirmation: true,
    };
  }

  // Check 3: Storage space
  const freeSpace = await FileSystem.getFreeDiskStorageAsync();
  const requiredSpace = 2 * 1024 * 1024 * 1024; // 2GB buffer

  if (freeSpace < requiredSpace) {
    return {
      canProceed: false,
      error: 'insufficient_storage',
      message: `Free up ${((requiredSpace - freeSpace) / 1024 / 1024 / 1024).toFixed(1)} GB to continue`,
    };
  }

  // Check 4: Battery warning (don't block - just warn)
  const batteryLevel = await Battery.getBatteryLevelAsync();
  if (batteryLevel < 0.2) {
    return {
      canProceed: true,
      warning: 'low_battery',
      message: `Battery low (${Math.round(batteryLevel * 100)}%) - consider charging`,
    };
  }

  return { canProceed: true };
}

/**
 * Show notification when download completes in background
 */
async function showDownloadCompleteNotification(): Promise<void> {
  try {
    const { status } = await Notifications.getPermissionsAsync();

    if (status === 'granted') {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Hush Setup Complete',
          body: 'Your AI model downloaded successfully. Tap to continue.',
          sound: true,
        },
        trigger: null, // Show immediately
      });
    }
  } catch (error) {
    if (__DEV__) {
      console.error('[LocalAI] Notification error:', error);
    }
  }
}

/**
 * Download model with background support (continues when app is backgrounded)
 */
export async function downloadModelInBackground(
  mode: PerformanceMode,
  onProgress: (progress: number) => void
): Promise<void> {
  const config = MODEL_CONFIGS[mode];
  const modelPath = `${Paths.document.uri}models/${config.fileName}`;
  const modelsDir = `${Paths.document.uri}models`;

  try {
    // Create directory if needed
    const dirInfo = await FileSystem.getInfoAsync(modelsDir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(modelsDir, { intermediates: true });
    }

    if (__DEV__) {
      console.log(`[LocalAI] Starting background download: ${config.fileName}`);
    }

    // Create download with background support
    const downloadResumable = FileSystem.createDownloadResumable(
      config.downloadUrl,
      modelPath,
      {},
      (downloadProgress) => {
        const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
        onProgress(progress);
      }
    );

    // Download (continues in background on iOS)
    const result = await downloadResumable.downloadAsync();

    if (result) {
      if (__DEV__) {
        console.log(`[LocalAI] Download complete: ${config.fileName}`);
      }

      // Show notification if app was backgrounded
      const appState = AppState.currentState;
      if (appState !== 'active') {
        await showDownloadCompleteNotification();
      }
    }
  } catch (error) {
    if (__DEV__) {
      console.error('[LocalAI] Background download failed:', error);
    }
    throw error;
  }
}

/**
 * Initialize or switch to a specific model
 */
export async function initializeModel(mode: PerformanceMode): Promise<void> {
  try {
    // If same model is already loaded, skip
    if (llamaContext && currentModel === mode) {
      if (__DEV__) {
        console.log('[LocalAI] Model already initialized:', mode);
      }
      return;
    }

    // Release existing context if switching models
    if (llamaContext) {
      if (__DEV__) {
        console.log('[LocalAI] Releasing previous model:', currentModel);
      }
      await releaseAllLlama();
      llamaContext = null;
      currentModel = null;
    }

    const config = MODEL_CONFIGS[mode];
    const modelPath = await getModelPath(config.fileName, mode);

    if (__DEV__) {
      console.log('[LocalAI] Initializing model:', mode);
      console.log('[LocalAI] Model path:', modelPath);
      console.log('[LocalAI] Model size:', (config.sizeBytes / 1024 / 1024 / 1024).toFixed(2), 'GB');
    }

    // Setup memory pressure monitoring
    setupMemoryMonitoring();

    // Decide whether to use mlock based on model size
    // Only lock small models (<2GB) in memory to prevent swapping
    // For larger models (balanced, quality), let OS manage memory
    const useMlock = config.sizeBytes < 2 * 1024 * 1024 * 1024; // Only for models < 2GB

    if (__DEV__) {
      console.log('[LocalAI] use_mlock:', useMlock, '(size:', (config.sizeBytes / 1024 / 1024 / 1024).toFixed(2), 'GB)');
    }

    // Initialize llama.rn context
    llamaContext = await initLlama({
      model: modelPath,
      use_mlock: useMlock, // Lock small models in memory, let OS manage large ones
      n_ctx: config.contextSize,
      n_batch: config.batchSize,
      n_gpu_layers: config.gpuLayers, // Use GPU acceleration
      // Additional optimizations
      use_mmap: true, // Memory-map the model file
      embedding: false, // We don't need embeddings
    });

    currentModel = mode;

    if (__DEV__) {
      console.log('[LocalAI] Model initialized successfully:', mode);
    }
  } catch (error) {
    if (__DEV__) {
      console.error('[LocalAI] Model initialization failed:', error);
    }
    throw error;
  }
}

/**
 * Get the path to a model file
 * All models are downloaded to document directory on-demand
 * This approach avoids Metro bundler size limits (1.6GB+ files)
 */
async function getModelPath(fileName: string, mode: PerformanceMode): Promise<string> {
  // All models stored in document directory
  const modelPath = `${Paths.document.uri}models/${fileName}`;

  const fileInfo = await FileSystem.getInfoAsync(modelPath);
  if (!fileInfo.exists) {
    throw new Error(`Model not downloaded: ${mode}. Please download the model first.`);
  }

  return modelPath;
}

/**
 * Check if a model is already downloaded
 */
export async function isModelDownloaded(mode: PerformanceMode): Promise<boolean> {
  const config = MODEL_CONFIGS[mode];
  const modelPath = `${Paths.document.uri}models/${config.fileName}`;

  try {
    const fileInfo = await FileSystem.getInfoAsync(modelPath);
    return fileInfo.exists;
  } catch {
    return false;
  }
}

/**
 * Download a model with progress tracking and resume support
 */
export async function downloadModel(
  mode: PerformanceMode,
  onProgress: (progress: number) => void
): Promise<void> {
  const config = MODEL_CONFIGS[mode];
  const modelsDir = `${Paths.document.uri}models`;
  const modelPath = `${modelsDir}/${config.fileName}`;

  try {
    // Create models directory if it doesn't exist
    const dirInfo = await FileSystem.getInfoAsync(modelsDir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(modelsDir, { intermediates: true });
    }

    // Check if there's an existing download for this mode
    let downloadResumable = activeDownloads.get(mode);

    if (downloadResumable) {
      if (__DEV__) {
        console.log(`[LocalAI] Resuming download: ${config.fileName}`);
      }
      // Try to resume
      try {
        const resumeData = await downloadResumable.resumeAsync();
        if (__DEV__) {
          console.log(`[LocalAI] Download complete (resumed): ${config.fileName}`);
        }
        // Clean up
        activeDownloads.delete(mode);
        return;
      } catch (resumeError) {
        // Resume failed, clean up partial file and start fresh
        if (__DEV__) {
          console.warn('[LocalAI] Resume failed, cleaning up partial file:', resumeError);
        }
        activeDownloads.delete(mode);

        // Delete partial file before starting fresh
        try {
          await FileSystem.deleteAsync(modelPath, { idempotent: true });
        } catch (deleteError) {
          // Ignore delete errors, file might not exist
          if (__DEV__) {
            console.warn('[LocalAI] Could not delete partial file:', deleteError);
          }
        }

        downloadResumable = undefined;
      }
    }

    // Start new download
    if (__DEV__) {
      console.log(`[LocalAI] Starting download: ${config.fileName}`);
      console.log(`[LocalAI] URL: ${config.downloadUrl}`);
      console.log(`[LocalAI] Size: ${(config.sizeBytes / 1024 / 1024 / 1024).toFixed(2)}GB`);
    }

    // Create download with progress tracking
    downloadResumable = FileSystem.createDownloadResumable(
      config.downloadUrl,
      modelPath,
      {},
      (downloadProgress) => {
        const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
        onProgress(progress);
      }
    );

    // Store in active downloads
    activeDownloads.set(mode, downloadResumable);

    // Start download
    await downloadResumable.downloadAsync();

    // Clean up on success
    activeDownloads.delete(mode);

    if (__DEV__) {
      console.log(`[LocalAI] Download complete: ${config.fileName}`);
    }
  } catch (error) {
    // Clean up on error
    activeDownloads.delete(mode);

    if (__DEV__) {
      console.error('[LocalAI] Download failed:', error);
    }
    throw error;
  }
}

/**
 * Cancel an in-progress download
 */
export async function cancelDownload(mode: PerformanceMode): Promise<void> {
  const downloadResumable = activeDownloads.get(mode);
  if (downloadResumable) {
    try {
      await downloadResumable.pauseAsync();
      if (__DEV__) {
        console.log(`[LocalAI] Download canceled: ${mode}`);
      }
    } catch (error) {
      if (__DEV__) {
        console.error('[LocalAI] Cancel failed (download might be complete):', error);
      }
    } finally {
      // Always clean up Map entry, even if pause fails
      activeDownloads.delete(mode);
    }
  }
}

/**
 * Check if there's an active download for a mode
 * Cross-checks with file existence to handle race conditions
 */
export async function hasActiveDownload(mode: PerformanceMode): Promise<boolean> {
  // Check in-memory map first (fast path)
  if (activeDownloads.has(mode)) {
    return true;
  }

  // Double-check: if map says no but file exists, sync state
  const fileExists = await isModelDownloaded(mode);
  if (fileExists) {
    // File is complete, update store to mark as downloaded
    useChatStore.getState().completeModeDownload(mode);
    return false; // Download is complete, not active
  }

  return false;
}

/**
 * Delete a downloaded model to free up space
 */
export async function deleteModel(mode: PerformanceMode): Promise<void> {
  const config = MODEL_CONFIGS[mode];
  const modelPath = `${Paths.document.uri}models/${config.fileName}`;

  try {
    const fileInfo = await FileSystem.getInfoAsync(modelPath);
    if (fileInfo.exists) {
      await FileSystem.deleteAsync(modelPath);

      if (__DEV__) {
        console.log(`[LocalAI] Deleted: ${modelPath}`);
      }
    }
  } catch (error) {
    if (__DEV__) {
      console.error('[LocalAI] Delete failed:', error);
    }
    throw error;
  }
}

/**
 * Generate AI response using on-device inference
 * Same signature as GroqAI.generateResponse for easy replacement
 */
export async function generateResponse(
  prompt: string,
  context: AppFlavor = 'HUSH',
  conversationHistory: Message[] = [], // NEW: conversation context
  conversationSummary?: string | null, // NEW: optional summary (Pro users)
  responseStyle?: ResponseStyleHush | ResponseStyleClassified | ResponseStyleDiscretion,
  onTokenCallback?: (token: string) => void // STREAMING: Optional callback for token-by-token updates
): Promise<string> {
  try {
    // Get active model from store
    let { activeMode } = useChatStore.getState();

    // Ensure model is initialized
    if (!llamaContext || currentModel !== activeMode) {
      await initializeModel(activeMode);

      // Re-read activeMode after initialization (user may have switched during init)
      const currentState = useChatStore.getState();
      if (currentState.activeMode !== activeMode) {
        if (__DEV__) {
          console.log(`[LocalAI] Mode switched during init (${activeMode} → ${currentState.activeMode}), reinitializing`);
        }
        activeMode = currentState.activeMode;
        await initializeModel(activeMode);
      }
    }

    if (!llamaContext) {
      throw new Error('Model not initialized');
    }

    // Select system prompt (same logic as GroqAI)
    let systemPrompt: string;

    if (context === 'HUSH') {
      const style = (responseStyle as ResponseStyleHush) || 'quick';
      systemPrompt = PERSONALITIES.HUSH[style];
    } else if (context === 'CLASSIFIED') {
      const style = (responseStyle as ResponseStyleClassified) || 'operator';
      systemPrompt = PERSONALITIES.CLASSIFIED[style];
    } else {
      // DISCRETION
      const style = (responseStyle as ResponseStyleDiscretion) || 'formal';
      systemPrompt = PERSONALITIES.DISCRETION[style];
    }

    // Adjust max tokens based on style (same as GroqAI)
    const maxTokens = (responseStyle === 'quick' || responseStyle === 'operator' || responseStyle === 'formal') ? 150 : 400;

    // === BUILD MULTI-TURN PROMPT WITH CONVERSATION HISTORY (P1.10) ===
    // Using Gemma/Llama chat template format: <start_of_turn>{role}\n{text}<end_of_turn>\n

    // 1. System prompt
    let formattedPrompt = `<start_of_turn>system
${systemPrompt}<end_of_turn>
`;

    // 2. Inject conversation summary if available (Pro users)
    if (conversationSummary) {
      formattedPrompt += `<start_of_turn>system
[Previous conversation summary: ${conversationSummary}]<end_of_turn>
`;
      if (__DEV__) {
        console.log('[LocalAI] Including conversation summary');
      }
    }

    // 3. Inject conversation history (recent messages)
    for (const msg of conversationHistory) {
      if (msg.role === 'user') {
        formattedPrompt += `<start_of_turn>user
${msg.text}<end_of_turn>
`;
      } else if (msg.role === 'ai') {
        formattedPrompt += `<start_of_turn>model
${msg.text}<end_of_turn>
`;
      }
      // Skip system messages (they're UI alerts, not part of conversation)
    }

    // 4. Append current user message
    formattedPrompt += `<start_of_turn>user
${prompt}<end_of_turn>
<start_of_turn>model
`;

    if (__DEV__) {
      const estimatedTokens = estimateTokens(formattedPrompt);
      console.log(`[LocalAI] Generating response with ${conversationHistory.length} history messages (~${estimatedTokens} tokens)...`);
    }

    // P1 fix: Re-check context before inference (could have been released due to memory pressure)
    if (!llamaContext) {
      throw new Error('Model context was released during initialization (likely due to memory pressure)');
    }

    // Run inference
    const result = await llamaContext.completion(
      {
        prompt: formattedPrompt,
        n_predict: maxTokens,
        temperature: 0.6,
        top_k: 40,
        top_p: 0.95,
        min_p: 0.05,
        penalty_repeat: 1.1,
        // Stop tokens
        stop: ['<end_of_turn>', '<start_of_turn>', '\n\n\n'],
      },
      (data) => {
        // STREAMING: Call token callback for real-time UI updates
        if (data.token && onTokenCallback) {
          onTokenCallback(data.token);
        }
      }
    );

    if (__DEV__) {
      console.log('[LocalAI] Response generated');
    }

    // Extract the response text
    const responseText = result.text.trim();

    // Clean up any remaining template artifacts
    const cleanedResponse = responseText
      .replace(/<end_of_turn>/g, '')
      .replace(/<start_of_turn>/g, '')
      .trim();

    return cleanedResponse || '...';

  } catch (error) {
    if (__DEV__) {
      console.error('[LocalAI] Generation error:', error);
    }

    // Check if error is due to missing model
    const errorMessage = error instanceof Error ? error.message : String(error);
    const isModelMissing = errorMessage.includes('Model not downloaded') || errorMessage.includes('does not exist');

    if (isModelMissing) {
      // Return flavor-appropriate "download model" message
      if (context === 'CLASSIFIED') return '[MODEL_NOT_FOUND] // Download AI model in Settings > AI > Performance Modes';
      if (context === 'DISCRETION') return 'AI model not found. Please download a model in Settings.';
      return 'shhh... download an AI model first (Settings > AI > Performance Modes) 🤫';
    }

    // Return generic flavor-appropriate error message
    if (context === 'CLASSIFIED') return '[INFERENCE FAILED]';
    if (context === 'DISCRETION') return 'Processing failed.';
    return 'shhh... something went wrong 🤫';
  }
}

/**
 * Generate response for games with custom system prompt and conversation history
 * Used by Interrogation and other games that need custom prompts
 */
export async function generateGameResponse(
  systemPrompt: string,
  conversationHistory: Array<{ role: 'user' | 'ai', text: string }>,
  userMessage: string,
  maxTokens: number = 150,
  onTokenCallback?: (token: string) => void // STREAMING: Optional callback for token-by-token updates
): Promise<string> {
  try {
    // Get active model from store
    let { activeMode } = useChatStore.getState();

    // Ensure model is initialized
    if (!llamaContext || currentModel !== activeMode) {
      await initializeModel(activeMode);

      // Re-read activeMode after initialization (user may have switched during init)
      const currentState = useChatStore.getState();
      if (currentState.activeMode !== activeMode) {
        if (__DEV__) {
          console.log(`[LocalAI] Mode switched during game init (${activeMode} → ${currentState.activeMode}), reinitializing`);
        }
        activeMode = currentState.activeMode;
        await initializeModel(activeMode);
      }
    }

    if (!llamaContext) {
      throw new Error('Model not initialized');
    }

    // Build conversation context
    let conversationContext = '';
    for (const msg of conversationHistory) {
      if (msg.role === 'user') {
        conversationContext += `<start_of_turn>user\n${msg.text}<end_of_turn>\n`;
      } else {
        conversationContext += `<start_of_turn>model\n${msg.text}<end_of_turn>\n`;
      }
    }

    // Format prompt with system, history, and new user message
    const formattedPrompt = `<start_of_turn>system
${systemPrompt}<end_of_turn>
${conversationContext}<start_of_turn>user
${userMessage}<end_of_turn>
<start_of_turn>model
`;

    if (__DEV__) {
      console.log('[LocalAI] Generating game response...');
    }

    // Run inference
    const result = await llamaContext.completion(
      {
        prompt: formattedPrompt,
        n_predict: maxTokens,
        temperature: 0.7, // Slightly higher for game variety
        top_k: 40,
        top_p: 0.95,
        min_p: 0.05,
        penalty_repeat: 1.1,
        stop: ['<end_of_turn>', '<start_of_turn>', '\n\n\n'],
      },
      (data) => {
        // STREAMING: Call token callback for real-time UI updates
        if (data.token && onTokenCallback) {
          onTokenCallback(data.token);
        }
      }
    );

    if (__DEV__) {
      console.log('[LocalAI] Game response generated');
    }

    // Extract and clean response
    const responseText = result.text.trim();
    const cleanedResponse = responseText
      .replace(/<end_of_turn>/g, '')
      .replace(/<start_of_turn>/g, '')
      .trim();

    return cleanedResponse || '[CONNECTION SEVERED]';

  } catch (error) {
    if (__DEV__) {
      console.error('[LocalAI] Game generation error:', error);
    }
    return '[CONNECTION SEVERED]';
  }
}

/**
 * Release model resources when app closes or switches modes
 */
export async function releaseModel(): Promise<void> {
  if (llamaContext) {
    await releaseAllLlama();
    llamaContext = null;
    currentModel = null;

    // Cleanup memory monitoring when explicitly releasing
    cleanupMemoryMonitoring();

    if (__DEV__) {
      console.log('[LocalAI] Model released');
    }
  }
}

/**
 * Check which models are downloaded and update store state
 * Should be called on app startup
 */
export async function syncDownloadedModels(): Promise<void> {
  try {
    const modes: PerformanceMode[] = ['efficient', 'balanced', 'quality'];
    const store = useChatStore.getState();

    for (const mode of modes) {
      const fileExists = await isModelDownloaded(mode);
      const currentState = store.modeDownloadState[mode];

      // Sync state with actual file existence
      if (fileExists && currentState !== 'downloaded') {
        // File exists but state says not downloaded → mark as downloaded
        store.completeModeDownload(mode);
        if (__DEV__) {
          console.log(`[LocalAI] Synced ${mode}: marked as downloaded`);
        }
      } else if (!fileExists && currentState === 'downloaded') {
        // File missing but state says downloaded → reset to not_downloaded
        useChatStore.setState((state) => ({
          modeDownloadState: {
            ...state.modeDownloadState,
            [mode]: 'not_downloaded',
          },
        }));
        if (__DEV__) {
          console.log(`[LocalAI] Synced ${mode}: file missing, reset to not_downloaded`);
        }
      }
    }

    if (__DEV__) {
      console.log('[LocalAI] Synced downloaded models');
    }
  } catch (error) {
    if (__DEV__) {
      console.error('[LocalAI] Sync failed:', error);
    }
  }
}

/**
 * Preload/warm up the model on app start
 */
export async function warmUpModel(): Promise<void> {
  try {
    const { activeMode } = useChatStore.getState();
    await initializeModel(activeMode);

    // Run a quick dummy inference to warm up the model
    if (llamaContext) {
      await llamaContext.completion({
        prompt: '<start_of_turn>system\nYou are a helpful assistant.<end_of_turn>\n<start_of_turn>user\nHi<end_of_turn>\n<start_of_turn>model\n',
        n_predict: 5,
        temperature: 0.6,
      });

      if (__DEV__) {
        console.log('[LocalAI] Model warmed up successfully');
      }
    }
  } catch (error) {
    if (__DEV__) {
      console.error('[LocalAI] Warm-up failed:', error);
    }
    // Don't throw - warm-up failure is non-critical
  }
}
