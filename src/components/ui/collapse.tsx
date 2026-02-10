'use client';

import * as React from 'react';
import { ChevronDown } from 'lucide-react';

interface CollapseProps {
  children: React.ReactNode;
  className?: string;
  defaultOpen?: boolean;
}

export function Collapse({ children, className = '', defaultOpen = false }: CollapseProps) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);

  return (
    <div className={`border rounded-lg overflow-hidden ${className}`}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50 transition-colors"
      >
        <span className="text-sm font-medium">
          {isOpen ? 'Hide' : 'Show'} Resources
        </span>
        <ChevronDown
          className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </div>
      {isOpen && (
        <div className="p-3 pt-0 border-t bg-muted/20">
          {children}
        </div>
      )}
    </div>
  );
}
