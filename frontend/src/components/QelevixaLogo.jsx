import React from 'react'

export default function QelevixaLogo({ size = 32, className = "", showSparkle = true }) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 100 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={`qelevixa-logo-svg ${className}`}
      style={{ verticalAlign: 'middle', overflow: 'visible', flexShrink: 0 }}
      aria-label="QELEVIXA Logo"
    >
      <defs>
        {/* Main Brand Gradient: Purple -> Royal Blue -> Pink */}
        <linearGradient id="qelGradient" x1="10" y1="10" x2="90" y2="90" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#7c3aed" />
          <stop offset="55%" stopColor="#2563eb" />
          <stop offset="100%" stopColor="#ec4899" />
        </linearGradient>

        <linearGradient id="qelHeartGradient" x1="35" y1="32" x2="65" y2="58" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ec4899" />
          <stop offset="100%" stopColor="#f43f5e" />
        </linearGradient>

        <linearGradient id="qelSparkleGradient" x1="0" y1="0" x2="16" y2="16" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#818cf8" />
        </linearGradient>

        <filter id="qelGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Outer Shield / Protective Circle (Safety & Protection) */}
      <path
        d="M 50,8 
           C 74,8 88,18 88,44 
           C 88,66 70,84 50,92 
           C 30,84 12,66 12,44 
           C 12,18 26,8 50,8 Z"
        fill="url(#qelGradient)"
        opacity="0.14"
      />
      <path
        d="M 50,8 
           C 74,8 88,18 88,44 
           C 88,66 70,84 50,92 
           C 30,84 12,66 12,44 
           C 12,18 26,8 50,8 Z"
        stroke="url(#qelGradient)"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Stylized 'Q' Emblem Body (Qelevixa) */}
      <path
        d="M 50,23 
           C 37,23 27,33 27,47 
           C 27,61 37,71 50,71 
           C 55.5,71 60.5,68.5 64,64 
           L 73,73 
           C 74.5,74.5 77,73.5 76.5,71.5 
           L 71,60 
           C 72.5,56 73,52 73,47 
           C 73,33 63,23 50,23 Z"
        stroke="url(#qelGradient)"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />

      {/* Stylized 'Q' Tail Glow */}
      <path
        d="M 59,59 L 74,74"
        stroke="#ec4899"
        strokeWidth="4.5"
        strokeLinecap="round"
      />

      {/* Heart (♥) Symbol (Love, Care, Positive Connection) */}
      <path
        d="M 50,55
           C 50,55 41,47.5 41,41
           C 41,36.5 44,33.5 48,35
           C 49,35.5 49.6,36.4 50,37.2
           C 50.4,36.4 51,35.5 52,35
           C 56,33.5 59,36.5 59,41
           C 59,47.5 50,55 50,55 Z"
        fill="url(#qelHeartGradient)"
      />

      {/* Small ✦ Sparkle (AI / Technology) */}
      {showSparkle && (
        <g transform="translate(71, 6)">
          <path
            d="M 7,0 
               C 7,3.8 10.8,7 14,7 
               C 10.8,7 7,10.8 7,14 
               C 7,10.8 3.2,7 0,7 
               C 3.2,7 7,3.8 7,0 Z"
            fill="url(#qelSparkleGradient)"
            filter="url(#qelGlow)"
          />
        </g>
      )}
    </svg>
  )
}
