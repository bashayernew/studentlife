import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles/tailwind.css';
import App from './App';

const container = document.getElementById('root');
if (!container) {
  document.body.innerHTML = '<div style="padding: 2rem; font-family: sans-serif;">Root element #root not found.</div>';
} else {
  const root = createRoot(container);
  try {
    root.render(<App />);
  } catch (err) {
    console.error('App mount error:', err);
    container.innerHTML = `<div style="padding: 2rem; font-family: sans-serif; color: #0d1b2a;"><p><strong>Something went wrong</strong></p><p>${err?.message || String(err)}</p><p>Check the browser console for details.</p></div>`;
  }
}