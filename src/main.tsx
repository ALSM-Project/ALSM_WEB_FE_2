import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './app/App';
import './index.css';
import { apiClient } from './services/api/apiClient';
import { tokenStore } from './services/api/tokenStore';

apiClient.setAuthFailureHandler(() => {
  tokenStore.clear();
  const loginUrl = import.meta.env.VITE_USER_PORTAL_URL || 'http://localhost:5173';
  if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/auth')) {
    window.location.href = `${loginUrl}/login`;
  }
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
