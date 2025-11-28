
import React from 'react';

export const Logo: React.FC<{ className?: string }> = ({ className = 'h-24 w-24' }) => (
  <svg viewBox="0 0 200 200" className={className} xmlns="http://www.w3.org/2000/svg">
    <defs>
      <path id="topTextPath" d="M 25, 100 a 75,75 0 1,1 150,0" />
      <path id="bottomTextPath" d="M 22, 100 a 78,78 0 0,0 156,0" />
      <path id="innerBannerPath" d="M 50, 140 Q 100, 160 150, 140" />
    </defs>
    
    {/* Outer Ring Background */}
    <circle cx="100" cy="100" r="98" fill="white" stroke="#311b92" strokeWidth="4" />
    <circle cx="100" cy="100" r="82" fill="none" stroke="#311b92" strokeWidth="2" />

    {/* Top Text: FINANCE STUDENTS' ASSOCIATION */}
    <text fontSize="14" fontWeight="900" fill="#311b92" letterSpacing="1" textAnchor="middle">
      <textPath href="#topTextPath" startOffset="50%">
        FINANCE STUDENTS' ASSOCIATION
      </textPath>
    </text>

    {/* Bottom Text: MOTTO */}
    <text fontSize="10" fontWeight="bold" fill="#311b92" letterSpacing="0.5" textAnchor="middle">
      <textPath href="#bottomTextPath" startOffset="50%">
        MOTTO: BREEDING FINANCIAL EXPERTS
      </textPath>
    </text>

    {/* Red dots separating text */}
    <circle cx="28" cy="100" r="3" fill="#f43f5e" />
    <circle cx="172" cy="100" r="3" fill="#f43f5e" />

    {/* Inner Shield Area */}
    <circle cx="100" cy="100" r="65" fill="#311b92" />

    {/* Quadrants */}
    <path d="M 100,35 L 100,165" stroke="white" strokeWidth="2" />
    <path d="M 35,100 L 165,100" stroke="white" strokeWidth="2" />

    {/* Top Left: Purple bg, Red # */}
    <path d="M 35,100 A 65,65 0 0,1 100,35 L 100,100 Z" fill="#311b92" />
    <text x="65" y="85" fontSize="30" fill="#f43f5e" fontWeight="bold" textAnchor="middle">#</text>

    {/* Top Right: White bg, Red £ */}
    <path d="M 100,35 A 65,65 0 0,1 165,100 L 100,100 Z" fill="white" />
    <text x="135" y="85" fontSize="30" fill="#f43f5e" fontWeight="bold" textAnchor="middle">£</text>

    {/* Bottom Left: White bg, Red $ */}
    <path d="M 35,100 L 100,100 L 100,165 A 65,65 0 0,1 35,100 Z" fill="white" />
    <text x="65" y="145" fontSize="30" fill="#f43f5e" fontWeight="bold" textAnchor="middle">$</text>

    {/* Bottom Right: Purple bg, Red ¥ */}
    <path d="M 100,100 L 165,100 A 65,65 0 0,1 100,165 Z" fill="#311b92" />
    <text x="135" y="145" fontSize="30" fill="#f43f5e" fontWeight="bold" textAnchor="middle">¥</text>
    
    {/* AAUA CHAPTER Bannerish Text */}
    <g transform="translate(0, 15)">
       <path id="curve" d="M 60,135 Q 100,155 140,135" fill="none" />
       <text width="200" textAnchor="middle">
          <textPath xlinkHref="#curve" startOffset="50%" fontSize="10" fontWeight="bold" fill="#311b92">
            AAUA CHAPTER
          </textPath>
        </text>
    </g>
  </svg>
);
