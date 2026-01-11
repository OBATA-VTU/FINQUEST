import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { db } from '../firebase';
import { doc, onSnapshot } from 'firebase/firestore';

interface SocialLinks {
  facebook: string;
  twitter: string;
  instagram: string;
  whatsapp: string;
  telegram: string;
  tiktok: string;
}

interface SettingsContextType {
    logoUrl: string;
    socialLinks: SocialLinks;
}

export const SettingsContext = createContext<SettingsContextType | null>(null);

export const SettingsProvider: React.FC<{children: ReactNode}> = ({ children }) => {
    const [logoUrl, setLogoUrl] = useState('/logo.svg');
    const [socialLinks, setSocialLinks] = useState<SocialLinks>({ facebook: 'https://facebook.com/groups/8173545352661193/', twitter: 'https://x.com/FINSA_AAUA', instagram: '', whatsapp: 'https://whatsapp.com/channel/0029VbC0FW23QxS7OqFNcP0q', telegram: '', tiktok: '' });

    useEffect(() => {
        const settingsUnsub = onSnapshot(doc(db, 'content', 'site_settings'), (doc) => {
            if (doc.exists()) {
                setLogoUrl(doc.data().logoUrl || '/logo.svg');
            }
        });
        const socialUnsub = onSnapshot(doc(db, 'content', 'social_links'), (doc) => {
             if (doc.exists()) {
                // Merge fetched data over defaults to prevent missing fields from breaking the app
                setSocialLinks(prev => ({ ...prev, ...doc.data() }));
            }
        });
        return () => {
            settingsUnsub();
            socialUnsub();
        };
    }, []);

    const value = { logoUrl, socialLinks };
    return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
};

export const useSettings = () => {
    const context = useContext(SettingsContext);
    if (!context) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
};
