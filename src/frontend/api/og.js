export const config = {
  runtime: 'edge',
};

const TOURNAMENT_META = {
  'tournaments/club-world-cup-2025': {
    title: 'FIFA Club World Cup 2025 - PRIMAPE Markets',
    description: 'Predict winners of the FIFA Club World Cup 2025 matches and compete for amazing prizes! The ultimate club football championship featuring 32 teams from around the world.',
    image: 'https://i0.wp.com/financefootball.com/wp-content/uploads/2024/12/fifa_club_world_cup_2025.jpg?fit=1366%2C768&ssl=1',
  },
  'tournaments/nba-finals-2025': {
    title: 'NBA Finals 2025 - PRIMAPE Markets',
    description: 'Predict the outcomes of the 2025 NBA Finals between Thunder and Pacers. Join the ultimate basketball prediction tournament!',
    image: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2059&q=80',
  }
};

export default function handler(request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug') || '';
  
  const meta = TOURNAMENT_META[slug] || {
    title: 'PRIMAPE APP - Solana Prediction Markets',
    description: 'Trade predictions on real-world events with APES tokens. Decentralized prediction markets on Solana blockchain with instant settlements and transparent outcomes.',
    image: 'https://www.primape.app/primape/Asset 7@3x.png',
  };

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${meta.title}</title>
    <meta name="description" content="${meta.description}" />
    
    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="website" />
    <meta property="og:url" content="https://apes.primape.app/${slug}" />
    <meta property="og:title" content="${meta.title}" />
    <meta property="og:description" content="${meta.description}" />
    <meta property="og:image" content="${meta.image}" />
    <meta property="og:image:width" content="1366" />
    <meta property="og:image:height" content="768" />
    
    <!-- Twitter -->
    <meta property="twitter:card" content="summary_large_image" />
    <meta property="twitter:url" content="https://apes.primape.app/${slug}" />
    <meta property="twitter:title" content="${meta.title}" />
    <meta property="twitter:description" content="${meta.description}" />
    <meta property="twitter:image" content="${meta.image}" />
    
    <script>window.location.href = "https://apes.primape.app/${slug}";</script>
</head>
<body>
    Redirecting...
</body>
</html>`;

  return new Response(html, {
    headers: {
      'content-type': 'text/html;charset=UTF-8',
      'cache-control': 'public, max-age=3600, s-maxage=3600',
    },
  });
} 