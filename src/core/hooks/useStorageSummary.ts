import { useState, useEffect } from 'react';
import * as FileSystem from 'expo-file-system/legacy';
import { getModelStorageUsed, formatBytes } from '../utils/deviceCapabilities';

export interface StorageSummary {
  modelsUsedBytes: number;
  modelsUsedFormatted: string;
  deviceFreeBytes: number;
  deviceFreeFormatted: string;
  deviceTotalBytes: number;
  deviceTotalFormatted: string;
  percentUsed: number;
  loading: boolean;
}

/**
 * Custom hook to fetch and format storage information
 *
 * Provides real-time storage data for both downloaded models and device storage.
 *
 * @returns Storage summary with formatted values
 *
 * @example
 * function PerformanceModesScreen() {
 *   const storage = useStorageSummary();
 *
 *   if (storage.loading) {
 *     return <Text>Loading storage info...</Text>;
 *   }
 *
 *   return (
 *     <View>
 *       <Text>AI Models: {storage.modelsUsedFormatted}</Text>
 *       <Text>Device Free: {storage.deviceFreeFormatted}</Text>
 *     </View>
 *   );
 * }
 */
export function useStorageSummary(): StorageSummary {
  const [summary, setSummary] = useState<StorageSummary>({
    modelsUsedBytes: 0,
    modelsUsedFormatted: '0 GB',
    deviceFreeBytes: 0,
    deviceFreeFormatted: '0 GB',
    deviceTotalBytes: 0,
    deviceTotalFormatted: '0 GB',
    percentUsed: 0,
    loading: true,
  });

  useEffect(() => {
    async function loadStorage() {
      try {
        const modelsUsed = await getModelStorageUsed();
        const deviceFree = await FileSystem.getFreeDiskStorageAsync();
        const deviceTotal = await FileSystem.getTotalDiskCapacityAsync();

        setSummary({
          modelsUsedBytes: modelsUsed,
          modelsUsedFormatted: formatBytes(modelsUsed),
          deviceFreeBytes: deviceFree,
          deviceFreeFormatted: formatBytes(deviceFree),
          deviceTotalBytes: deviceTotal,
          deviceTotalFormatted: formatBytes(deviceTotal),
          percentUsed: deviceTotal > 0 ? ((deviceTotal - deviceFree) / deviceTotal) * 100 : 0,
          loading: false,
        });
      } catch (error) {
        if (__DEV__) {
          console.error('Failed to load storage info:', error);
        }

        // Set error state with zeros
        setSummary({
          modelsUsedBytes: 0,
          modelsUsedFormatted: '0 GB',
          deviceFreeBytes: 0,
          deviceFreeFormatted: '0 GB',
          deviceTotalBytes: 0,
          deviceTotalFormatted: '0 GB',
          percentUsed: 0,
          loading: false,
        });
      }
    }

    loadStorage();
  }, []);

  return summary;
}
