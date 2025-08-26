const fs = require('fs');
const https = require('https');
const http = require('http');
const path = require('path');
const { URL } = require('url');

// Team logos to download
const TEAM_LOGOS = {
  'team-vitality': {
    name: 'Team Vitality',
    urls: [
      'https://upload.wikimedia.org/wikipedia/en/thumb/b/b1/Team_Vitality_2023_full_logo.svg/1200px-Team_Vitality_2023_full_logo.svg.png',
      'https://img-cdn.hltv.org/teamlogo/GAlByJtDTnkgbb9p_71SUL.png?ixlib=java-2.1.0&s=c035b88342bc84c0b09e02e9cd3cd94e'
    ]
  },
  'g2-esports': {
    name: 'G2 Esports',
    urls: [
      'https://upload.wikimedia.org/wikipedia/en/thumb/1/12/Esports_organization_G2_Esports_logo.svg/1200px-Esports_organization_G2_Esports_logo.svg.png',
      'https://img-cdn.hltv.org/teamlogo/zFLwAELOD15BjJSDMMNBWQ.png?ixlib=java-2.1.0&s=b8c8a9b2e8b4c82a64f764f85ef53ae2'
    ]
  },
  'natus-vincere': {
    name: 'Natus Vincere',
    urls: [
      'https://upload.wikimedia.org/wikipedia/en/thumb/a/ac/NaVi_logo.svg/1200px-NaVi_logo.svg.png',
      'https://img-cdn.hltv.org/teamlogo/kixzGZIb9IYAAv-1vGrGev.svg?ixlib=java-2.1.0&s=f10dcb1e5a63dd67f38acfe8eb2f2b71'
    ]
  },
  'faze-clan': {
    name: 'FaZe Clan',
    urls: [
      'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4d/Faze_Clan.svg/1200px-Faze_Clan.svg.png',
      'https://img-cdn.hltv.org/teamlogo/SMhzsxzbvIBPOMh8QmFgdF.svg?ixlib=java-2.1.0&s=e6a9ce0345c7d703e5eaac14307f69aa'
    ]
  },
  'team-liquid': {
    name: 'Team Liquid',
    urls: [
      'https://upload.wikimedia.org/wikipedia/en/thumb/f/f1/Team_Liquid_logo_2020.svg/1200px-Team_Liquid_logo_2020.svg.png',
      'https://img-cdn.hltv.org/teamlogo/JMeLLbWKCIEJrmfPaqOz4O.svg?ixlib=java-2.1.0&s=c02caf90234d3a3ebac074c84ba1ea62'
    ]
  },
  'astralis': {
    name: 'Astralis',
    urls: [
      'https://upload.wikimedia.org/wikipedia/en/thumb/7/7d/Astralis_logo.svg/1200px-Astralis_logo.svg.png',
      'https://img-cdn.hltv.org/teamlogo/9bgXHp-oh1oaXr7F0mTGmd.svg?ixlib=java-2.1.0&s=f567161ab183001be33948b98c4b2067'
    ]
  },
  'mouz': {
    name: 'MOUZ',
    urls: [
      'https://upload.wikimedia.org/wikipedia/en/thumb/5/55/MOUZ_logo.svg/1200px-MOUZ_logo.svg.png',
      'https://img-cdn.hltv.org/teamlogo/Q66f3J5fgyaH6hFmJiSqUh.svg?ixlib=java-2.1.0&s=7968a66fb3f06034bb3e40e01a7513f5'
    ]
  },
  'team-spirit': {
    name: 'Team Spirit',
    urls: [
      'https://upload.wikimedia.org/wikipedia/en/thumb/a/a0/Team_Spirit_logo.svg/1200px-Team_Spirit_logo.svg.png',
      'https://img-cdn.hltv.org/teamlogo/H7wCYhzPP-K_oBm3ztvGnE.svg?ixlib=java-2.1.0&s=7a0fd63b4be70d93c7a7c30b8dd1b5d5'
    ]
  },
  'heroic': {
    name: 'HEROIC',
    urls: [
      'https://images.prismic.io/rivalryglhf/ff1c5b8e-3b09-4baf-9a5f-b391b4d9e2f8_Heroic.png?auto=compress,format',
      'https://img-cdn.hltv.org/teamlogo/ffSPDr6eSLRqWeMFgaOtHO.svg?ixlib=java-2.1.0&s=c5118da6cd189e506503cd1d04f1aacc'
    ]
  },
  'tyloo': {
    name: 'TYLOO',
    urls: [
      'https://liquipedia.net/commons/images/thumb/3/32/TYLOO_2020_logo.png/600px-TYLOO_2020_logo.png',
      'https://img-cdn.hltv.org/teamlogo/FvaYxlVl2wGOi7XJeF8qQz.png?ixlib=java-2.1.0&s=e0c9b44e48efb6b07fb481e7e1e5b7b1'
    ]
  },
  'team-falcons': {
    name: 'Team Falcons',
    urls: [
      'https://images.prismic.io/rivalryglhf/5eb1a84f-6246-415c-afc1-ed0bdcc2fb2a_Team+Falcons.png?auto=compress,format',
      'https://img-cdn.hltv.org/teamlogo/y1QzLLQGWZONJ2HtXe9DPQ.png?ixlib=java-2.1.0&s=d95bc6a5d77f43b528bc37aec7c76c64'
    ]
  },
  'the-mongolz': {
    name: 'The MongolZ',
    urls: [
      'https://liquipedia.net/commons/images/thumb/9/91/The_MongolZ_logo.png/600px-The_MongolZ_logo.png',
      'https://img-cdn.hltv.org/teamlogo/x7I0zzKBqZwKU1bJK-o3d1.png?ixlib=java-2.1.0&s=f0a8e956b6fa73b00e71edbdd3ba16ae'
    ]
  },
  'aurora-gaming': {
    name: 'Aurora Gaming',
    urls: [
      'https://liquipedia.net/commons/images/thumb/d/d9/Aurora_Gaming_2024_allmode.png/600px-Aurora_Gaming_2024_allmode.png',
      'https://img-cdn.hltv.org/teamlogo/EMZZ9E82bOvEP0RK4VhPdI.svg?ixlib=java-2.1.0&s=b9e04ab1b64b85ceb14f8a45b7b74fc6'
    ]
  },
  'gamerlegion': {
    name: 'GamerLegion',
    urls: [
      'https://liquipedia.net/commons/images/thumb/3/3e/GamerLegion_2023_logo.png/600px-GamerLegion_2023_logo.png',
      'https://img-cdn.hltv.org/teamlogo/LqSJ1u6g_6k1j3dn31O4I5.png?ixlib=java-2.1.0&s=1b7c53a8e7b5e14f5e5f37f5e3e4b6c3'
    ]
  },
  '3dmax': {
    name: '3DMAX',
    urls: [
      'https://liquipedia.net/commons/images/thumb/c/cf/3DMAX_2024_logo.png/600px-3DMAX_2024_logo.png',
      'https://img-cdn.hltv.org/teamlogo/FE8ZlGIOqS9p_UL8Ag2YKA.png?ixlib=java-2.1.0&s=f77e7c4d51c13ec8b1b59b0c4d6ae8f1'
    ]
  },
  'virtuspro': {
    name: 'Virtus.Pro',
    urls: [
      'https://upload.wikimedia.org/wikipedia/en/thumb/f/f8/Virtus.pro_logo_2023.svg/1200px-Virtus.pro_logo_2023.svg.png',
      'https://img-cdn.hltv.org/teamlogo/xpjUNDRd44z8hnLYhHMOo8.svg?ixlib=java-2.1.0&s=b6e7c84ad9e3cdfa1ba46f40aa9a7e42'
    ]
  }
};

// Create logos directory
const logosDir = path.join(__dirname, '../src/frontend/public/team-logos');
if (!fs.existsSync(logosDir)) {
  fs.mkdirSync(logosDir, { recursive: true });
  console.log('📁 Created team-logos directory');
}

// Function to download a file
function downloadFile(url, filepath) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const protocol = parsedUrl.protocol === 'https:' ? https : http;
    
    const file = fs.createWriteStream(filepath);
    
    const request = protocol.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        // Handle redirects
        file.close();
        if (fs.existsSync(filepath)) {
          fs.unlinkSync(filepath);
        }
        return downloadFile(response.headers.location, filepath).then(resolve).catch(reject);
      }
      
      if (response.statusCode !== 200) {
        file.close();
        if (fs.existsSync(filepath)) {
          fs.unlinkSync(filepath);
        }
        reject(new Error(`Failed to download: ${response.statusCode}`));
        return;
      }
      
      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        resolve();
      });
    });
    
    request.on('error', (err) => {
      file.close();
      if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath);
      }
      reject(err);
    });
    
    request.setTimeout(10000, () => {
      request.destroy();
      file.close();
      // Only unlink if file exists
      if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath);
      }
      reject(new Error('Download timeout'));
    });
  });
}

// Download all logos
async function downloadAllLogos() {
  console.log('🎨 Downloading CS2 team logos...\n');
  
  const results = {
    success: [],
    failed: []
  };
  
  for (const [key, team] of Object.entries(TEAM_LOGOS)) {
    console.log(`📥 Downloading ${team.name} logo...`);
    
    let downloaded = false;
    let extension = '';
    
    // Try each URL until one works
    for (const url of team.urls) {
      try {
        // Determine file extension
        if (url.includes('.svg')) {
          extension = '.svg';
        } else if (url.includes('.png')) {
          extension = '.png';
        } else if (url.includes('.jpg') || url.includes('.jpeg')) {
          extension = '.jpg';
        } else {
          extension = '.png'; // Default to PNG
        }
        
        const filename = `${key}${extension}`;
        const filepath = path.join(logosDir, filename);
        
        await downloadFile(url, filepath);
        
        console.log(`✅ ${team.name} - Downloaded as ${filename}`);
        results.success.push({ team: team.name, file: filename });
        downloaded = true;
        break;
        
      } catch (error) {
        // Try next URL
        continue;
      }
    }
    
    if (!downloaded) {
      console.log(`❌ ${team.name} - Failed to download`);
      results.failed.push(team.name);
    }
    
    // Small delay between downloads
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Create a mapping file
  const logoMapping = {};
  results.success.forEach(({ team, file }) => {
    logoMapping[team] = `/team-logos/${file}`;
  });
  
  const mappingPath = path.join(logosDir, 'logo-mapping.json');
  fs.writeFileSync(mappingPath, JSON.stringify(logoMapping, null, 2));
  
  // Summary
  console.log('\n📊 Download Summary:');
  console.log(`✅ Success: ${results.success.length} logos`);
  console.log(`❌ Failed: ${results.failed.length} logos`);
  
  if (results.failed.length > 0) {
    console.log('\n⚠️ Failed teams:', results.failed.join(', '));
  }
  
  console.log('\n✅ Logo mapping saved to:', mappingPath);
  console.log('🎉 Logo download complete!');
}

// Update TeamLogo component
async function updateTeamLogoComponent() {
  const componentPath = path.join(__dirname, '../src/frontend/src/components/TeamLogo.jsx');
  
  const updatedComponent = `import React, { useState } from 'react';
import logoMapping from '/team-logos/logo-mapping.json';

// Generic CS2 logo for unknown teams or fallback
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
    // First try local logo
    if (logoMapping[team]) {
      return logoMapping[team];
    }
    
    // Then try provided URL if no error
    if (!imageError && logoUrl) {
      return logoUrl;
    }
    
    // Finally use generic CS2 logo
    return GENERIC_CS2_LOGO;
  };

  return (
    <div className={\`\${size} relative flex items-center justify-center\`}>
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
        className={\`\${size} object-contain \${loading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300\`}
      />
    </div>
  );
};

export default TeamLogo;`;

  fs.writeFileSync(componentPath, updatedComponent);
  console.log('\n✅ Updated TeamLogo component to use local logos');
}

// Run the download
if (require.main === module) {
  downloadAllLogos()
    .then(() => updateTeamLogoComponent())
    .then(() => {
      console.log('\n🚀 Next steps:');
      console.log('1. Commit and push the new logos');
      console.log('2. The logos will be served from /team-logos/ directory');
      console.log('3. No more CORS issues!');
    })
    .catch(console.error);
}

module.exports = { downloadAllLogos };