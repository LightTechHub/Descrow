import React from 'react';

const Loader = ({ fullscreen }) => {
  return (
    <div
      style={{
        position: fullscreen ? 'fixed' : 'relative',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: fullscreen ? '#ffffff' : 'transparent',
        zIndex: 9999
      }}
    >
      <div className="spinner" />
      <style>{`
        .spinner {
          width: 48px;
          height: 48px;
          border: 4px solid #e5e7eb;
          border-top-color: #1e40af;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default Loader;