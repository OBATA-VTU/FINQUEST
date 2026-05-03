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

interface SiteSettings {
  session: string;
  showExecutives: boolean;
  uploadService: string;
  driveFolderId?: string;
}

interface SettingsContextType {
    socialLinks: SocialLinks;
    siteSettings: SiteSettings;
}

export const SettingsContext = createContext<SettingsContextType | null>(null);

export const SettingsProvider: React.FC<{children: ReactNode}> = ({ children }) => {
    const [socialLinks, setSocialLinks] = useState<SocialLinks>({ facebook: 'https://facebook.com/groups/8173545352661193/', twitter: 'https://x.com/FINSA_AAUA', instagram: '', whatsapp: 'https://whatsapp.com/channel/0029VbC0FW23QxS7OqFNcP0q', telegram: '', tiktok: '' });
    const [siteSettings, setSiteSettings] = useState<SiteSettings>({ session: '2025/2026', showExecutives: true, uploadService: 'firebase' });

    useEffect(() => {
        const socialUnsub = onSnapshot(doc(db, 'content', 'social_links'), (doc) => {
             if (doc.exists()) {
                setSocialLinks(prev => ({ ...prev, ...doc.data() }));
            }
        });

        const settingsUnsub = onSnapshot(doc(db, 'content', 'site_settings'), (doc) => {
            if (doc.exists()) {
                const data = doc.data();
                setSiteSettings(prev => ({
                    ...prev,
                    session: data.session || '2025/2026',
                    showExecutives: data.showExecutives !== undefined ? data.showExecutives : true,
                    uploadService: data.uploadService || 'firebase',
                    driveFolderId: data.driveFolderId || ''
                }));
            }
        });

        return () => {
            socialUnsub();
            settingsUnsub();
        };
    }, []);

    const value = { socialLinks, siteSettings };
    return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
};

export const useSettings = () => {
    const context = useContext(SettingsContext);
    if (!context) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
};