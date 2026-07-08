import React from 'react';
import { ErrorBoundary } from './ErrorBoundary';

export function withErrorBoundary<P extends object>(Screen: React.ComponentType<P>) {
  return function WrappedScreen(props: P) {
    return (
      <ErrorBoundary>
        <Screen {...props} />
      </ErrorBoundary>
    );
  };
}
