import React, { useState, useEffect } from 'react';

// Generic CS2 logo for unknown teams or fallback
const GENERIC_CS2_LOGO = 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f9/Counter-Strike_2_logo.svg/1200px-Counter-Strike_2_logo.svg.png';

const TeamLogo = ({ team, logoUrl, size = 'w-16 h-16' }) => {
  const [imageError, setImageError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [logoMapping, setLogoMapping] = useState({});

  // Load logo mapping from public folder
  useEffect(() => {
    fetch('/team-logos/logo-mapping.json')
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        setLogoMapping(data);
      })
      .catch(error => {
        console.warn('⚠️ Could not load logo mapping:', error);
        setLogoMapping({});
      });
  }, []);

  const handleImageError = () => {
    setImageError(true);
    setLoading(false);
  };

  const handleImageLoad = () => {
    setLoading(false);
  };

  // Determine which logo to use
  const getLogoSrc = () => {
    // First try local logo mapping
    if (logoMapping[team]) {
      return logoMapping[team];
    }
    
    // Then try provided URL if available and no previous error
    if (!imageError && logoUrl) {
      return logoUrl;
    }
    
    // Finally use generic CS2 logo
    return GENERIC_CS2_LOGO;
  };

  return (
    <div className={`${size} relative flex items-center justify-center`}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-400"></div>
        </div>
      )}
      <img
        src={getLogoSrc()}
        alt={team}
        onError={handleImageError}
        onLoad={handleImageLoad}
        className={`${size} object-contain ${loading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
      />
    </div>
  );
};

export default TeamLogo;