
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';

console.log("Neon Lane: Booting v0.0.121...");

// Global error handler for early-boot failures
window.onerror = (message, source, lineno, colno, error) => {
  console.error("Neon Lane: Global Error Caught", { message, source, lineno, colno, error });
};

const rootElement = document.getElementById('root');

if (!rootElement) {
  const msg = "Neon Lane: Critical Error - Root element not found";
  console.error(msg);
  document.body.innerHTML = `<div style="color: red; padding: 20px; font-family: sans-serif;">${msg}</div>`;
} else {
  try {
    const root = ReactDOM.createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
    console.log("Neon Lane: Application Mounted Successfully");
  } catch (err) {
    console.error("Neon Lane: React Mount Failed", err);
    rootElement.innerHTML = `<div style="color: red; padding: 20px; font-family: sans-serif;">Mount Error: ${err instanceof Error ? err.message : 'Unknown'}</div>`;
  }
}
