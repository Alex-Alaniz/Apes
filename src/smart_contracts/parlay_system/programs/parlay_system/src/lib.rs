use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer, Mint};

declare_id!("CS2ParlayBettingSystemV1");

#[program]
pub mod parlay_system {
    use super::*;

    /// Initialize the parlay betting system
    pub fn initialize_parlay_system(
        ctx: Context<InitializeParlaySystem>,
        authority: Pubkey,
        treasury: Pubkey,
        burn_percentage_bet: u16,    // e.g., 250 = 2.5%
        burn_percentage_claim: u16,  // e.g., 150 = 1.5%
    ) -> Result<()> {
        let parlay_state = &mut ctx.accounts.parlay_state;
        parlay_state.authority = authority;
        parlay_state.treasury = treasury;
        parlay_state.burn_percentage_bet = burn_percentage_bet;
        parlay_state.burn_percentage_claim = burn_percentage_claim;
        parlay_state.total_volume = 0;
        parlay_state.total_payouts = 0;
        parlay_state.active_liability = 0;
        parlay_state.bump = ctx.bumps.parlay_state;
        Ok(())
    }

    /// Create a new tournament
    pub fn create_tournament(
        ctx: Context<CreateTournament>,
        tournament_id: String,
        name: String,
        base_multiplier: u64,      // e.g., 1800 = 1.8x (scaled by 1000)
        multiplier_increment: u64, // e.g., 500 = 0.5x
        min_selections: u8,
        max_exposure: u64,         // Maximum APES exposure per tournament
    ) -> Result<()> {
        require!(tournament_id.len() <= 32, ErrorCode::TournamentIdTooLong);
        require!(name.len() <= 64, ErrorCode::NameTooLong);
        require!(min_selections >= 2, ErrorCode::MinSelectionsTooLow);

        let tournament = &mut ctx.accounts.tournament;
        tournament.tournament_id = tournament_id;
        tournament.name = name;
        tournament.base_multiplier = base_multiplier;
        tournament.multiplier_increment = multiplier_increment;
        tournament.min_selections = min_selections;
        tournament.max_exposure = max_exposure;
        tournament.total_volume = 0;
        tournament.total_payouts = 0;
        tournament.active_liability = 0;
        tournament.status = TournamentStatus::Active;
        tournament.bump = ctx.bumps.tournament;
        Ok(())
    }

    /// Place a parlay bet with multiple selections
    pub fn place_parlay_bet(
        ctx: Context<PlaceParlayBet>,
        bet_id: String,
        selections: Vec<Selection>,
        amount: u64,
    ) -> Result<()> {
        require!(bet_id.len() <= 32, ErrorCode::BetIdTooLong);
        require!(selections.len() >= ctx.accounts.tournament.min_selections as usize, ErrorCode::InsufficientSelections);
        require!(selections.len() <= 10, ErrorCode::TooManySelections);
        require!(amount > 0, ErrorCode::InvalidAmount);

        let tournament = &mut ctx.accounts.tournament;
        let parlay_state = &mut ctx.accounts.parlay_state;
        let parlay_bet = &mut ctx.accounts.parlay_bet;

        // Calculate multiplier and potential payout
        let multiplier = tournament.base_multiplier + 
            (tournament.multiplier_increment * (selections.len() as u64 - 1));
        let potential_payout = (amount * multiplier) / 1000; // Divide by 1000 for scaling

        // Risk control: Check exposure limits
        require!(
            tournament.active_liability + potential_payout <= tournament.max_exposure,
            ErrorCode::ExposureLimitExceeded
        );

        // Calculate burn amount (2.5% of bet)
        let burn_amount = (amount * parlay_state.burn_percentage_bet as u64) / 10000;
        let escrow_amount = amount - burn_amount;

        // Transfer tokens to escrow (minus burn)
        let cpi_accounts = Transfer {
            from: ctx.accounts.user_token_account.to_account_info(),
            to: ctx.accounts.escrow_account.to_account_info(),
            authority: ctx.accounts.user.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::transfer(cpi_ctx, escrow_amount)?;

        // Burn tokens if burn_amount > 0
        if burn_amount > 0 {
            let burn_cpi_accounts = Transfer {
                from: ctx.accounts.user_token_account.to_account_info(),
                to: ctx.accounts.burn_account.to_account_info(),
                authority: ctx.accounts.user.to_account_info(),
            };
            let burn_cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), burn_cpi_accounts);
            token::transfer(burn_cpi_ctx, burn_amount)?;
        }

        // Store bet information
        parlay_bet.bet_id = bet_id;
        parlay_bet.user = ctx.accounts.user.key();
        parlay_bet.tournament = ctx.accounts.tournament.key();
        parlay_bet.selections = selections;
        parlay_bet.amount = amount;
        parlay_bet.potential_payout = potential_payout;
        parlay_bet.multiplier = multiplier;
        parlay_bet.status = BetStatus::Active;
        parlay_bet.placed_at = Clock::get()?.unix_timestamp;
        parlay_bet.bump = ctx.bumps.parlay_bet;

        // Update statistics
        tournament.total_volume += amount;
        tournament.active_liability += potential_payout;
        parlay_state.total_volume += amount;
        parlay_state.active_liability += potential_payout;

        emit!(ParlayBetPlaced {
            bet_id: parlay_bet.bet_id.clone(),
            user: ctx.accounts.user.key(),
            tournament_id: tournament.tournament_id.clone(),
            amount,
            potential_payout,
            multiplier,
            selections_count: selections.len() as u8,
        });

        Ok(())
    }

    /// Resolve a parlay bet (admin only)
    pub fn resolve_parlay_bet(
        ctx: Context<ResolveParlayBet>,
        won: bool,
    ) -> Result<()> {
        let parlay_bet = &mut ctx.accounts.parlay_bet;
        let tournament = &mut ctx.accounts.tournament;
        let parlay_state = &mut ctx.accounts.parlay_state;

        require!(parlay_bet.status == BetStatus::Active, ErrorCode::BetAlreadyResolved);

        if won {
            parlay_bet.status = BetStatus::Won;
            
            // Calculate claim burn (1.5% of payout)
            let burn_amount = (parlay_bet.potential_payout * parlay_state.burn_percentage_claim as u64) / 10000;
            let payout_amount = parlay_bet.potential_payout - burn_amount;

            // Transfer payout from escrow to user (minus burn)
            let seeds = &[
                b"parlay_bet",
                parlay_bet.bet_id.as_bytes(),
                ctx.accounts.user.key().as_ref(),
                &[parlay_bet.bump],
            ];
            let signer = &[&seeds[..]];

            let cpi_accounts = Transfer {
                from: ctx.accounts.escrow_account.to_account_info(),
                to: ctx.accounts.user_token_account.to_account_info(),
                authority: ctx.accounts.parlay_bet.to_account_info(),
            };
            let cpi_program = ctx.accounts.token_program.to_account_info();
            let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
            token::transfer(cpi_ctx, payout_amount)?;

            // Burn the claim fee if > 0
            if burn_amount > 0 {
                let burn_cpi_accounts = Transfer {
                    from: ctx.accounts.escrow_account.to_account_info(),
                    to: ctx.accounts.burn_account.to_account_info(),
                    authority: ctx.accounts.parlay_bet.to_account_info(),
                };
                let burn_cpi_ctx = CpiContext::new_with_signer(ctx.accounts.token_program.to_account_info(), burn_cpi_accounts, signer);
                token::transfer(burn_cpi_ctx, burn_amount)?;
            }

            // Update statistics
            tournament.total_payouts += parlay_bet.potential_payout;
            parlay_state.total_payouts += parlay_bet.potential_payout;

            emit!(ParlayBetWon {
                bet_id: parlay_bet.bet_id.clone(),
                user: parlay_bet.user,
                payout_amount,
                burn_amount,
            });
        } else {
            parlay_bet.status = BetStatus::Lost;
            
            // Transfer remaining escrow to treasury (house keeps the bet)
            let seeds = &[
                b"parlay_bet",
                parlay_bet.bet_id.as_bytes(),
                parlay_bet.user.as_ref(),
                &[parlay_bet.bump],
            ];
            let signer = &[&seeds[..]];

            let cpi_accounts = Transfer {
                from: ctx.accounts.escrow_account.to_account_info(),
                to: ctx.accounts.treasury_account.to_account_info(),
                authority: ctx.accounts.parlay_bet.to_account_info(),
            };
            let cpi_program = ctx.accounts.token_program.to_account_info();
            let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
            token::transfer(cpi_ctx, parlay_bet.amount)?;

            emit!(ParlayBetLost {
                bet_id: parlay_bet.bet_id.clone(),
                user: parlay_bet.user,
                amount: parlay_bet.amount,
            });
        }

        // Reduce active liability
        tournament.active_liability -= parlay_bet.potential_payout;
        parlay_state.active_liability -= parlay_bet.potential_payout;

        Ok(())
    }

    /// Emergency pause system (admin only)
    pub fn set_emergency_pause(
        ctx: Context<SetEmergencyPause>,
        paused: bool,
    ) -> Result<()> {
        let parlay_state = &mut ctx.accounts.parlay_state;
        parlay_state.emergency_paused = paused;

        emit!(EmergencyPauseChanged { paused });
        Ok(())
    }

    /// Update tournament exposure limit (admin only)
    pub fn update_tournament_exposure(
        ctx: Context<UpdateTournamentExposure>,
        new_max_exposure: u64,
    ) -> Result<()> {
        let tournament = &mut ctx.accounts.tournament;
        tournament.max_exposure = new_max_exposure;

        emit!(TournamentExposureUpdated {
            tournament_id: tournament.tournament_id.clone(),
            new_max_exposure,
        });
        Ok(())
    }
}

// Context Structs
#[derive(Accounts)]
pub struct InitializeParlaySystem<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + ParlayState::LEN,
        seeds = [b"parlay_state"],
        bump
    )]
    pub parlay_state: Account<'info, ParlayState>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(tournament_id: String)]
pub struct CreateTournament<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + Tournament::LEN,
        seeds = [b"tournament", tournament_id.as_bytes()],
        bump
    )]
    pub tournament: Account<'info, Tournament>,
    
    #[account(
        seeds = [b"parlay_state"],
        bump = parlay_state.bump,
        constraint = parlay_state.authority == authority.key()
    )]
    pub parlay_state: Account<'info, ParlayState>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(bet_id: String)]
pub struct PlaceParlayBet<'info> {
    #[account(
        init,
        payer = user,
        space = 8 + ParlayBet::LEN,
        seeds = [b"parlay_bet", bet_id.as_bytes(), user.key().as_ref()],
        bump
    )]
    pub parlay_bet: Account<'info, ParlayBet>,
    
    #[account(
        mut,
        seeds = [b"tournament", tournament.tournament_id.as_bytes()],
        bump = tournament.bump,
        constraint = tournament.status == TournamentStatus::Active
    )]
    pub tournament: Account<'info, Tournament>,
    
    #[account(
        mut,
        seeds = [b"parlay_state"],
        bump = parlay_state.bump,
        constraint = !parlay_state.emergency_paused
    )]
    pub parlay_state: Account<'info, ParlayState>,
    
    #[account(mut)]
    pub user: Signer<'info>,
    
    #[account(
        mut,
        constraint = user_token_account.owner == user.key()
    )]
    pub user_token_account: Account<'info, TokenAccount>,
    
    #[account(
        init_if_needed,
        payer = user,
        associated_token::mint = token_mint,
        associated_token::authority = parlay_bet,
    )]
    pub escrow_account: Account<'info, TokenAccount>,
    
    #[account(
        mut,
        constraint = burn_account.mint == token_mint.key()
    )]
    pub burn_account: Account<'info, TokenAccount>,
    
    pub token_mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, anchor_spl::associated_token::AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ResolveParlayBet<'info> {
    #[account(
        mut,
        seeds = [b"parlay_bet", parlay_bet.bet_id.as_bytes(), user.key().as_ref()],
        bump = parlay_bet.bump
    )]
    pub parlay_bet: Account<'info, ParlayBet>,
    
    #[account(
        mut,
        seeds = [b"tournament", tournament.tournament_id.as_bytes()],
        bump = tournament.bump
    )]
    pub tournament: Account<'info, Tournament>,
    
    #[account(
        mut,
        seeds = [b"parlay_state"],
        bump = parlay_state.bump,
        constraint = parlay_state.authority == authority.key()
    )]
    pub parlay_state: Account<'info, ParlayState>,
    
    pub authority: Signer<'info>,
    
    /// CHECK: User account for the bet
    pub user: UncheckedAccount<'info>,
    
    #[account(
        mut,
        constraint = user_token_account.owner == user.key()
    )]
    pub user_token_account: Account<'info, TokenAccount>,
    
    #[account(
        mut,
        associated_token::mint = token_mint,
        associated_token::authority = parlay_bet,
    )]
    pub escrow_account: Account<'info, TokenAccount>,
    
    #[account(
        mut,
        constraint = treasury_account.key() == parlay_state.treasury
    )]
    pub treasury_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub burn_account: Account<'info, TokenAccount>,
    
    pub token_mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct SetEmergencyPause<'info> {
    #[account(
        mut,
        seeds = [b"parlay_state"],
        bump = parlay_state.bump,
        constraint = parlay_state.authority == authority.key()
    )]
    pub parlay_state: Account<'info, ParlayState>,
    
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct UpdateTournamentExposure<'info> {
    #[account(
        mut,
        seeds = [b"tournament", tournament.tournament_id.as_bytes()],
        bump = tournament.bump
    )]
    pub tournament: Account<'info, Tournament>,
    
    #[account(
        seeds = [b"parlay_state"],
        bump = parlay_state.bump,
        constraint = parlay_state.authority == authority.key()
    )]
    pub parlay_state: Account<'info, ParlayState>,
    
    pub authority: Signer<'info>,
}

// Account Structs
#[account]
pub struct ParlayState {
    pub authority: Pubkey,
    pub treasury: Pubkey,
    pub burn_percentage_bet: u16,
    pub burn_percentage_claim: u16,
    pub total_volume: u64,
    pub total_payouts: u64,
    pub active_liability: u64,
    pub emergency_paused: bool,
    pub bump: u8,
}

impl ParlayState {
    pub const LEN: usize = 32 + 32 + 2 + 2 + 8 + 8 + 8 + 1 + 1;
}

#[account]
pub struct Tournament {
    pub tournament_id: String,
    pub name: String,
    pub base_multiplier: u64,
    pub multiplier_increment: u64,
    pub min_selections: u8,
    pub max_exposure: u64,
    pub total_volume: u64,
    pub total_payouts: u64,
    pub active_liability: u64,
    pub status: TournamentStatus,
    pub bump: u8,
}

impl Tournament {
    pub const LEN: usize = 4 + 32 + 4 + 64 + 8 + 8 + 1 + 8 + 8 + 8 + 8 + 1 + 1;
}

#[account]
pub struct ParlayBet {
    pub bet_id: String,
    pub user: Pubkey,
    pub tournament: Pubkey,
    pub selections: Vec<Selection>,
    pub amount: u64,
    pub potential_payout: u64,
    pub multiplier: u64,
    pub status: BetStatus,
    pub placed_at: i64,
    pub bump: u8,
}

impl ParlayBet {
    pub const LEN: usize = 4 + 32 + 32 + 32 + 4 + (10 * Selection::LEN) + 8 + 8 + 8 + 1 + 8 + 1;
}

// Data Structs
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct Selection {
    pub match_id: String,
    pub selected_team: String,
    pub market_string: String,  // On-chain identifier for the match
}

impl Selection {
    pub const LEN: usize = 4 + 32 + 4 + 32 + 4 + 32;  // Added market_string field
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq)]
pub enum BetStatus {
    Active,
    Won,
    Lost,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq)]
pub enum TournamentStatus {
    Active,
    Paused,
    Completed,
}

// Events
#[event]
pub struct ParlayBetPlaced {
    pub bet_id: String,
    pub user: Pubkey,
    pub tournament_id: String,
    pub amount: u64,
    pub potential_payout: u64,
    pub multiplier: u64,
    pub selections_count: u8,
}

#[event]
pub struct ParlayBetWon {
    pub bet_id: String,
    pub user: Pubkey,
    pub payout_amount: u64,
    pub burn_amount: u64,
}

#[event]
pub struct ParlayBetLost {
    pub bet_id: String,
    pub user: Pubkey,
    pub amount: u64,
}

#[event]
pub struct EmergencyPauseChanged {
    pub paused: bool,
}

#[event]
pub struct TournamentExposureUpdated {
    pub tournament_id: String,
    pub new_max_exposure: u64,
}

// Error Codes
#[error_code]
pub enum ErrorCode {
    #[msg("Tournament ID too long")]
    TournamentIdTooLong,
    #[msg("Name too long")]
    NameTooLong,
    #[msg("Minimum selections must be at least 2")]
    MinSelectionsTooLow,
    #[msg("Bet ID too long")]
    BetIdTooLong,
    #[msg("Insufficient selections for parlay")]
    InsufficientSelections,
    #[msg("Too many selections (max 10)")]
    TooManySelections,
    #[msg("Invalid bet amount")]
    InvalidAmount,
    #[msg("Exposure limit exceeded")]
    ExposureLimitExceeded,
    #[msg("Bet already resolved")]
    BetAlreadyResolved,
}