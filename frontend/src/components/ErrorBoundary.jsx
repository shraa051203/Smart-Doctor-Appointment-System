import { Component } from 'react';
import Alert from './Alert';

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('UI error:', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="mx-auto max-w-lg px-4 py-16">
          <Alert type="error">
            <p className="font-semibold">Something broke</p>
            <p className="mt-1 text-sm opacity-90">
              Try refreshing the page. If this keeps happening, contact support.
            </p>
            <button
              type="button"
              className="mt-3 rounded-lg bg-red-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-800"
              onClick={() => window.location.reload()}
            >
              Reload page
            </button>
          </Alert>
        </div>
      );
    }
    return this.props.children;
  }
}
