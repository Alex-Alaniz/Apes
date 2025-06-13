// FIFA Club World Cup 2025 - Complete Tournament Structure (63 matches)
export const CLUB_WC_MATCHES = [
  // GROUP STAGE MATCHES (48 matches - Groups A-H, 6 matches per group)
  // Group A
  { match: 1, group: 'A', round: 'Group Stage', home: 'Al Ahly', away: 'Inter Miami', venue: 'Hard Rock, Miami', date: '2025-06-14', time: '20:00', timezone: 'ET' },
  { match: 2, group: 'A', round: 'Group Stage', home: 'Palmeiras', away: 'Porto', venue: 'MetLife, NJ', date: '2025-06-15', time: '18:00', timezone: 'ET' },
  { match: 3, group: 'A', round: 'Group Stage', home: 'Palmeiras', away: 'Al Ahly', venue: 'MetLife, NJ', date: '2025-06-19', time: '12:00', timezone: 'ET' },
  { match: 4, group: 'A', round: 'Group Stage', home: 'Inter Miami', away: 'Porto', venue: 'Mercedes-Benz, Atl', date: '2025-06-19', time: '15:00', timezone: 'ET' },
  { match: 5, group: 'A', round: 'Group Stage', home: 'Porto', away: 'Al Ahly', venue: 'MetLife, NJ', date: '2025-06-23', time: '21:00', timezone: 'ET' },
  { match: 6, group: 'A', round: 'Group Stage', home: 'Inter Miami', away: 'Palmeiras', venue: 'Hard Rock, Miami', date: '2025-06-23', time: '21:00', timezone: 'ET' },

  // Group B
  { match: 7, group: 'B', round: 'Group Stage', home: 'Paris Saint-Germain', away: 'Atletico Madrid', venue: 'Rose Bowl, LA', date: '2025-06-15', time: '15:00', timezone: 'PT' },
  { match: 8, group: 'B', round: 'Group Stage', home: 'Botafogo', away: 'Seattle Sounders', venue: 'Lumen, Seattle', date: '2025-06-15', time: '22:00', timezone: 'PT' },
  { match: 9, group: 'B', round: 'Group Stage', home: 'Seattle Sounders', away: 'Atletico Madrid', venue: 'Lumen, Seattle', date: '2025-06-19', time: '18:00', timezone: 'ET' },
  { match: 10, group: 'B', round: 'Group Stage', home: 'Paris Saint-Germain', away: 'Botafogo', venue: 'Rose Bowl, LA', date: '2025-06-19', time: '21:00', timezone: 'ET' },
  { match: 11, group: 'B', round: 'Group Stage', home: 'Atletico Madrid', away: 'Botafogo', venue: 'Mercedes-Benz, Atl', date: '2025-06-23', time: '15:00', timezone: 'ET' },
  { match: 12, group: 'B', round: 'Group Stage', home: 'Seattle Sounders', away: 'Paris Saint-Germain', venue: 'Lumen, Seattle', date: '2025-06-23', time: '15:00', timezone: 'ET' },

  // Group C
  { match: 13, group: 'C', round: 'Group Stage', home: 'Bayern Munich', away: 'Auckland City', venue: 'TQL, Cincinnati', date: '2025-06-15', time: '12:00', timezone: 'ET' },
  { match: 14, group: 'C', round: 'Group Stage', home: 'Boca Juniors', away: 'Benfica', venue: 'Hard Rock, Miami', date: '2025-06-16', time: '18:00', timezone: 'ET' },
  { match: 15, group: 'C', round: 'Group Stage', home: 'Benfica', away: 'Auckland City', venue: 'Inter&Co, Orl', date: '2025-06-20', time: '12:00', timezone: 'ET' },
  { match: 16, group: 'C', round: 'Group Stage', home: 'Bayern Munich', away: 'Boca Juniors', venue: 'Hard Rock, Miami', date: '2025-06-20', time: '21:00', timezone: 'ET' },
  { match: 17, group: 'C', round: 'Group Stage', home: 'Auckland City', away: 'Boca Juniors', venue: 'Geodis Park, Nashville', date: '2025-06-24', time: '15:00', timezone: 'ET' },
  { match: 18, group: 'C', round: 'Group Stage', home: 'Benfica', away: 'Bayern Munich', venue: 'Bank of America, Cha', date: '2025-06-24', time: '15:00', timezone: 'ET' },

  // Group D
  { match: 19, group: 'D', round: 'Group Stage', home: 'Chelsea', away: 'LAFC', venue: 'Mercedes-Benz, Atl', date: '2025-06-16', time: '15:00', timezone: 'ET' },
  { match: 20, group: 'D', round: 'Group Stage', home: 'Flamengo', away: 'Espérance', venue: 'Lincoln Financial, Phi', date: '2025-06-16', time: '21:00', timezone: 'ET' },
  { match: 21, group: 'D', round: 'Group Stage', home: 'Flamengo', away: 'Chelsea', venue: 'Lincoln Financial, Phi', date: '2025-06-20', time: '14:00', timezone: 'ET' },
  { match: 22, group: 'D', round: 'Group Stage', home: 'LAFC', away: 'Espérance', venue: 'Geodis Park, Nashville', date: '2025-06-20', time: '18:00', timezone: 'ET' },
  { match: 23, group: 'D', round: 'Group Stage', home: 'Espérance', away: 'Chelsea', venue: 'Lincoln Financial, Phi', date: '2025-06-24', time: '21:00', timezone: 'ET' },
  { match: 24, group: 'D', round: 'Group Stage', home: 'LAFC', away: 'Flamengo', venue: 'Camping World, Orl', date: '2025-06-24', time: '21:00', timezone: 'ET' },

  // Group E
  { match: 25, group: 'E', round: 'Group Stage', home: 'River Plate', away: 'Urawa Red Diamonds', venue: 'Lumen, Seattle', date: '2025-06-17', time: '15:00', timezone: 'PT' },
  { match: 26, group: 'E', round: 'Group Stage', home: 'Monterrey', away: 'Internazionale', venue: 'Rose Bowl, LA', date: '2025-06-17', time: '21:00', timezone: 'PT' },
  { match: 27, group: 'E', round: 'Group Stage', home: 'Internazionale', away: 'Urawa Red Diamonds', venue: 'Lumen, Seattle', date: '2025-06-21', time: '15:00', timezone: 'ET' },
  { match: 28, group: 'E', round: 'Group Stage', home: 'River Plate', away: 'Monterrey', venue: 'Rose Bowl, LA', date: '2025-06-21', time: '21:00', timezone: 'ET' },
  { match: 29, group: 'E', round: 'Group Stage', home: 'Internazionale', away: 'River Plate', venue: 'Lumen, Seattle', date: '2025-06-25', time: '21:00', timezone: 'ET' },
  { match: 30, group: 'E', round: 'Group Stage', home: 'Urawa Red Diamonds', away: 'Monterrey', venue: 'Rose Bowl, LA', date: '2025-06-25', time: '21:00', timezone: 'ET' },

  // Group F
  { match: 31, group: 'F', round: 'Group Stage', home: 'Fluminense', away: 'Borussia Dortmund', venue: 'MetLife, NJ', date: '2025-06-17', time: '12:00', timezone: 'ET' },
  { match: 32, group: 'F', round: 'Group Stage', home: 'Ulsan HD', away: 'Mamelodi Sundowns', venue: 'Inter&Co, Orl', date: '2025-06-17', time: '18:00', timezone: 'ET' },
  { match: 33, group: 'F', round: 'Group Stage', home: 'Mamelodi Sundowns', away: 'Borussia Dortmund', venue: 'TQL, Cincinnati', date: '2025-06-21', time: '12:00', timezone: 'ET' },
  { match: 34, group: 'F', round: 'Group Stage', home: 'Fluminense', away: 'Ulsan HD', venue: 'MetLife, NJ', date: '2025-06-21', time: '18:00', timezone: 'ET' },
  { match: 35, group: 'F', round: 'Group Stage', home: 'Borussia Dortmund', away: 'Ulsan HD', venue: 'TQL, Cincinnati', date: '2025-06-25', time: '15:00', timezone: 'ET' },
  { match: 36, group: 'F', round: 'Group Stage', home: 'Mamelodi Sundowns', away: 'Fluminense', venue: 'Hard Rock, Miami', date: '2025-06-25', time: '15:00', timezone: 'ET' },

  // Group G
  { match: 37, group: 'G', round: 'Group Stage', home: 'Manchester City', away: 'Wydad AC', venue: 'Lincoln Financial, Phi', date: '2025-06-18', time: '12:00', timezone: 'ET' },
  { match: 38, group: 'G', round: 'Group Stage', home: 'Al Ain', away: 'Juventus', venue: 'Audi, Washington', date: '2025-06-18', time: '21:00', timezone: 'ET' },
  { match: 39, group: 'G', round: 'Group Stage', home: 'Juventus', away: 'Wydad AC', venue: 'Lincoln Financial, Phi', date: '2025-06-22', time: '12:00', timezone: 'ET' },
  { match: 40, group: 'G', round: 'Group Stage', home: 'Manchester City', away: 'Al Ain', venue: 'Mercedes-Benz, Atl', date: '2025-06-22', time: '21:00', timezone: 'ET' },
  { match: 41, group: 'G', round: 'Group Stage', home: 'Juventus', away: 'Manchester City', venue: 'Camping World, Orl', date: '2025-06-26', time: '15:00', timezone: 'ET' },
  { match: 42, group: 'G', round: 'Group Stage', home: 'Wydad AC', away: 'Al Ain', venue: 'Audi, Washington', date: '2025-06-26', time: '15:00', timezone: 'ET' },

  // Group H
  { match: 43, group: 'H', round: 'Group Stage', home: 'Real Madrid', away: 'Al Hilal', venue: 'Hard Rock, Miami', date: '2025-06-18', time: '15:00', timezone: 'ET' },
  { match: 44, group: 'H', round: 'Group Stage', home: 'Pachuca', away: 'Salzburg', venue: 'TQL, Cincinnati', date: '2025-06-18', time: '18:00', timezone: 'ET' },
  { match: 45, group: 'H', round: 'Group Stage', home: 'Real Madrid', away: 'Pachuca', venue: 'Bank of America, Cha', date: '2025-06-22', time: '15:00', timezone: 'ET' },
  { match: 46, group: 'H', round: 'Group Stage', home: 'Salzburg', away: 'Al Hilal', venue: 'Audi, Washington', date: '2025-06-22', time: '18:00', timezone: 'ET' },
  { match: 47, group: 'H', round: 'Group Stage', home: 'Al Hilal', away: 'Pachuca', venue: 'Geodis Park, Nashville', date: '2025-06-26', time: '21:00', timezone: 'ET' },
  { match: 48, group: 'H', round: 'Group Stage', home: 'Salzburg', away: 'Real Madrid', venue: 'Lincoln Financial, Phi', date: '2025-06-26', time: '21:00', timezone: 'ET' },

  // ROUND OF 16 (8 matches)
  { match: 49, group: 'R16', round: 'Round of 16', home: 'Group A Winner', away: 'Group B Runner-up', venue: 'Hard Rock, Miami', date: '2025-06-29', time: '15:00', timezone: 'ET' },
  { match: 50, group: 'R16', round: 'Round of 16', home: 'Group C Winner', away: 'Group D Runner-up', venue: 'Rose Bowl, LA', date: '2025-06-29', time: '18:00', timezone: 'PT' },
  { match: 51, group: 'R16', round: 'Round of 16', home: 'Group B Winner', away: 'Group A Runner-up', venue: 'MetLife, NJ', date: '2025-06-30', time: '15:00', timezone: 'ET' },
  { match: 52, group: 'R16', round: 'Round of 16', home: 'Group D Winner', away: 'Group C Runner-up', venue: 'Mercedes-Benz, Atl', date: '2025-06-30', time: '18:00', timezone: 'ET' },
  { match: 53, group: 'R16', round: 'Round of 16', home: 'Group E Winner', away: 'Group F Runner-up', venue: 'Lumen, Seattle', date: '2025-07-01', time: '15:00', timezone: 'PT' },
  { match: 54, group: 'R16', round: 'Round of 16', home: 'Group G Winner', away: 'Group H Runner-up', venue: 'TQL, Cincinnati', date: '2025-07-01', time: '18:00', timezone: 'ET' },
  { match: 55, group: 'R16', round: 'Round of 16', home: 'Group F Winner', away: 'Group E Runner-up', venue: 'Lincoln Financial, Phi', date: '2025-07-02', time: '15:00', timezone: 'ET' },
  { match: 56, group: 'R16', round: 'Round of 16', home: 'Group H Winner', away: 'Group G Runner-up', venue: 'Inter&Co, Orl', date: '2025-07-02', time: '18:00', timezone: 'ET' },

  // QUARTERFINALS (4 matches)
  { match: 57, group: 'QF', round: 'Quarterfinal', home: 'R16 Winner 1', away: 'R16 Winner 2', venue: 'MetLife, NJ', date: '2025-07-05', time: '15:00', timezone: 'ET' },
  { match: 58, group: 'QF', round: 'Quarterfinal', home: 'R16 Winner 3', away: 'R16 Winner 4', venue: 'Rose Bowl, LA', date: '2025-07-05', time: '18:00', timezone: 'PT' },
  { match: 59, group: 'QF', round: 'Quarterfinal', home: 'R16 Winner 5', away: 'R16 Winner 6', venue: 'Hard Rock, Miami', date: '2025-07-06', time: '15:00', timezone: 'ET' },
  { match: 60, group: 'QF', round: 'Quarterfinal', home: 'R16 Winner 7', away: 'R16 Winner 8', venue: 'Mercedes-Benz, Atl', date: '2025-07-06', time: '18:00', timezone: 'ET' },

  // SEMIFINALS (2 matches)
  { match: 61, group: 'SF', round: 'Semifinal', home: 'QF Winner 1', away: 'QF Winner 2', venue: 'MetLife, NJ', date: '2025-07-09', time: '15:00', timezone: 'ET' },
  { match: 62, group: 'SF', round: 'Semifinal', home: 'QF Winner 3', away: 'QF Winner 4', venue: 'Rose Bowl, LA', date: '2025-07-10', time: '18:00', timezone: 'PT' },

  // FINAL (1 match)
  { match: 63, group: 'F', round: 'Final', home: 'SF Winner 1', away: 'SF Winner 2', venue: 'MetLife, NJ', date: '2025-07-13', time: '15:00', timezone: 'ET' }
]; 