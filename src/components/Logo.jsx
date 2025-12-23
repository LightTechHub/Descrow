// src/components/Logo.jsx
import React from 'react';
import { Shield } from 'lucide-react';

const Logo = ({ size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  };

  return (
    <div className={`relative ${className}`}>
      {/* Try to load logo image */}
      <img 
        src="/logo.png" 
        alt="Dealcross Logo" 
        className={`${sizeClasses[size]} object-contain`}
        onError={(e) => {
          // Hide image and show fallback
          e.target.style.display = 'none';
          e.target.nextElementSibling.style.display = 'block';
        }}
      />
      
      {/* Fallback Shield icon */}
      <div 
        className={`${sizeClasses[size]} text-blue-600 dark:text-blue-400`}
        style={{ display: 'none' }}
      >
        <Shield className="w-full h-full" />
      </div>
    </div>
  );
};

export default Logo;