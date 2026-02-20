import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { AlertCircle } from 'lucide-react';

interface MiniAppRendererProps {
  code: string;
  name: string;
}

export default function MiniAppRenderer({ code, name }: MiniAppRendererProps) {
  const [error, setError] = useState<string | null>(null);
  const [Component, setComponent] = useState<React.FC | null>(null);

  useEffect(() => {
    setError(null);
    try {
      // Create sandboxed component from code string
      const fn = new Function(
        'React', 'useState', 'useEffect', 'useCallback', 'useMemo', 'useRef',
        `"use strict";
        ${code}
        if (typeof App !== 'undefined') return App;
        if (typeof Component !== 'undefined') return Component;
        if (typeof MiniApp !== 'undefined') return MiniApp;
        throw new Error('No component found. Define App, Component, or MiniApp.');`
      );

      const timeout = setTimeout(() => setError('Execution timeout'), 5000);
      const comp = fn(React, useState, useEffect, useCallback, useMemo, useRef);
      clearTimeout(timeout);

      if (typeof comp !== 'function') {
        setError('Component must be a function');
        return;
      }

      setComponent(() => comp);
    } catch (e: any) {
      setError(e.message);
    }
  }, [code]);

  if (error) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-4 text-xs font-mono">
        <AlertCircle size={24} className="text-destructive mb-2" />
        <p className="text-destructive font-display text-[10px] tracking-wider uppercase mb-1">Render Error</p>
        <p className="text-muted-foreground text-center max-w-xs">{error}</p>
      </div>
    );
  }

  if (!Component) {
    return <div className="h-full flex items-center justify-center text-muted-foreground text-xs">Loading {name}...</div>;
  }

  return (
    <ErrorBoundary name={name}>
      <div className="h-full overflow-auto">
        <Component />
      </div>
    </ErrorBoundary>
  );
}

class ErrorBoundary extends React.Component<
  { children: React.ReactNode; name: string },
  { error: string | null }
> {
  state = { error: null as string | null };

  static getDerivedStateFromError(error: Error) {
    return { error: error.message };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="h-full flex flex-col items-center justify-center p-4 text-xs font-mono">
          <AlertCircle size={24} className="text-destructive mb-2" />
          <p className="text-destructive font-display text-[10px] tracking-wider uppercase mb-1">
            {this.props.name} crashed
          </p>
          <p className="text-muted-foreground text-center max-w-xs">{this.state.error}</p>
        </div>
      );
    }
    return this.props.children;
  }
}
