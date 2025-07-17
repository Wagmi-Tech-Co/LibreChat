import { useState, useCallback, useRef } from 'react';

interface MCPLoadingState {
  serverName: string;
  toolName: string;
  timestamp: number;
  isError?: boolean;
  errorMessage?: string;
}

interface MCPLoadingManager {
  loadingStates: Map<string, MCPLoadingState>;
  startLoading: (toolKey: string, serverName: string, toolName: string) => void;
  stopLoading: (toolKey: string, isError?: boolean, errorMessage?: string) => void;
  isLoading: (toolKey: string) => boolean;
  getLoadingState: (toolKey: string) => MCPLoadingState | undefined;
  clearAll: () => void;
}

export default function useMCPLoading(): MCPLoadingManager {
  const [loadingStates, setLoadingStates] = useState<Map<string, MCPLoadingState>>(new Map());
  const timeoutRefs = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const startLoading = useCallback((toolKey: string, serverName: string, toolName: string) => {
    setLoadingStates((prev) => {
      const newStates = new Map(prev);
      newStates.set(toolKey, {
        serverName,
        toolName,
        timestamp: Date.now(),
      });
      return newStates;
    });

    // Set up timeout for long-running requests
    const timeoutId = setTimeout(() => {
      setLoadingStates((prev) => {
        const newStates = new Map(prev);
        const currentState = newStates.get(toolKey);
        if (currentState) {
          newStates.set(toolKey, {
            ...currentState,
            isError: true,
            errorMessage: 'Request timeout',
          });
        }
        return newStates;
      });
    }, 60000); // 60 second timeout

    timeoutRefs.current.set(toolKey, timeoutId);
  }, []);

  const stopLoading = useCallback((toolKey: string, isError = false, errorMessage?: string) => {
    // Clear timeout
    const timeoutId = timeoutRefs.current.get(toolKey);
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutRefs.current.delete(toolKey);
    }

    setLoadingStates((prev) => {
      const newStates = new Map(prev);
      if (isError) {
        const currentState = newStates.get(toolKey);
        if (currentState) {
          newStates.set(toolKey, {
            ...currentState,
            isError: true,
            errorMessage: errorMessage || 'Request failed',
          });
          // Remove error state after 3 seconds
          setTimeout(() => {
            setLoadingStates((prev) => {
              const newStates = new Map(prev);
              newStates.delete(toolKey);
              return newStates;
            });
          }, 3000);
        }
      } else {
        newStates.delete(toolKey);
      }
      return newStates;
    });
  }, []);

  const isLoading = useCallback((toolKey: string) => {
    const state = loadingStates.get(toolKey);
    return state !== undefined && !state.isError;
  }, [loadingStates]);

  const getLoadingState = useCallback((toolKey: string) => {
    return loadingStates.get(toolKey);
  }, [loadingStates]);

  const clearAll = useCallback(() => {
    // Clear all timeouts
    timeoutRefs.current.forEach((timeoutId) => {
      clearTimeout(timeoutId);
    });
    timeoutRefs.current.clear();

    setLoadingStates(new Map());
  }, []);

  return {
    loadingStates,
    startLoading,
    stopLoading,
    isLoading,
    getLoadingState,
    clearAll,
  };
}