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