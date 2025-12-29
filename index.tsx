
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';

console.log("Neon Lane: [1] Script execution started.");

// Global error handler for early-boot failures
window.onerror = (message, source, lineno, colno, error) => {
  console.error("Neon Lane: [CRITICAL ERROR]", { message, source, lineno, colno, error });
  const root = document.getElementById('root');
  if (root) {
      root.innerHTML = `
        <div style="color: #ff0044; padding: 40px; font-family: 'Orbitron', sans-serif; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; background: #050505; color: white;">
          <h2 style="font-size: 1.5rem; letter-spacing: 0.1em; color: #ff0044; margin-bottom: 10px;">BOOT FAILURE</h2>
          <div style="width: 50px; height: 2px; background: #ff0044; margin-bottom: 20px;"></div>
          <p style="font-size: 0.8rem; opacity: 0.8; max-width: 400px; line-height: 1.5; font-family: 'Rajdhani', sans-serif;">
            The application failed to initialize. This is often caused by incorrect MIME types on static hosts like GitHub Pages.
          </p>
          <p style="font-size: 0.7rem; color: #ff0044; margin-top: 10px; font-family: monospace;">${message}</p>
          <button onclick="location.reload()" style="margin-top: 30px; background: transparent; border: 1px solid #ffffff44; color: white; padding: 10px 20px; font-family: 'Orbitron'; font-size: 0.8rem; cursor: pointer;">RETRY_BOOT</button>
        </div>`;
  }
};

const mount = () => {
  console.log("Neon Lane: [2] Attempting to mount React root...");
  const rootElement = document.getElementById('root');

  if (!rootElement) {
    console.error("Neon Lane: [ERROR] Root element not found.");
    return;
  }

  try {
    const root = createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
    console.log("Neon Lane: [3] Render called successfully.");
  } catch (err) {
    console.error("Neon Lane: [ERROR] React Render failed", err);
    rootElement.innerHTML = `<div style="color: red; padding: 20px; text-align: center;">Mount Error: ${err instanceof Error ? err.message : 'Unknown'}</div>`;
  }
};

// Check if document is already loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mount);
} else {
  mount();
}
