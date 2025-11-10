import './polyfills.js';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { PrivyProvider } from '@privy-io/react-auth';
import { privyConfig } from './config/privyConfig';
import App from './App';
import './index.css';

// Simple error boundary
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('App Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', color: 'white', backgroundColor: '#1a1a1a' }}>
          <h1>Something went wrong</h1>
          <p>{this.state.error?.message}</p>
        </div>
      );
    }
    return this.props.children;
  }
}

// Main app with conditional Privy support
function MainApp() {
  const isPrivyEnabled = import.meta.env.VITE_ENABLE_PRIVY === 'true';
  const privyAppId = import.meta.env.VITE_PRIVY_APP_ID;
  
  // If Privy is enabled and configured
  if (isPrivyEnabled && privyAppId) {
    return (
      <PrivyProvider appId={privyAppId} config={privyConfig}>
        <Router>
          <App />
        </Router>
      </PrivyProvider>
    );
  }
  
  // Fallback to standard mode
  return (
    <Router>
      <App />
    </Router>
  );
}

// Render app
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <HelmetProvider>
        <MainApp />
      </HelmetProvider>
    </ErrorBoundary>
  </React.StrictMode>
);