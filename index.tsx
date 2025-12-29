
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';

console.log("Neon Lane: Initializing Application...");

const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error("Neon Lane: Could not find root element to mount to");
  throw new Error("Could not find root element to mount to");
}

try {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
  console.log("Neon Lane: React Mount Successful");
} catch (error) {
  console.error("Neon Lane: Critical Mounting Error", error);
}
