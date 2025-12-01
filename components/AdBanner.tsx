import React, { useEffect, useState, useRef } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

export const AdBanner: React.FC = () => {
  const [adConfig, setAdConfig] = useState<{ desktopScript: string, mobileScript: string }>({
      desktopScript: "", 
      mobileScript: ""
  });
  const containerRef = useRef<HTMLDivElement>(null);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  useEffect(() => {
    const fetchAdConfig = async () => {
        try {
            const docRef = doc(db, 'content', 'adsterra_config');
            const snap = await getDoc(docRef);
            if (snap.exists()) {
                setAdConfig(snap.data() as any);
            }
        } catch (e) {
            console.error("Failed to load ad config");
        }
    };
    fetchAdConfig();

    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = windowWidth < 768;
  const currentScript = isMobile ? adConfig.mobileScript : adConfig.desktopScript;
  const width = isMobile ? 300 : 728;
  const height = isMobile ? 250 : 90;

  if (!currentScript) return null;

  // We use an iframe to isolate the Adsterra script execution
  // This prevents document.write from breaking React
  const srcDoc = `
    <html>
        <head>
            <style>
                body { margin:0; padding:0; display:flex; justify-content:center; align-items:center; overflow:hidden; background-color:transparent; }
            </style>
        </head>
        <body>
            ${currentScript}
        </body>
    </html>
  `;

  return (
    <div className="w-full my-8 flex justify-center overflow-hidden" ref={containerRef}>
        <div 
            className="bg-slate-50 dark:bg-slate-800 text-center relative rounded-lg overflow-hidden flex items-center justify-center border border-slate-100 dark:border-slate-700 shadow-sm"
            style={{ width: `${width}px`, height: `${height}px`, minWidth: `${width}px`, minHeight: `${height}px` }}
        >
             <div className="absolute top-0 right-0 bg-slate-200 dark:bg-slate-700 text-[8px] text-slate-500 px-1 z-20 rounded-bl">AD</div>
             <iframe 
                srcDoc={srcDoc}
                width={width}
                height={height}
                scrolling="no"
                frameBorder="0"
                sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                style={{ border: 'none', overflow: 'hidden' }}
                title="Advertisement"
             />
        </div>
    </div>
  );
};