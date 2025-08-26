const fs = require('fs');
const https = require('https');
const http = require('http');
const path = require('path');
const { URL } = require('url');

// Simplified team logos with more reliable URLs
const TEAM_LOGOS = {
  'team-vitality': {
    name: 'Team Vitality',
    url: 'https://img-cdn.hltv.org/teamlogo/y3ZEDEQHXwQMBf9x5xCJ6k.svg?ixlib=java-2.1.0&s=40'
  },
  'g2-esports': {
    name: 'G2 Esports', 
    url: 'https://img-cdn.hltv.org/teamlogo/zFLwAELOD15BjJSDMMNBWQ.svg?ixlib=java-2.1.0&s=40'
  },
  'natus-vincere': {
    name: 'Natus Vincere',
    url: 'https://img-cdn.hltv.org/teamlogo/kixzGZIb9IYAAv-1vGrGev.svg?ixlib=java-2.1.0&s=40'
  },
  'faze-clan': {
    name: 'FaZe Clan',
    url: 'https://img-cdn.hltv.org/teamlogo/SMhzsxzbvIBPOMh8QmFgdF.svg?ixlib=java-2.1.0&s=40'
  },
  'team-liquid': {
    name: 'Team Liquid',
    url: 'https://img-cdn.hltv.org/teamlogo/aDy0HJZCOx5icSDNyh7rHy.svg?ixlib=java-2.1.0&s=40'
  },
  'astralis': {
    name: 'Astralis',
    url: 'https://img-cdn.hltv.org/teamlogo/9bgXHC_GvNh8kdKAMRk8Xw.svg?ixlib=java-2.1.0&s=40'
  },
  'mouz': {
    name: 'MOUZ',
    url: 'https://img-cdn.hltv.org/teamlogo/tObY0DIIJAay6RtWfNz5Rg.svg?ixlib=java-2.1.0&s=40'
  },
  'team-spirit': {
    name: 'Team Spirit',
    url: 'https://img-cdn.hltv.org/teamlogo/FzePJb9GIblFLo_d59IPxw.svg?ixlib=java-2.1.0&s=40'
  },
  'heroic': {
    name: 'HEROIC',
    url: 'https://img-cdn.hltv.org/teamlogo/qlC1DqfPofyDfRPcHNL8k3.svg?ixlib=java-2.1.0&s=40'
  },
  'tyloo': {
    name: 'TYLOO',
    url: 'https://img-cdn.hltv.org/teamlogo/fhA2iW9Czz2bUBQN_8FNGD.svg?ixlib=java-2.1.0&s=40'
  },
  'team-falcons': {
    name: 'Team Falcons',
    url: 'https://img-cdn.hltv.org/teamlogo/4OU6hU-9XsOGJjKG0wEzWl.svg?ixlib=java-2.1.0&s=40'
  },
  'the-mongolz': {
    name: 'The MongolZ',
    url: 'https://img-cdn.hltv.org/teamlogo/a5sKNWGMJ-nUPnpHSJk2eJ.svg?ixlib=java-2.1.0&s=40'
  },
  'aurora-gaming': {
    name: 'Aurora Gaming',
    url: 'https://img-cdn.hltv.org/teamlogo/WODhkJkk5J8BzhlQ35RhzC.svg?ixlib=java-2.1.0&s=40'
  },
  'gamerlegion': {
    name: 'GamerLegion',
    url: 'https://img-cdn.hltv.org/teamlogo/V5OHGPVLS-9WiEiNhSLrSs.svg?ixlib=java-2.1.0&s=40'
  },
  '3dmax': {
    name: '3DMAX',
    url: 'https://img-cdn.hltv.org/teamlogo/zE8WpwZW4qOXrmcwgLcP7S.svg?ixlib=java-2.1.0&s=40'
  },
  'virtuspro': {
    name: 'Virtus.Pro',
    url: 'https://img-cdn.hltv.org/teamlogo/kixzGhoul-EN9LKmGFWEHg.svg?ixlib=java-2.1.0&s=40'
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
      if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath);
      }
      reject(new Error('Download timeout'));
    });
  });
}

// Download all logos
async function downloadAllLogos() {
  console.log('🎨 Downloading CS2 team logos from HLTV...\n');
  
  const results = {
    success: [],
    failed: []
  };
  
  for (const [key, team] of Object.entries(TEAM_LOGOS)) {
    console.log(`📥 Downloading ${team.name} logo...`);
    
    try {
      const filename = `${key}.svg`;
      const filepath = path.join(logosDir, filename);
      
      await downloadFile(team.url, filepath);
      
      console.log(`✅ ${team.name} - Downloaded as ${filename}`);
      results.success.push({ team: team.name, file: filename });
      
    } catch (error) {
      console.log(`❌ ${team.name} - Failed: ${error.message}`);
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

// Run the download
downloadAllLogos().catch(console.error);