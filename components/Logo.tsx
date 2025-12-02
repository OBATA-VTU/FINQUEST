import React from 'react';

export const Logo: React.FC<{ className?: string }> = ({ className = 'h-24 w-24' }) => (
  <svg viewBox="0 0 512 512" className={className} xmlns="http://www.w3.org/2000/svg">
    <defs>
      <path id="txtTop" d="M 70,256 A 186,186 0 1,1 442,256" />
      <path id="txtBot" d="M 90,256 A 166,166 0 0,0 422,256" />
      <path id="bannerPath" d="M 120,440 Q 256,480 392,440" />
    </defs>

    {/* Background Circle (White) */}
    <circle cx="256" cy="256" r="240" fill="white" stroke="#311b92" strokeWidth="12" />
    
    {/* Inner Circle Border */}
    <circle cx="256" cy="256" r="170" fill="none" stroke="#311b92" strokeWidth="6" />

    {/* Quadrants */}
    <g clipPath="url(#innerClip)">
      <defs><clipPath id="innerClip"><circle cx="256" cy="256" r="167" /></clipPath></defs>
      
      {/* Top Left (Blue) */}
      <rect x="0" y="0" width="256" height="256" fill="#311b92" />
      {/* Top Right (White) */}
      <rect x="256" y="0" width="256" height="256" fill="white" />
      {/* Bottom Left (White) */}
      <rect x="0" y="256" width="256" height="256" fill="white" />
      {/* Bottom Right (Blue) */}
      <rect x="256" y="256" width="256" height="256" fill="#311b92" />
    </g>
    
    {/* Dividers */}
    <line x1="256" y1="89" x2="256" y2="423" stroke="white" strokeWidth="6" />
    <line x1="89" y1="256" x2="423" y2="256" stroke="white" strokeWidth="6" />

    {/* Symbols */}
    <text x="170" y="190" fontFamily="serif" fontWeight="bold" fontSize="90" fill="#f43f5e" textAnchor="middle">#</text>
    <text x="342" y="190" fontFamily="serif" fontWeight="bold" fontSize="90" fill="#f43f5e" textAnchor="middle">£</text>
    <text x="170" y="360" fontFamily="serif" fontWeight="bold" fontSize="90" fill="#f43f5e" textAnchor="middle">$</text>
    <text x="342" y="360" fontFamily="serif" fontWeight="bold" fontSize="90" fill="#f43f5e" textAnchor="middle">¥</text>

    {/* Ring Text */}
    <text fontFamily="sans-serif" fontWeight="900" fontSize="30" fill="#311b92" letterSpacing="1">
      <textPath href="#txtTop" startOffset="50%" textAnchor="middle">FINANCE STUDENTS' ASSOCIATION</textPath>
    </text>
    
    <text fontFamily="sans-serif" fontWeight="bold" fontSize="34" fill="#311b92" letterSpacing="3">
      <textPath href="#txtBot" startOffset="50%" textAnchor="middle">AAUA CHAPTER</textPath>
    </text>

    {/* Red Dots */}
    <circle cx="45" cy="256" r="12" fill="#f43f5e" />
    <circle cx="467" cy="256" r="12" fill="#f43f5e" />

    {/* Banner/Motto */}
    <path d="M 100,430 Q 256,470 412,430 L 392,470 Q 256,510 120,470 Z" fill="white" stroke="#311b92" strokeWidth="3" />
    <text fontFamily="sans-serif" fontWeight="bold" fontSize="16" fill="#311b92" letterSpacing="1">
       <textPath href="#bannerPath" startOffset="50%" textAnchor="middle">MOTTO: BREEDING FINANCIAL EXPERTS</textPath>
    </text>
  </svg>
);