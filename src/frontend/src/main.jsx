// Import minimal Buffer polyfill first
import './polyfills.js';

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { PrivyProvider } from '@privy-io/react-auth';
import { privyConfig } from './config/privy';
import App from './App';
import './index.css';

// Buffer polyfill loaded from ./polyfills.js

// Error boundary to catch rendering errors
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', color: 'red' }}>
          <h1>Something went wrong!</h1>
          <pre>{this.state.error?.toString()}</pre>
          <pre>{this.state.error?.stack}</pre>
        </div>
      );
    }

    return this.props.children;
  }
}

// Conditionally wrap with Privy
const AppWithProviders = () => {
  const appContent = (
    <Router>
      <App />
    </Router>
  );
  
  // Only use Privy if configured
  if (privyConfig.appId && import.meta.env.VITE_ENABLE_PRIVY === 'true') {
    return (
      <PrivyProvider
        appId={privyConfig.appId}
        config={privyConfig.config}
      >
        {appContent}
      </PrivyProvider>
    );
  }
  
  return appContent;
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <HelmetProvider>
        <AppWithProviders />
      </HelmetProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
