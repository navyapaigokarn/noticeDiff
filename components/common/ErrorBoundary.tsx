import { Component, type ReactNode } from 'react';

interface State {
  failed: boolean;
}

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  override state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  override render(): ReactNode {
    if (this.state.failed) {
      return (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          This screen ran into a problem. Reload NoticeDiff and try again.
        </div>
      );
    }
    return this.props.children;
  }
}
