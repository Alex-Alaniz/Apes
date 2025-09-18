import './polyfills.js';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { PrivyProvider } from '@privy-io/react-auth';
import App from './App';
import './index.css';

// Simple Privy config - NO EVM chains
const privyConfig = {
  appId: 'cmfmo7so5004ojz0bl03kuy1l',
  config: {
    appearance: {
      theme: 'dark',
      accentColor: '#FF6B6B',
      logo: '/primape/Asset 1@3x.png'
    },
    loginMethods: ['email', 'sms', 'google', 'twitter', 'discord', 'wallet']
  }
};

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

// Main app
function MainApp() {
  const isPrivyEnabled = import.meta.env.VITE_ENABLE_PRIVY === 'true';
  
  if (isPrivyEnabled) {
    return (
      <PrivyProvider appId={privyConfig.appId} config={privyConfig.config}>
        <Router>
          <App />
        </Router>
      </PrivyProvider>
    );
  }
  
  // Non-Privy mode
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