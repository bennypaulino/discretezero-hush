import type { PerformanceMode } from '../state/rootStore';

/**
 * Mock model download service for Expo Go testing
 *
 * Simulates downloads with realistic progress updates
 * Will be replaced with real ModelDownloadService in EAS build
 */

export interface ModeInfo {
  id: PerformanceMode;
  displayName: string;
  sizeGB: number;
  sizeBytes: number;
  contextMessages: number;
  speed: string;
  quality: string;
  description: string;
}

export const MODE_REGISTRY: Record<PerformanceMode, ModeInfo> = {
  efficient: {
    id: 'efficient',
    displayName: 'Efficient Mode',
    sizeGB: 1.7,
    sizeBytes: 1.7 * 1024 * 1024 * 1024,
    contextMessages: 20,
    speed: '★★★☆☆',
    quality: '★★★☆☆',
    description: 'Fast responses, works everywhere',
  },
  balanced: {
    id: 'balanced',
    displayName: 'Balanced Mode',
    sizeGB: 2,
    sizeBytes: 2 * 1024 * 1024 * 1024,
    contextMessages: 50,
    speed: '★★★★☆',
    quality: '★★★★☆',
    description: 'Superior performance, optimal for iPhone 13+',
  },
  quality: {
    id: 'quality',
    displayName: 'Quality Mode',
    sizeGB: 6,
    sizeBytes: 6 * 1024 * 1024 * 1024,
    contextMessages: 100,
    speed: '★★☆☆☆',
    quality: '★★★★★',
    description: 'Maximum intelligence, iPhone 15 Pro+ only',
  },
};

class MockModelDownloadService {
  private downloadIntervals: Map<PerformanceMode, NodeJS.Timeout> = new Map();

  /**
   * Start a mock download with realistic progress
   * Updates progress every 500ms with 0-8% increments
   */
  async startDownload(
    mode: PerformanceMode,
    onProgress: (progress: number) => void,
    onComplete: () => void,
  ): Promise<void> {
    let progress = 0;
    const interval = setInterval(() => {
      // Simulate variable download speed
      progress += Math.random() * 8; // 0-8% per tick

      if (progress >= 100) {
        progress = 100;
        onProgress(100);
        clearInterval(interval);
        this.downloadIntervals.delete(mode);

        // Brief delay before calling onComplete
        setTimeout(onComplete, 500);
      } else {
        onProgress(Math.floor(progress));
      }
    }, 500); // Update every 500ms

    this.downloadIntervals.set(mode, interval);
  }

  /**
   * Cancel an in-progress download
   */
  cancelDownload(mode: PerformanceMode): void {
    const interval = this.downloadIntervals.get(mode);
    if (interval) {
      clearInterval(interval);
      this.downloadIntervals.delete(mode);
    }
  }

  /**
   * Get info about a mode
   */
  getModeInfo(mode: PerformanceMode): ModeInfo {
    return MODE_REGISTRY[mode];
  }

  /**
   * Check if a download is in progress
   */
  isDownloading(mode: PerformanceMode): boolean {
    return this.downloadIntervals.has(mode);
  }
}

// Singleton instance
export const mockDownloadService = new MockModelDownloadService();
