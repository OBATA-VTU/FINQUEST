
import React, { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

export const AdBanner: React.FC = () => {
  const [adConfig, setAdConfig] = useState<{ client: string, slot: string } | null>(null);

  useEffect(() => {
    const fetchAdConfig = async () => {
        try {
            const docRef = doc(db, 'content', 'adsense_config');
            const snap = await getDoc(docRef);
            if (snap.exists()) {
                setAdConfig(snap.data() as any);
            }
        } catch (e) {
            console.error("Failed to load ad config");
        }
    };
    fetchAdConfig();
  }, []);

  if (!adConfig?.client) {
      // Placeholder if no config is set in Admin Panel
      return (
        <div className="w-full my-8 flex justify-center">
        <div className="w-full max-w-4xl bg-slate-50 border border-slate-200 rounded-lg p-4 flex flex-col items-center justify-center min-h-[120px] relative">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-widest border border-slate-200 px-2 py-0.5 rounded mb-2">Advertisement</span>
            <p className="text-slate-400 font-medium text-sm">Space Available</p>
            <p className="text-xs text-slate-300">Contact Admin to advertise here</p>
        </div>
        </div>
      );
  }

  return (
    <div className="w-full my-8 flex justify-center overflow-hidden">
        {/* Google AdSense Container */}
        <div className="w-full max-w-4xl min-h-[100px] bg-slate-50 text-center">
             <ins className="adsbygoogle"
                style={{ display: 'block' }}
                data-ad-client={adConfig.client}
                data-ad-slot={adConfig.slot || "auto"}
                data-ad-format="auto"
                data-full-width-responsive="true"></ins>
            <script>
                (adsbygoogle = window.adsbygoogle || []).push({});
            </script>
        </div>
    </div>
  );
};
