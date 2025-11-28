
import React from 'react';

export const AdBanner: React.FC = () => {
  return (
    <div className="w-full my-8 flex justify-center">
      <div className="w-full max-w-4xl bg-slate-100 border border-slate-200 rounded-lg p-2 overflow-hidden flex flex-col items-center justify-center min-h-[120px] relative">
         <div className="absolute top-2 right-2 text-[10px] text-slate-400 uppercase tracking-widest border border-slate-200 px-1 rounded">Ad</div>
         <p className="text-sm text-slate-400 font-medium">Google AdSense Space</p>
         <p className="text-xs text-slate-300 mt-1">Responsive Display Ad</p>

         {/* 
            === GOOGLE ADSENSE INTEGRATION ===
            
            1. Create an Ad Unit in your Google AdSense Dashboard.
            2. Replace the code below with your specific ad script.
            
            Example Code:
            <ins className="adsbygoogle"
                style={{ display: 'block' }}
                data-ad-client="ca-pub-XXXXXXXXXXXXXXXX"  // Your Publisher ID
                data-ad-slot="XXXXXXXXXX"                 // Your Ad Slot ID
                data-ad-format="auto"
                data-full-width-responsive="true"></ins>
            <script>
                (adsbygoogle = window.adsbygoogle || []).push({});
            </script>
         */}
      </div>
    </div>
  );
};
