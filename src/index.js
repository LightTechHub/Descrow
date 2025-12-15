// File: src/index.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { Toaster } from 'react-hot-toast';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { UserProvider } from './context/UserContext';
import App from './App';
import './index.css';
import './i18n'; // Initialize translations

const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId="93715735-ch7proqtrq07jj1u3d12iunpsuhggjk1.apps.googleusercontent.com">
      <HelmetProvider>
        <BrowserRouter>
          <UserProvider>
            <App />

            {/* ✅ Global Toast Notifications */}
            <Toaster
              position="top-center"
              reverseOrder={false}
              toastOptions={{
                style: {
                  background: '#1e293b',
                  color: '#fff',
                  borderRadius: '8px',
                  padding: '10px 16px',
                  fontSize: '0.95rem',
                },
                success: {
                  iconTheme: {
                    primary: '#22c55e',
                    secondary: '#1e293b',
                  },
                },
                error: {
                  iconTheme: {
                    primary: '#ef4444',
                    secondary: '#1e293b',
                  },
                },
              }}
            />
          </UserProvider>
        </BrowserRouter>
      </HelmetProvider>
    </GoogleOAuthProvider>
  </React.StrictMode>
);