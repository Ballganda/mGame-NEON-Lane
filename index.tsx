
console.log("Neon Lane: [PHASE 1] Script loaded - Checking dependencies...");

import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';

console.log("Neon Lane: [PHASE 2] Imports resolved - Version v0.0.123");

// Global error handler for early-boot failures
window.onerror = (message, source, lineno, colno, error) => {
  console.error("Neon Lane: [CRITICAL] Global Error", { message, source, lineno, colno, error });
  const root = document.getElementById('root');
  if (root) {
      root.innerHTML = `<div style="color: #ff0044; padding: 40px; font-family: 'Orbitron', sans-serif; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%;">
        <h2 style="font-size: 1.5rem; letter-spacing: 0.1em; color: white; margin-bottom: 10px;">SYSTEM FAILURE</h2>
        <div style="width: 50px; height: 2px; background: #ff0044; margin-bottom: 20px;"></div>
        <p style="font-size: 0.7rem; opacity: 0.7; max-width: 300px; line-height: 1.5; font-family: 'Rajdhani', sans-serif;">${message}</p>
        <button onclick="location.reload()" style="margin-top: 30px; background: transparent; border: 1px solid #ffffff44; color: white; padding: 10px 20px; font-family: 'Orbitron'; font-size: 0.8rem; cursor: pointer; transition: all 0.2s;">RETRY_BOOT</button>
      </div>`;
  }
};

const init = () => {
  console.log("Neon Lane: [PHASE 3] Initializing React mount...");
  const rootElement = document.getElementById('root');

  if (!rootElement) {
    console.error("Neon Lane: [CRITICAL] Root element not found");
    return;
  }

  try {
    const root = createRoot(rootElement);
    root.render(<App />);
    console.log("Neon Lane: [PHASE 4] Render call complete");
  } catch (err) {
    console.error("Neon Lane: [CRITICAL] React Mount Failed", err);
    rootElement.innerHTML = `<div style="color: red; padding: 20px; font-family: sans-serif; text-align: center;">
      Mount Error: ${err instanceof Error ? err.message : 'Unknown'}<br/>
      Check browser console for details.
    </div>`;
  }
};

// Start initialization
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
