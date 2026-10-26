import React from 'react';
import { brandConfig } from '../config/brand';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  showSubtitle?: boolean;
  className?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 'md',
  showText = true,
  showSubtitle = true,
  className = '',
}) => {
  const sizeMap = {
    sm: { icon: 28, text: 'text-base', sub: 'text-[9px]' },
    md: { icon: 36, text: 'text-lg', sub: 'text-[10px]' },
    lg: { icon: 44, text: 'text-2xl', sub: 'text-xs' },
    xl: { icon: 56, text: 'text-3xl', sub: 'text-xs' },
  };

  const current = sizeMap[size];

  return (
    <div className={`inline-flex items-center space-x-2.5 ${className}`}>
      {/* Precision Geometric Quality & Verification SVG Emblem */}
      <div className="relative shrink-0 flex items-center justify-center">
        <svg
          width={current.icon}
          height={current.icon}
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="filter drop-shadow-md transition-transform hover:scale-105 duration-200"
        >
          <defs>
            {/* Primary Blue to Teal Gradient */}
            <linearGradient id="qmsBrandGrad" x1="4" y1="4" x2="60" y2="60" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#2563EB" />
              <stop offset="100%" stopColor="#0D9488" />
            </linearGradient>
            {/* Accent Highlight */}
            <linearGradient id="qmsAccentGrad" x1="16" y1="12" x2="48" y2="52" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#60A5FA" />
              <stop offset="100%" stopColor="#2DD4BF" />
            </linearGradient>
            {/* Subtle Inner Glow */}
            <radialGradient id="qmsGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#0F172A" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Outer Hexagonal Shield Frame */}
          <polygon
            points="32,4 58,18 58,46 32,60 6,46 6,18"
            fill="url(#qmsBrandGrad)"
            stroke="#1E293B"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />

          {/* Inner Geometric Shield Facet */}
          <polygon
            points="32,10 52,21 52,43 32,54 12,43 12,21"
            fill="#0B1220"
            stroke="url(#qmsAccentGrad)"
            strokeWidth="1.2"
            strokeLinejoin="round"
          />

          {/* Central Radial Light */}
          <circle cx="32" cy="32" r="16" fill="url(#qmsGlow)" />

          {/* Interlocking Q & Precision Verification Checkmark */}
          {/* Circular Q body */}
          <path
            d="M32 18 C24.268 18 18 24.268 18 32 C18 39.732 24.268 46 32 46 C35.48 46 38.65 44.73 41.1 42.6 L46.5 48 C47.33 48.83 48.67 48.83 49.5 48 C50.33 47.17 50.33 45.83 49.5 45 L44.3 39.8 C45.38 37.5 46 34.85 46 32 C46 24.268 39.732 18 32 18 Z"
            fill="none"
            stroke="url(#qmsAccentGrad)"
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Active Verification Checkmark inside the Q */}
          <path
            d="M26 31.5 L30.5 36 L39 26.5"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="3.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* Typography */}
      {showText && (
        <div className="flex flex-col">
          <div className="flex items-center space-x-1 leading-none">
            <span className={`font-black tracking-tight text-slate-900 dark:text-slate-100 ${current.text}`}>
              Smart<span className="text-blue-600 dark:text-blue-500">QMS</span>
            </span>
          </div>
          {showSubtitle && (
            <span
              className={`font-semibold tracking-wider text-slate-500 dark:text-slate-400 uppercase mt-0.5 ${current.sub}`}
            >
              {brandConfig.productSuite}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
