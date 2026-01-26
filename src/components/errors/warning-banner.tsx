'use client';

import { AlertTriangle, Info, X, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useState, useEffect } from 'react';

export interface WarningMessage {
  id: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  suggestions?: string[];
  duration?: number;
  requireDismissal?: boolean;
}

interface WarningBannerProps {
  warning: WarningMessage;
  onDismiss?: (id: string) => void;
  onAction?: () => void;
  actionLabel?: string;
}

export function WarningBanner({ warning, onDismiss, onAction, actionLabel }: WarningBannerProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (warning.duration && !warning.requireDismissal) {
      const timer = setTimeout(() => {
        handleDismiss();
      }, warning.duration);

      return () => clearTimeout(timer);
    }
  }, [warning.duration, warning.requireDismissal]);

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(() => {
      onDismiss?.(warning.id);
    }, 200); // Wait for animation
  };

  if (!isVisible) return null;

  const severityConfig = {
    info: {
      icon: Info,
      variant: 'default' as const,
      iconColor: 'text-blue-500',
      bgColor: 'bg-blue-50 dark:bg-blue-950/20',
      borderColor: 'border-blue-200 dark:border-blue-900/30',
    },
    warning: {
      icon: AlertTriangle,
      variant: 'default' as const,
      iconColor: 'text-yellow-500',
      bgColor: 'bg-yellow-50 dark:bg-yellow-950/20',
      borderColor: 'border-yellow-200 dark:border-yellow-900/30',
    },
    critical: {
      icon: AlertTriangle,
      variant: 'destructive' as const,
      iconColor: 'text-red-500',
      bgColor: 'bg-red-50 dark:bg-red-950/20',
      borderColor: 'border-red-200 dark:border-red-900/30',
    },
  };

  const config = severityConfig[warning.severity];
  const Icon = config.icon;

  return (
    <Alert
      className={`relative transition-all duration-200 ${config.bgColor} ${config.borderColor} border`}
      variant={config.variant}
    >
      <Icon className={`h-4 w-4 ${config.iconColor}`} />
      <AlertTitle className="flex items-center gap-2">
        {warning.title}
        <span className={`text-xs px-2 py-0.5 rounded-full ${
          warning.severity === 'critical' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
          warning.severity === 'warning' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
          'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
        }`}>
          {warning.severity.toUpperCase()}
        </span>
      </AlertTitle>
      <AlertDescription className="mt-2">
        <p className="text-sm mb-3">{warning.message}</p>

        {warning.suggestions && warning.suggestions.length > 0 && (
          <div className="space-y-2 mt-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
              <Lightbulb className="h-3 w-3" />
              SUGGESTIONS:
            </div>
            <ul className="space-y-1 ml-5">
              {warning.suggestions.map((suggestion, index) => (
                <li key={index} className="text-sm list-disc marker:text-muted-foreground">
                  {suggestion}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/50">
          <div className="flex gap-2">
            {onAction && actionLabel && (
              <Button size="sm" variant="outline" onClick={onAction}>
                {actionLabel}
              </Button>
            )}
          </div>
          {onDismiss && (
            <Button
              size="sm"
              variant="ghost"
              className="h-8 px-2"
              onClick={handleDismiss}
            >
              <X className="h-4 w-4 mr-1" />
              Dismiss
            </Button>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
}

interface WarningBannerContainerProps {
  warnings: WarningMessage[];
  onDismiss?: (id: string) => void;
  className?: string;
}

export function WarningBannerContainer({ warnings, onDismiss, className }: WarningBannerContainerProps) {
  if (warnings.length === 0) return null;

  return (
    <div className={`space-y-3 ${className}`}>
      {warnings.map((warning) => (
        <WarningBanner
          key={warning.id}
          warning={warning}
          onDismiss={onDismiss}
        />
      ))}
    </div>
  );
}
