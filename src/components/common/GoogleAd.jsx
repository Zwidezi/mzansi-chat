import React, { useEffect } from 'react';

/**
 * MzansiChat Google AdSense Component
 * This component is designed for Single Page Application (SPA) safety.
 * It manually triggers context-aware ad rendering to avoid display issues during React navigation.
 */
const GoogleAd = ({ slot, format = 'auto', responsive = 'true', style = {} }) => {
  useEffect(() => {
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (e) {
      console.warn("AdSense failed to push:", e);
    }
  }, []);

  return (
    <div className="ad-container" style={{ margin: '20px 0', overflow: 'hidden', ...style }}>
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client="ca-pub-7221081519011749"
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive={responsive}
      />
    </div>
  );
};

export default GoogleAd;
