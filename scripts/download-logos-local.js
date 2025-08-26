const fs = require('fs');
const https = require('https');
const path = require('path');

// Simple team logos with fallback PNG URLs
const TEAM_LOGOS = {
  'team-vitality': {
    name: 'Team Vitality',
    urls: [
      'https://liquipedia.net/commons/images/thumb/a/a5/Team_Vitality_2021_allmode.png/600px-Team_Vitality_2021_allmode.png',
      'https://seeklogo.com/images/T/team-vitality-logo-B24D69E7B8-seeklogo.com.png'
    ]
  },
  'g2-esports': {
    name: 'G2 Esports',
    urls: [
      'https://liquipedia.net/commons/images/thumb/5/52/G2_Esports_2019_logo.png/600px-G2_Esports_2019_logo.png',
      'https://seeklogo.com/images/G/g2-esports-logo-9C2C15C8DC-seeklogo.com.png'
    ]
  },
  'natus-vincere': {
    name: 'Natus Vincere',
    urls: [
      'https://liquipedia.net/commons/images/thumb/e/e2/NATUS_VINCERE_2022_allmode.png/600px-NATUS_VINCERE_2022_allmode.png',
      'https://seeklogo.com/images/N/natus-vincere-logo-B56D89F076-seeklogo.com.png'
    ]
  },
  'faze-clan': {
    name: 'FaZe Clan',
    urls: [
      'https://liquipedia.net/commons/images/thumb/b/b8/FaZe_Clan_2016_logo.png/600px-FaZe_Clan_2016_logo.png',
      'https://seeklogo.com/images/F/faze-clan-logo-9E96194DE4-seeklogo.com.png'
    ]
  },
  'team-liquid': {
    name: 'Team Liquid',
    urls: [
      'https://liquipedia.net/commons/images/thumb/6/64/Team_Liquid_2017_logo.png/600px-Team_Liquid_2017_logo.png',
      'https://seeklogo.com/images/T/team-liquid-logo-30972A75FB-seeklogo.com.png'
    ]
  },
  'astralis': {
    name: 'Astralis',
    urls: [
      'https://liquipedia.net/commons/images/thumb/5/56/Astralis_2019_logo.png/600px-Astralis_2019_logo.png',
      'https://seeklogo.com/images/A/astralis-logo-5E36E1EF54-seeklogo.com.png'
    ]
  },
  'cs2-logo': {
    name: 'Generic CS2',
    urls: [
      'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f9/Counter-Strike_2_logo.svg/800px-Counter-Strike_2_logo.svg.png'
    ]
  }
};

const logosDir = path.join(__dirname, '../src/frontend/public/team-logos');
if (!fs.existsSync(logosDir)) {
  fs.mkdirSync(logosDir, { recursive: true });
}

function downloadFile(url, filepath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filepath);
    
    const request = https.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        file.close();
        if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
        return downloadFile(response.headers.location, filepath).then(resolve).catch(reject);
      }
      
      if (response.statusCode !== 200) {
        file.close();
        if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
        reject(new Error(`HTTP ${response.statusCode}`));
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
      if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
      reject(err);
    });
    
    request.setTimeout(15000, () => {
      request.destroy();
      file.close();
      if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
      reject(new Error('Timeout'));
    });
  });
}

async function downloadLogos() {
  console.log('🎨 Downloading team logos as PNG files...');
  
  const logoMapping = {};
  const results = { success: [], failed: [] };
  
  for (const [key, team] of Object.entries(TEAM_LOGOS)) {
    console.log(`📥 Downloading ${team.name}...`);
    
    let downloaded = false;
    for (const url of team.urls) {
      try {
        const filename = `${key}.png`;
        const filepath = path.join(logosDir, filename);
        
        await downloadFile(url, filepath);
        
        console.log(`✅ ${team.name} - Downloaded as ${filename}`);
        logoMapping[team.name] = `/team-logos/${filename}`;
        results.success.push({ team: team.name, file: filename });
        downloaded = true;
        break;
        
      } catch (error) {
        continue;
      }
    }
    
    if (!downloaded) {
      console.log(`❌ ${team.name} - Failed to download`);
      results.failed.push(team.name);
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Add fallback entries for teams we couldn't download
  const allTeams = [
    'Team Vitality', 'G2 Esports', 'Natus Vincere', 'FaZe Clan', 'Team Liquid', 
    'Astralis', 'MOUZ', 'Team Spirit', 'HEROIC', 'TYLOO', 'Team Falcons', 
    'The MongolZ', 'Aurora Gaming', 'GamerLegion', '3DMAX', 'Virtus.Pro', 'TBD'
  ];
  
  allTeams.forEach(team => {
    if (!logoMapping[team]) {
      if (logoMapping['Generic CS2']) {
        logoMapping[team] = logoMapping['Generic CS2'];
      } else {
        logoMapping[team] = '/team-logos/cs2-logo.png';
      }
    }
  });
  
  const mappingPath = path.join(logosDir, 'logo-mapping.json');
  fs.writeFileSync(mappingPath, JSON.stringify(logoMapping, null, 2));
  
  console.log(`\n📊 Results: ${results.success.length} success, ${results.failed.length} failed`);
  console.log('✅ Logo mapping saved to:', mappingPath);
  console.log('🎉 Download complete!');
}

downloadLogos().catch(console.error);