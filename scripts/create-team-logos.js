const fs = require('fs');
const path = require('path');

const teams = [
  { name: 'Team Vitality', short: 'VIT', color1: '#ff6900', color2: '#ff4500' },
  { name: 'G2 Esports', short: 'G2', color1: '#ff4757', color2: '#ff3742' },
  { name: 'Natus Vincere', short: 'NAVI', color1: '#ffcc00', color2: '#ffb700' },
  { name: 'FaZe Clan', short: 'FAZE', color1: '#ff0040', color2: '#cc0033' },
  { name: 'Team Liquid', short: 'TL', color1: '#0066cc', color2: '#0052a3' },
  { name: 'Astralis', short: 'AST', color1: '#ff6b6b', color2: '#ee5a52' },
  { name: 'MOUZ', short: 'MOUZ', color1: '#ff8c42', color2: '#ff7722' },
  { name: 'Team Spirit', short: 'TS', color1: '#74b9ff', color2: '#0984e3' },
  { name: 'HEROIC', short: 'HRC', color1: '#fd79a8', color2: '#e84393' },
  { name: 'TYLOO', short: 'TYL', color1: '#fdcb6e', color2: '#e17055' },
  { name: 'Team Falcons', short: 'FAL', color1: '#6c5ce7', color2: '#5f3dc4' },
  { name: 'The MongolZ', short: 'TMZ', color1: '#fd79a8', color2: '#e84393' },
  { name: 'Aurora Gaming', short: 'AUR', color1: '#55efc4', color2: '#00b894' },
  { name: 'GamerLegion', short: 'GL', color1: '#ff7675', color2: '#d63031' },
  { name: '3DMAX', short: '3DM', color1: '#a29bfe', color2: '#6c5ce7' },
  { name: 'Virtus.Pro', short: 'VP', color1: '#fd7373', color2: '#e55353' },
  { name: 'TBD', short: 'TBD', color1: '#636e72', color2: '#2d3436' }
];

function createTeamLogo(team) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
  <defs>
    <linearGradient id="grad_${team.short}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${team.color1};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${team.color2};stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- Background circle -->
  <circle cx="50" cy="50" r="45" fill="url(#grad_${team.short})" stroke="#333" stroke-width="2"/>
  
  <!-- Team short name -->
  <text x="50" y="58" font-family="Arial Black, sans-serif" font-size="${team.short.length > 3 ? '10' : '14'}" font-weight="bold" text-anchor="middle" fill="white">${team.short}</text>
</svg>`;
}

async function createAllLogos() {
  const logosDir = path.join(__dirname, '../src/frontend/public/team-logos');
  if (!fs.existsSync(logosDir)) {
    fs.mkdirSync(logosDir, { recursive: true });
  }

  console.log('🎨 Creating team logos...');
  
  const logoMapping = {};
  
  for (const team of teams) {
    const filename = `${team.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}.svg`;
    const filepath = path.join(logosDir, filename);
    const svgContent = createTeamLogo(team);
    
    fs.writeFileSync(filepath, svgContent);
    logoMapping[team.name] = `/team-logos/${filename}`;
    
    console.log(`✅ Created ${team.name} logo: ${filename}`);
  }
  
  // Save logo mapping
  const mappingPath = path.join(logosDir, 'logo-mapping.json');
  fs.writeFileSync(mappingPath, JSON.stringify(logoMapping, null, 2));
  
  console.log(`\n✅ Created ${teams.length} team logos`);
  console.log('✅ Logo mapping saved to:', mappingPath);
  console.log('🎉 All team logos created!');
}

createAllLogos().catch(console.error);