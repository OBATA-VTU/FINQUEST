
import React, { useEffect } from 'react';
import { useSettings } from '../contexts/SettingsContext';

export const SEOMetadataUpdater: React.FC = () => {
  const settings = useSettings();
  const logoSrc = settings?.logoUrl;

  useEffect(() => {
    if (logoSrc) {
      // Update favicon
      const favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
      if (favicon && favicon.href !== logoSrc) {
        favicon.href = logoSrc;
      }
      
      // Update Open Graph image
      const ogImage = document.querySelector<HTMLMetaElement>('meta[property="og:image"]');
      if (ogImage && ogImage.content !== logoSrc) {
        ogImage.content = logoSrc;
      }
      
      // Update Twitter image
      const twitterImage = document.querySelector<HTMLMetaElement>('meta[property="twitter:image"]');
      if (twitterImage && twitterImage.content !== logoSrc) {
        twitterImage.content = logoSrc;
      }
    }
  }, [logoSrc]);

  return null; // This component doesn't render anything
};
