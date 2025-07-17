import { useMemo, useEffect, useState } from 'react';
import { Spinner } from '~/components';
import { AlertTriangle } from 'lucide-react';
import { cn } from '~/utils';

interface MCPLoadingIndicatorProps {
  serverName: string;
  toolName: string;
  isVisible: boolean;
  isError?: boolean;
  errorMessage?: string;
  className?: string;
}

export default function MCPLoadingIndicator({
  serverName,
  toolName,
  isVisible,
  isError = false,
  errorMessage = '',
  className = '',
}: MCPLoadingIndicatorProps) {
  const [pulseCount, setPulseCount] = useState(0);
  const [showTimeout, setShowTimeout] = useState(false);
  const [progress, setProgress] = useState(0);

  // Reset pulse count when visibility changes
  useEffect(() => {
    if (isVisible) {
      setPulseCount(0);
      setShowTimeout(false);
      setProgress(0);
    }
  }, [isVisible]);

  // Pulse animation counter
  useEffect(() => {
    if (!isVisible) return;

    const interval = setInterval(() => {
      setPulseCount((prev) => prev + 1);
    }, 800);

    return () => clearInterval(interval);
  }, [isVisible]);

  // Progress bar simulation
  useEffect(() => {
    if (!isVisible) return;

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) return prev + 0.5; // Slow down near end
        if (prev >= 70) return prev + 2;
        return prev + 5;
      });
    }, 200);

    return () => clearInterval(interval);
  }, [isVisible]);

  // Show timeout warning after 30 seconds
  useEffect(() => {
    if (!isVisible) return;

    const timeout = setTimeout(() => {
      setShowTimeout(true);
    }, 30000);

    return () => clearTimeout(timeout);
  }, [isVisible]);

  // Loading dots animation
  const loadingDots = useMemo(() => {
    const dots = '.'.repeat((pulseCount % 4) + 1);
    return dots;
  }, [pulseCount]);

  // Format tool name for display
  const formatToolName = (tool: string) => {
    return tool.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  if (!isVisible) return null;

  return (
    <div
      className={cn(
        'flex items-center gap-4 px-6 py-4 mx-4 rounded-xl border border-border-light bg-gradient-to-r from-surface-secondary/50 to-surface-secondary/30 text-sm shadow-sm',
        'transition-all duration-300 hover:shadow-md',
        isError && 'border-red-300 bg-gradient-to-r from-red-50/50 to-red-50/30',
        showTimeout && !isError && 'border-orange-300 bg-gradient-to-r from-orange-50/50 to-orange-50/30',
        className,
      )}
      style={{
        animation: isVisible ? 'fadeIn 0.3s ease-in-out' : undefined,
      }}
    >
      <div className="flex items-center gap-4 w-full">
        <div className="relative">
          {isError ? (
            <div className="flex items-center justify-center w-10 h-10 bg-red-100 rounded-full">
              <AlertTriangle
                className="text-red-500"
                size={18}
              />
            </div>
          ) : (
            <div className="relative flex items-center justify-center w-10 h-10 bg-blue-100 rounded-full">
              {/* Only show progress bar, no spinner */}
              <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-full"></div>
              </div>
            </div>
          )}
        </div>
        
        <div className="flex flex-col gap-2 min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <span className="text-text-primary font-semibold capitalize text-base">
              {serverName}
            </span>
            <span className="text-text-tertiary text-lg">•</span>
            <span className="text-text-secondary font-medium text-base">
              {formatToolName(toolName)}
            </span>
          </div>
          
          <div className="flex items-center gap-3">
            <span className="text-text-tertiary text-sm">
              {isError 
                ? (errorMessage || 'Request failed') 
                : showTimeout 
                ? 'Request taking longer than expected' 
                : 'Processing request'}
            </span>
            {!isError && (
              <span className="text-blue-600 text-sm font-mono min-w-[1.5rem]">
                {loadingDots}
              </span>
            )}
          </div>

          {/* Progress bar - single loading indicator */}
          {!isError && (
            <div className="w-full bg-surface-tertiary rounded-full h-2 mt-1">
              <div 
                className={cn(
                  'h-2 rounded-full transition-all duration-300',
                  showTimeout ? 'bg-orange-500' : 'bg-blue-500'
                )}
                style={{
                  width: `${Math.min(progress, 95)}%`,
                  transition: 'width 0.2s ease-out'
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}