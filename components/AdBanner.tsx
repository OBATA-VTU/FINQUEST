
import React, { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

export const AdBanner: React.FC = () => {
  // Default to the provided ID so ads work immediately for approval reviews
  const [adConfig, setAdConfig] = useState<{ client: string, slot: string }>({
      client: "ca-pub-8962985509315843",
      slot: "" // Slot can be auto or specific if configured later
  });

  useEffect(() => {
    const fetchAdConfig = async () => {
        try {
            const docRef = doc(db, 'content', 'adsense_config');
            const snap = await getDoc(docRef);
            if (snap.exists()) {
                const data = snap.data() as any;
                // Only override if admin has explicitly set a different client ID
                if (data.client) {
                    setAdConfig(data);
                }
            }
        } catch (e) {
            console.error("Failed to load ad config");
        }
    };
    fetchAdConfig();
  }, []);

  return (
    <div className="w-full my-8 flex justify-center overflow-hidden">
        {/* Google AdSense Container */}
        <div className="w-full max-w-4xl min-h-[100px] bg-slate-50 text-center relative">
             <div className="text-[10px] text-slate-300 uppercase tracking-widest mb-1 absolute -top-4 left-1/2 -translate-x-1/2">Advertisement</div>
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