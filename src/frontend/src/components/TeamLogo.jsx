import React, { useState } from 'react';

// Fallback team logos using reliable CDN sources
const FALLBACK_LOGOS = {
  'Team Vitality': 'https://upload.wikimedia.org/wikipedia/en/thumb/b/b1/Team_Vitality_2023_full_logo.svg/1200px-Team_Vitality_2023_full_logo.svg.png',
  'G2 Esports': 'https://upload.wikimedia.org/wikipedia/en/thumb/1/12/Esports_organization_G2_Esports_logo.svg/1200px-Esports_organization_G2_Esports_logo.svg.png',
  'Natus Vincere': 'https://upload.wikimedia.org/wikipedia/en/thumb/a/ac/NaVi_logo.svg/1200px-NaVi_logo.svg.png',
  'FaZe Clan': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4d/Faze_Clan.svg/1200px-Faze_Clan.svg.png',
  'Team Liquid': 'https://upload.wikimedia.org/wikipedia/en/thumb/f/f1/Team_Liquid_logo_2020.svg/1200px-Team_Liquid_logo_2020.svg.png',
  'Astralis': 'https://upload.wikimedia.org/wikipedia/en/thumb/7/7d/Astralis_logo.svg/1200px-Astralis_logo.svg.png',
  'MOUZ': 'https://upload.wikimedia.org/wikipedia/en/thumb/5/55/MOUZ_logo.svg/1200px-MOUZ_logo.svg.png',
  'Team Spirit': 'https://upload.wikimedia.org/wikipedia/en/thumb/a/a0/Team_Spirit_logo.svg/1200px-Team_Spirit_logo.svg.png',
  'HEROIC': 'https://images.prismic.io/rivalryglhf/ff1c5b8e-3b09-4baf-9a5f-b391b4d9e2f8_Heroic.png?auto=compress,format',
  'TYLOO': 'https://liquipedia.net/commons/images/thumb/3/32/TYLOO_2020_logo.png/600px-TYLOO_2020_logo.png',
  'Team Falcons': 'https://images.prismic.io/rivalryglhf/5eb1a84f-6246-415c-afc1-ed0bdcc2fb2a_Team+Falcons.png?auto=compress,format',
  'The MongolZ': 'https://liquipedia.net/commons/images/thumb/9/91/The_MongolZ_logo.png/600px-The_MongolZ_logo.png',
  'Aurora Gaming': 'https://liquipedia.net/commons/images/thumb/d/d9/Aurora_Gaming_2024_allmode.png/600px-Aurora_Gaming_2024_allmode.png',
  'GamerLegion': 'https://liquipedia.net/commons/images/thumb/3/3e/GamerLegion_2023_logo.png/600px-GamerLegion_2023_logo.png',
  '3DMAX': 'https://liquipedia.net/commons/images/thumb/c/cf/3DMAX_2024_logo.png/600px-3DMAX_2024_logo.png',
  'Virtus.Pro': 'https://upload.wikimedia.org/wikipedia/en/thumb/f/f8/Virtus.pro_logo_2023.svg/1200px-Virtus.pro_logo_2023.svg.png'
};

// Generic CS2 logo for unknown teams
const GENERIC_CS2_LOGO = 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f9/Counter-Strike_2_logo.svg/1200px-Counter-Strike_2_logo.svg.png';

const TeamLogo = ({ team, logoUrl, size = 'w-16 h-16' }) => {
  const [imageError, setImageError] = useState(false);
  const [loading, setLoading] = useState(true);

  const handleImageError = () => {
    setImageError(true);
    setLoading(false);
  };

  const handleImageLoad = () => {
    setLoading(false);
  };

  // Determine which logo to use
  const getLogoSrc = () => {
    if (!imageError && logoUrl) {
      return logoUrl;
    }
    return FALLBACK_LOGOS[team] || GENERIC_CS2_LOGO;
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