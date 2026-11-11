// ==============================================================================
// LogiSphere AI — Custom Enterprise Loader Component
// Symmetrical match with App/src/components/Loader.tsx and App/src/theme/colors.ts
// Provides:
//   1. Modal overlay loader (<Loader show={boolean} text="Loading" />)
//   2. Inline card/section loader (<Loader inline text="Fetching records..." />)
//   3. Standalone React Native ActivityIndicator equivalent (<ActivityIndicator />)
//   4. App boot splash screen (<AppSplashScreen /> matching SplashScreen.tsx)
// ==============================================================================

import React from 'react';

export interface ActivityIndicatorProps {
  size?: 'small' | 'medium' | 'large' | number;
  color?: string;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * High-performance SVG ActivityIndicator replicating React Native's native spinner.
 * Features the signature LogiSphere amber (#F59E0B) arc with smooth GPU acceleration.
 */
export const ActivityIndicator: React.FC<ActivityIndicatorProps> = ({
  size = 'medium',
  color = '#F59E0B',
  className = '',
  style,
}) => {
  let dimension = 28;
  let strokeWidth = 3;

  if (typeof size === 'number') {
    dimension = size;
    strokeWidth = Math.max(2, Math.round(dimension / 9));
  } else if (size === 'small') {
    dimension = 18;
    strokeWidth = 2.5;
  } else if (size === 'large') {
    dimension = 40;
    strokeWidth = 3.5;
  }

  const radius = (dimension - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * 0.28;

  return (
    <div
      className={`logisphere-activity-indicator ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: dimension,
        height: dimension,
        flexShrink: 0,
        ...style,
      }}
      role="status"
      aria-label="Loading"
    >
      <svg
        width={dimension}
        height={dimension}
        viewBox={`0 0 ${dimension} ${dimension}`}
        style={{
          animation: 'logisphere-spin 0.85s cubic-bezier(0.4, 0.15, 0.2, 0.95) infinite',
          transformOrigin: 'center',
        }}
      >
        {/* Track circle (subtle background trace) */}
        <circle
          cx={dimension / 2}
          cy={dimension / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          opacity={0.18}
        />
        {/* Active spinning arc */}
        <circle
          cx={dimension / 2}
          cy={dimension / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
};

export interface LoaderProps {
  /** Whether the loader is visible */
  show?: boolean;
  /** Primary loading message (defaults to 'Loading') */
  text?: string;
  /** Secondary subtitle (e.g. 'Verifying GPS telemetry...') */
  subtext?: string;
  /** Render inline inside a container rather than full-page modal overlay */
  inline?: boolean;
  /** Spinner size */
  size?: 'small' | 'medium' | 'large' | number;
  /** Custom spinner accent color (defaults to amber #F59E0B) */
  color?: string;
  /** Custom style for the inner panel */
  panelStyle?: React.CSSProperties;
  /** Custom container style */
  style?: React.CSSProperties;
  /** Render compact layout (horizontal spinner + text) */
  compact?: boolean;
}

/**
 * LogiSphere AI Custom Loader
 * Directly equivalent to App/src/components/Loader.tsx:
 * - Floating raised panel with colors.surfaceRaised (#FFFFFF / #F9FAFB)
 * - Border colors.border (#E5E7EB)
 * - Amber spinner ActivityIndicator (color={colors.amber})
 * - Text color colors.textPrimary (#111827)
 */
export const Loader: React.FC<LoaderProps> = ({
  show = true,
  text = 'Loading',
  subtext,
  inline = false,
  size = 'medium',
  color = '#F59E0B',
  panelStyle,
  style,
  compact = false,
}) => {
  if (!show) return null;

  // Inline container loader (for cards, panels, tables)
  if (inline) {
    if (compact) {
      return (
        <div
          className="logisphere-loader-inline-compact"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.65rem',
            color: '#4B5563',
            fontSize: '0.85rem',
            fontWeight: 500,
            ...style,
          }}
        >
          <ActivityIndicator size={size === 'medium' ? 'small' : size} color={color} />
          {text && <span>{text}</span>}
        </div>
      );
    }

    return (
      <div
        className="logisphere-loader-inline"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2.5rem 1.5rem',
          gap: '0.85rem',
          width: '100%',
          ...style,
        }}
      >
        <ActivityIndicator size={size} color={color} />
        {text && (
          <div
            style={{
              color: '#111827',
              fontWeight: 600,
              fontSize: '0.9rem',
              textAlign: 'center',
            }}
          >
            {text}
          </div>
        )}
        {subtext && (
          <div
            style={{
              color: '#6B7280',
              fontSize: '0.78rem',
              textAlign: 'center',
              marginTop: '-0.35rem',
            }}
          >
            {subtext}
          </div>
        )}
      </div>
    );
  }

  // Modal Overlay Loader (matches App/src/components/Loader.tsx modal panel)
  return (
    <div
      className="logisphere-loader-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(17, 24, 39, 0.45)',
        backdropFilter: 'blur(3px)',
        WebkitBackdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '1rem',
        animation: 'logisphere-fade-in 0.18s ease-out',
        ...style,
      }}
      role="dialog"
      aria-modal="true"
      aria-label={text}
    >
      <div
        className="logisphere-loader-panel"
        style={{
          minWidth: 160,
          maxWidth: 320,
          background: '#FFFFFF',
          borderRadius: 14,
          padding: '1.4rem 1.75rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.85rem',
          border: '1px solid #E5E7EB',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
          animation: 'logisphere-scale-in 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          ...panelStyle,
        }}
      >
        <ActivityIndicator size={size === 'small' ? 'medium' : size} color={color} />
        {text && (
          <div
            style={{
              color: '#111827',
              fontWeight: 600,
              fontSize: '0.92rem',
              letterSpacing: '-0.01em',
              textAlign: 'center',
            }}
          >
            {text}
          </div>
        )}
        {subtext && (
          <div
            style={{
              color: '#6B7280',
              fontSize: '0.78rem',
              textAlign: 'center',
              marginTop: '-0.35rem',
              lineHeight: 1.4,
            }}
          >
            {subtext}
          </div>
        )}
      </div>
    </div>
  );
};

export interface AppSplashScreenProps {
  title?: string;
  subtitle?: string;
}

/**
 * App Boot Splash Screen
 * Exact equivalent to App/src/screens/SplashScreen.tsx:
 * - Logo image centered
 * - "LogiSphere AI" title with font-weight 900
 * - Amber activity indicator
 */
export const AppSplashScreen: React.FC<AppSplashScreenProps> = ({
  title = 'LogiSphere AI',
  subtitle = 'Intelligent Fleet & Logistics Management',
}) => {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: '#F3F4F6',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
        padding: '2rem',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          maxWidth: 420,
          animation: 'logisphere-fade-in 0.3s ease-out',
        }}
      >
        <img
          src="/logo.png"
          alt="LogiSphere AI"
          style={{
            width: 96,
            height: 96,
            objectFit: 'contain',
            marginBottom: '1.25rem',
            filter: 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.05))',
          }}
          onError={(e) => {
            // Graceful fallback if image unavailable
            (e.currentTarget as HTMLElement).style.display = 'none';
          }}
        />
        <h1
          style={{
            fontSize: '1.85rem',
            fontWeight: 900,
            color: '#111827',
            letterSpacing: '-0.03em',
            margin: '0 0 0.4rem 0',
          }}
        >
          {title}
        </h1>
        <p
          style={{
            fontSize: '0.88rem',
            color: '#6B7280',
            margin: '0 0 2rem 0',
            fontWeight: 500,
          }}
        >
          {subtitle}
        </p>

        <div style={{ marginTop: '0.5rem' }}>
          <ActivityIndicator size={36} color="#F59E0B" />
        </div>
      </div>
    </div>
  );
};

export default Loader;

