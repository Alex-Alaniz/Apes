import React from 'react';

function TestApp() {
  return (
    <div style={{ padding: '20px', backgroundColor: '#1a1a1a', color: 'white', minHeight: '100vh' }}>
      <h1>Test App is Working!</h1>
      <p>If you see this, React is rendering correctly.</p>
      <p>Current time: {new Date().toLocaleString()}</p>
      <div style={{ marginTop: '20px', padding: '20px', border: '1px solid #666' }}>
        <h2>Debug Info:</h2>
        <ul>
          <li>React version: {React.version}</li>
          <li>Window location: {window.location.href}</li>
          <li>User agent: {navigator.userAgent}</li>
        </ul>
      </div>
    </div>
  );
}

export default TestApp; 