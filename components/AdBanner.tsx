import React, { useEffect, useState, useRef } from 'react';

// HARDCODED ADSTERRA SCRIPTS - PERMANENT CONFIGURATION
const DESKTOP_SCRIPT = `
<script type="text/javascript">
	atOptions = {
		'key' : '9078612da20b1ce9585fe7ae6da13c7d',
		'format' : 'iframe',
		'height' : 90,
		'width' : 728,
		'params' : {}
	};
</script>
<script type="text/javascript" src="//www.highperformanceformat.com/9078612da20b1ce9585fe7ae6da13c7d/invoke.js"></script>
`;

const MOBILE_SCRIPT = `
<script type="text/javascript">
	atOptions = {
		'key' : 'b5ca8bfdd2704d183e51010a99639ff8',
		'format' : 'iframe',
		'height' : 250,
		'width' : 300,
		'params' : {}
	};
</script>
<script type="text/javascript" src="//www.highperformanceformat.com/b5ca8bfdd2704d183e51010a99639ff8/invoke.js"></script>
`;

export const AdBanner: React.FC = () => {
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = windowWidth < 768;
  const currentScript = isMobile ? MOBILE_SCRIPT : DESKTOP_SCRIPT;
  const width = isMobile ? 300 : 728;
  const height = isMobile ? 250 : 90;

  // Optimized srcDoc without full HTML boilerplate to reduce parsing issues
  const srcDoc = `
    <html>
      <body style="margin:0;padding:0;display:flex;justify-content:center;align-items:center;height:100%;overflow:hidden;">
        ${currentScript}
      </body>
    </html>
  `;

  return (
    <div className="w-full my-8 flex justify-center items-center overflow-hidden">
        <div 
            className="bg-slate-50 dark:bg-slate-800 text-center relative rounded-lg overflow-hidden flex items-center justify-center border border-slate-100 dark:border-slate-700 shadow-sm"
            style={{ width: `${width}px`, height: `${height}px`, minWidth: `${width}px`, minHeight: `${height}px` }}
        >
             {/* Fallback Text if Ad doesn't load immediately */}
             <div className="absolute inset-0 flex items-center justify-center z-0 text-xs text-slate-300 dark:text-slate-600 font-bold uppercase tracking-widest">
                Ad Space
             </div>
             
             <div className="absolute top-0 right-0 bg-slate-200 dark:bg-slate-700 text-[8px] text-slate-500 px-1 z-20 rounded-bl pointer-events-none">AD</div>
             
             <iframe 
                key={isMobile ? 'mobile' : 'desktop'} // Force re-render on breakpoint switch
                srcDoc={srcDoc}
                width={width}
                height={height}
                scrolling="no"
                frameBorder="0"
                sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                className="relative z-10"
                style={{ border: 'none', overflow: 'hidden' }}
                title="Advertisement"
             />
        </div>
    </div>
  );
};