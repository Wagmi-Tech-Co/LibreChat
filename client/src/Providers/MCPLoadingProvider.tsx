import React, { createContext, useContext, ReactNode } from 'react';
import useMCPLoading from '~/hooks/Messages/useMCPLoading';

interface MCPLoadingState {
  serverName: string;
  toolName: string;
  timestamp: number;
  isError?: boolean;
  errorMessage?: string;
}

interface MCPLoadingContextType {
  loadingStates: Map<string, MCPLoadingState>;
  startLoading: (toolKey: string, serverName: string, toolName: string) => void;
  stopLoading: (toolKey: string, isError?: boolean, errorMessage?: string) => void;
  isLoading: (toolKey: string) => boolean;
  getLoadingState: (toolKey: string) => MCPLoadingState | undefined;
  clearAll: () => void;
}

const MCPLoadingContext = createContext<MCPLoadingContextType | undefined>(undefined);

export const useMCPLoadingContext = () => {
  const context = useContext(MCPLoadingContext);
  if (!context) {
    throw new Error('useMCPLoadingContext must be used within MCPLoadingProvider');
  }
  return context;
};

// Safe hook that doesn't throw error when provider is not available
export const useMCPLoadingContextSafe = () => {
  const context = useContext(MCPLoadingContext);
  
  // Provide default implementation when context is not available (e.g., in shared conversations)
  if (!context) {
    return {
      loadingStates: new Map<string, MCPLoadingState>(),
      startLoading: () => {}, // No-op for shared conversations
      stopLoading: () => {}, // No-op for shared conversations
      isLoading: () => false, // Always return false in shared conversations
      getLoadingState: () => undefined, // No state available in shared conversations
      clearAll: () => {}, // No-op for shared conversations
    };
  }
  
  return context;
};

interface MCPLoadingProviderProps {
  children: ReactNode;
}

export const MCPLoadingProvider: React.FC<MCPLoadingProviderProps> = ({ children }) => {
  const mcpLoading = useMCPLoading();

  return (
    <MCPLoadingContext.Provider value={mcpLoading}>
      {children}
    </MCPLoadingContext.Provider>
  );
};