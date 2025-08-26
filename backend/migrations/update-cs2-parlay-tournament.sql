
-- Update CS2 Esports World Cup 2025 Tournament
INSERT INTO parlay_tournaments (
  tournament_id, name, min_selections, max_selections, 
  base_multiplier, multiplier_increment, start_date, end_date,
  max_exposure, status
) VALUES (
  'cs2-ewc-2025',
  'CS2 Esports World Cup 2025',
  2,
  10,
  1.8,
  0.5,
  to_timestamp(1755648000),
  to_timestamp(1756079999),
  10000000,
  'active'
) ON CONFLICT (tournament_id) DO UPDATE SET
  name = EXCLUDED.name,
  min_selections = EXCLUDED.min_selections,
  max_selections = EXCLUDED.max_selections,
  base_multiplier = EXCLUDED.base_multiplier,
  multiplier_increment = EXCLUDED.multiplier_increment,
  start_date = EXCLUDED.start_date,
  end_date = EXCLUDED.end_date,
  max_exposure = EXCLUDED.max_exposure,
  status = EXCLUDED.status;

-- Clear existing matches for this tournament
DELETE FROM cs2_matches WHERE tournament_id = 'cs2-ewc-2025';

-- Insert new matches

INSERT INTO cs2_matches (
  tournament_id, match_id, market_string, team_a, team_b, 
  match_date, round, best_of, status
) VALUES (
  'cs2-ewc-2025',
  'cs2_tv_vp_r_677177',
  'CS2_EWC25_R16_TV_VP_0820',
  'Team Vitality',
  'Virtus.Pro',
  to_timestamp(1755698400),
  'Round of 16',
  3,
  'scheduled'
);
INSERT INTO cs2_matches (
  tournament_id, match_id, market_string, team_a, team_b, 
  match_date, round, best_of, status
) VALUES (
  'cs2-ewc-2025',
  'cs2_ge_her_r_677178',
  'CS2_EWC25_R16_GE_HER_0820',
  'G2 Esports',
  'HEROIC',
  to_timestamp(1755703800),
  'Round of 16',
  3,
  'scheduled'
);
INSERT INTO cs2_matches (
  tournament_id, match_id, market_string, team_a, team_b, 
  match_date, round, best_of, status
) VALUES (
  'cs2-ewc-2025',
  'cs2_nv_dma_r_677178',
  'CS2_EWC25_R16_NV_DMA_0820',
  'Natus Vincere',
  '3DMAX',
  to_timestamp(1755709200),
  'Round of 16',
  3,
  'scheduled'
);
INSERT INTO cs2_matches (
  tournament_id, match_id, market_string, team_a, team_b, 
  match_date, round, best_of, status
) VALUES (
  'cs2-ewc-2025',
  'cs2_fzc_gl_r_677178',
  'CS2_EWC25_R16_FZC_GL_0820',
  'FaZe Clan',
  'GamerLegion',
  to_timestamp(1755714600),
  'Round of 16',
  3,
  'scheduled'
);
INSERT INTO cs2_matches (
  tournament_id, match_id, market_string, team_a, team_b, 
  match_date, round, best_of, status
) VALUES (
  'cs2-ewc-2025',
  'cs2_tl_ag_r_677178',
  'CS2_EWC25_R16_TL_AG_0820',
  'Team Liquid',
  'Aurora Gaming',
  to_timestamp(1755720000),
  'Round of 16',
  3,
  'scheduled'
);
INSERT INTO cs2_matches (
  tournament_id, match_id, market_string, team_a, team_b, 
  match_date, round, best_of, status
) VALUES (
  'cs2-ewc-2025',
  'cs2_a_tmz_r_677178',
  'CS2_EWC25_R16_A_TMZ_0820',
  'Astralis',
  'The MongolZ',
  to_timestamp(1755725400),
  'Round of 16',
  3,
  'scheduled'
);
INSERT INTO cs2_matches (
  tournament_id, match_id, market_string, team_a, team_b, 
  match_date, round, best_of, status
) VALUES (
  'cs2-ewc-2025',
  'cs2_mou_tf_r_677178',
  'CS2_EWC25_R16_MOU_TF_0821',
  'MOUZ',
  'Team Falcons',
  to_timestamp(1755784800),
  'Round of 16',
  3,
  'scheduled'
);
INSERT INTO cs2_matches (
  tournament_id, match_id, market_string, team_a, team_b, 
  match_date, round, best_of, status
) VALUES (
  'cs2-ewc-2025',
  'cs2_ts_tyl_r_677178',
  'CS2_EWC25_R16_TS_TYL_0821',
  'Team Spirit',
  'TYLOO',
  to_timestamp(1755790200),
  'Round of 16',
  3,
  'scheduled'
);
INSERT INTO cs2_matches (
  tournament_id, match_id, market_string, team_a, team_b, 
  match_date, round, best_of, status
) VALUES (
  'cs2-ewc-2025',
  'cs2_tbd_tbd_qf_677178',
  'CS2_EWC25_F_TBD_TBD_0822',
  'TBD',
  'TBD',
  to_timestamp(1755874800),
  'Quarter Final 1',
  5,
  'scheduled'
);
INSERT INTO cs2_matches (
  tournament_id, match_id, market_string, team_a, team_b, 
  match_date, round, best_of, status
) VALUES (
  'cs2-ewc-2025',
  'cs2_tbd_tbd_qf_677178',
  'CS2_EWC25_F_TBD_TBD_0822',
  'TBD',
  'TBD',
  to_timestamp(1755882000),
  'Quarter Final 2',
  5,
  'scheduled'
);
INSERT INTO cs2_matches (
  tournament_id, match_id, market_string, team_a, team_b, 
  match_date, round, best_of, status
) VALUES (
  'cs2-ewc-2025',
  'cs2_tbd_tbd_qf_677178',
  'CS2_EWC25_F_TBD_TBD_0822',
  'TBD',
  'TBD',
  to_timestamp(1755889200),
  'Quarter Final 3',
  5,
  'scheduled'
);
INSERT INTO cs2_matches (
  tournament_id, match_id, market_string, team_a, team_b, 
  match_date, round, best_of, status
) VALUES (
  'cs2-ewc-2025',
  'cs2_tbd_tbd_qf_677178',
  'CS2_EWC25_F_TBD_TBD_0822',
  'TBD',
  'TBD',
  to_timestamp(1755896400),
  'Quarter Final 4',
  5,
  'scheduled'
);
INSERT INTO cs2_matches (
  tournament_id, match_id, market_string, team_a, team_b, 
  match_date, round, best_of, status
) VALUES (
  'cs2-ewc-2025',
  'cs2_tbd_tbd_sf_677178',
  'CS2_EWC25_F_TBD_TBD_0823',
  'TBD',
  'TBD',
  to_timestamp(1755964800),
  'Semi Final 1',
  5,
  'scheduled'
);
INSERT INTO cs2_matches (
  tournament_id, match_id, market_string, team_a, team_b, 
  match_date, round, best_of, status
) VALUES (
  'cs2-ewc-2025',
  'cs2_tbd_tbd_sf_677178',
  'CS2_EWC25_F_TBD_TBD_0823',
  'TBD',
  'TBD',
  to_timestamp(1755975600),
  'Semi Final 2',
  5,
  'scheduled'
);
INSERT INTO cs2_matches (
  tournament_id, match_id, market_string, team_a, team_b, 
  match_date, round, best_of, status
) VALUES (
  'cs2-ewc-2025',
  'cs2_tbd_tbd_gf_677178',
  'CS2_EWC25_F_TBD_TBD_0824',
  'TBD',
  'TBD',
  to_timestamp(1756058400),
  'Grand Final',
  5,
  'scheduled'
);

-- Update tournament stats
UPDATE parlay_tournaments 
SET total_matches = (
  SELECT COUNT(*) FROM cs2_matches 
  WHERE tournament_id = 'cs2-ewc-2025'
)
WHERE tournament_id = 'cs2-ewc-2025';
