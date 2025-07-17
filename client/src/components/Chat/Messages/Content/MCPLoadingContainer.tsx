import React from 'react';
import { useMCPLoadingContext } from '~/Providers/MCPLoadingProvider';
import MCPLoadingIndicator from './MCPLoadingIndicator';
import { Constants } from 'librechat-data-provider';

interface MCPLoadingContainerProps {
  className?: string;
}

export default function MCPLoadingContainer({ className = '' }: MCPLoadingContainerProps) {
  const { loadingStates } = useMCPLoadingContext();

  const activeStates = Array.from(loadingStates.entries());

  if (activeStates.length === 0) {
    return null;
  }

  return (
    <div className={`mcp-loading-container space-y-3 ${className}`}>
      {/* Header for multiple MCP operations */}
      {activeStates.length > 1 && (
        <div className="flex items-center gap-2 px-2 py-1">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-text-secondary font-medium">
              {activeStates.length} MCP operations running
            </span>
          </div>
        </div>
      )}

      {activeStates.map(([toolKey, state], index) => {
        const [toolName, serverName] = toolKey.split(Constants.mcp_delimiter);
        
        return (
          <div
            key={toolKey}
            className="animate-fade-in"
            style={{
              animation: `fadeIn 0.3s ease-in-out ${index * 0.1}s both`,
            }}
          >
            <MCPLoadingIndicator
              serverName={serverName}
              toolName={toolName}
              isVisible={true}
              isError={state.isError}
              errorMessage={state.errorMessage}
              className="last:mb-0"
            />
          </div>
        );
      })}
    </div>
  );
}