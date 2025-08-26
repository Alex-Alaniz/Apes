use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount, Mint};

pub mod market;
pub mod token;
pub mod access_control;
pub mod security_checks;
// pub mod utils;
// pub mod security_fixes;
// pub mod security_fixes_implementation;

use crate::market::market_system::*;
use crate::access_control::AccessControl;
use crate::security_checks::*;

declare_id!("APESCaeLW5RuxNnpNARtDZnSgeVFC5f37Z3VFNKupJUS");

// Global constants for safety
const MAX_POOL_SIZE: u64 = 1_000_000_000 * 1_000_000; // 1B with 6 decimals

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + 32 + 32 + 32 + 8 + 8 + 8 + 8 + 8 + 1, // discriminator + authority + token_mint + treasury + rates + totals + is_paused
        seeds = [b"platform_state"],
        bump
    )]
    pub platform_state: Account<'info, PlatformState>,
    #[account(mut)]
    pub authority: Signer<'info>,
    /// CHECK: Token mint for the platform
    pub token_mint: AccountInfo<'info>,
    /// CHECK: Treasury account
    pub treasury: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct InitializeAccessControl<'info> {
    #[account(
        init,
        payer = admin,
        space = 8 + AccessControl::LEN,
        seeds = [b"access_control"],
        bump
    )]
    pub access_control: Account<'info, AccessControl>,
    #[account(mut)]
    pub admin: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct AddMarketCreator<'info> {
    #[account(
        mut,
        seeds = [b"access_control"],
        bump,
        has_one = admin @ ErrorCode::Unauthorized
    )]
    pub access_control: Account<'info, AccessControl>,
    #[account(mut)]
    pub admin: Signer<'info>,
}

#[derive(Accounts)]
pub struct RemoveMarketCreator<'info> {
    #[account(
        mut,
        seeds = [b"access_control"],
        bump,
        has_one = admin @ ErrorCode::Unauthorized
    )]
    pub access_control: Account<'info, AccessControl>,
    #[account(mut)]
    pub admin: Signer<'info>,
}

#[derive(Accounts)]
pub struct CreateMarket<'info> {
    #[account(
        init,
        payer = creator,
        space = 8 + Market::LEN
    )]
    pub market: Account<'info, Market>,
    #[account(
        seeds = [b"platform_state"],
        bump,
    )]
    pub platform_state: Account<'info, PlatformState>,
    #[account(mut)]
    pub creator: Signer<'info>,
    #[account(
        mut,
        constraint = creator_token_account.owner == creator.key() @ ErrorCode::Unauthorized,
        constraint = creator_token_account.mint == platform_state.token_mint @ ErrorCode::InvalidMint
    )]
    pub creator_token_account: Account<'info, TokenAccount>,
    #[account(
        init,
        payer = creator,
        seeds = [b"market_escrow", market.key().as_ref()],
        bump,
        token::mint = token_mint,
        token::authority = market_escrow,
    )]
    pub market_escrow: Account<'info, TokenAccount>,
    #[account(
        mut,
        constraint = burn_token_account.mint == platform_state.token_mint @ ErrorCode::InvalidMint
    )]
    pub burn_token_account: Account<'info, TokenAccount>,
    /// CHECK: Token mint for the market
    pub token_mint: AccountInfo<'info>,
    #[account(seeds = [b"access_control"], bump)]
    pub access_control: Account<'info, AccessControl>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
#[instruction(option_index: u8)]
pub struct PlacePrediction<'info> {
    #[account(
        mut,
        constraint = market.status == MarketStatus::Active @ ErrorCode::MarketNotActive
    )]
    pub market: Account<'info, Market>,
    #[account(
        seeds = [b"platform_state"],
        bump,
    )]
    pub platform_state: Account<'info, PlatformState>,
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(
        mut,
        constraint = user_token_account.owner == user.key() @ ErrorCode::Unauthorized,
        constraint = user_token_account.mint == market.token_mint @ ErrorCode::InvalidMint
    )]
    pub user_token_account: Account<'info, TokenAccount>,
    #[account(
        mut,
        seeds = [b"market_escrow", market.key().as_ref()],
        bump,
    )]
    pub market_escrow: Account<'info, TokenAccount>,
    #[account(
        mut,
        constraint = burn_token_account.mint == market.token_mint @ ErrorCode::InvalidMint
    )]
    pub burn_token_account: Account<'info, TokenAccount>,
    #[account(
        mut,
        constraint = treasury_token_account.mint == market.token_mint @ ErrorCode::InvalidMint
    )]
    pub treasury_token_account: Account<'info, TokenAccount>,
    #[account(
        init_if_needed,
        payer = user,
        space = 8 + Prediction::LEN,
        seeds = [b"prediction", market.key().as_ref(), user.key().as_ref(), &[option_index]],
        bump
    )]
    pub prediction: Account<'info, Prediction>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct ResolveMarket<'info> {
    #[account(
        mut,
        constraint = market.status == MarketStatus::Active @ ErrorCode::MarketNotActive
    )]
    pub market: Account<'info, Market>,
    pub resolver: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(option_index: u8)]
pub struct ClaimReward<'info> {
    #[account(
        constraint = market.status == MarketStatus::Resolved @ ErrorCode::MarketNotResolved
    )]
    pub market: Account<'info, Market>,
    #[account(
        seeds = [b"platform_state"],
        bump,
    )]
    pub platform_state: Account<'info, PlatformState>,
    #[account(
        mut,
        seeds = [b"prediction", market.key().as_ref(), user.key().as_ref(), &[option_index]],
        bump,
        constraint = prediction.user == user.key() @ ErrorCode::Unauthorized,
        constraint = !prediction.claimed @ ErrorCode::AlreadyClaimed
    )]
    pub prediction: Account<'info, Prediction>,
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(
        mut,
        constraint = user_token_account.owner == user.key() @ ErrorCode::Unauthorized,
        constraint = user_token_account.mint == market.token_mint @ ErrorCode::InvalidMint
    )]
    pub user_token_account: Account<'info, TokenAccount>,
    #[account(
        mut,
        seeds = [b"market_escrow", market.key().as_ref()],
        bump,
    )]
    pub market_escrow: Account<'info, TokenAccount>,
    #[account(
        mut,
        constraint = creator_token_account.owner == market.creator @ ErrorCode::Unauthorized,
        constraint = creator_token_account.mint == market.token_mint @ ErrorCode::InvalidMint
    )]
    pub creator_token_account: Account<'info, TokenAccount>,
    #[account(
        mut,
        constraint = burn_token_account.mint == market.token_mint @ ErrorCode::InvalidMint
    )]
    pub burn_token_account: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct CancelMarket<'info> {
    #[account(
        mut,
        constraint = market.status == MarketStatus::Active @ ErrorCode::MarketNotActive,
        constraint = authority.key() == market.authority @ ErrorCode::Unauthorized
    )]
    pub market: Account<'info, Market>,
    pub authority: Signer<'info>,
}

// ============================================================================
// PARLAY CONTEXT STRUCTS
// ============================================================================

#[derive(Accounts)]
#[instruction(tournament_id: [u8; 32])]
pub struct CreateParlayTournament<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + ParlayTournament::LEN,
        seeds = [b"parlay_tournament", tournament_id.as_ref()],
        bump
    )]
    pub tournament: Account<'info, ParlayTournament>,
    #[account(
        seeds = [b"platform_state"],
        bump,
    )]
    pub platform_state: Account<'info, PlatformState>,
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(seeds = [b"access_control"], bump)]
    pub access_control: Account<'info, AccessControl>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(match_id: [u8; 32])]
pub struct CreateParlayMatch<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + ParlayMatch::LEN,
        seeds = [b"parlay_match", tournament.key().as_ref(), match_id.as_ref()],
        bump
    )]
    pub parlay_match: Account<'info, ParlayMatch>,
    #[account(
        mut,
        seeds = [b"parlay_tournament", tournament.tournament_id.as_ref()],
        bump,
        constraint = tournament.authority == authority.key() @ ErrorCode::Unauthorized
    )]
    pub tournament: Account<'info, ParlayTournament>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(bet_id: [u8; 32])]
pub struct PlaceParlayBet<'info> {
    #[account(
        init,
        payer = user,
        space = 8 + ParlayBet::LEN,
        seeds = [b"parlay_bet", tournament.key().as_ref(), user.key().as_ref(), bet_id.as_ref()],
        bump
    )]
    pub parlay_bet: Account<'info, ParlayBet>,
    #[account(
        mut,
        seeds = [b"parlay_tournament", tournament.tournament_id.as_ref()],
        bump,
        constraint = tournament.status == TournamentStatus::Active @ ErrorCode::TournamentNotActive
    )]
    pub tournament: Account<'info, ParlayTournament>,
    #[account(
        seeds = [b"platform_state"],
        bump,
    )]
    pub platform_state: Account<'info, PlatformState>,
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(
        mut,
        constraint = user_token_account.owner == user.key() @ ErrorCode::Unauthorized,
        constraint = user_token_account.mint == platform_state.token_mint @ ErrorCode::InvalidMint
    )]
    pub user_token_account: Account<'info, TokenAccount>,
    #[account(
        init,
        payer = user,
        seeds = [b"parlay_escrow", parlay_bet.key().as_ref()],
        bump,
        token::mint = token_mint,
        token::authority = parlay_escrow,
    )]
    pub parlay_escrow: Account<'info, TokenAccount>,
    #[account(
        mut,
        constraint = burn_token_account.mint == platform_state.token_mint @ ErrorCode::InvalidMint
    )]
    pub burn_token_account: Account<'info, TokenAccount>,
    #[account(
        mut,
        constraint = treasury_token_account.mint == platform_state.token_mint @ ErrorCode::InvalidMint
    )]
    pub treasury_token_account: Account<'info, TokenAccount>,
    /// CHECK: Token mint for the tournament
    pub token_mint: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct CreateParlaySelection<'info> {
    #[account(
        init,
        payer = user,
        space = 8 + ParlaySelection::LEN,
        seeds = [b"parlay_selection", parlay_bet.key().as_ref(), parlay_match.key().as_ref()],
        bump
    )]
    pub parlay_selection: Account<'info, ParlaySelection>,
    #[account(
        mut,
        seeds = [b"parlay_bet", tournament.key().as_ref(), user.key().as_ref(), parlay_bet.bet_id.as_ref()],
        bump,
        constraint = parlay_bet.user == user.key() @ ErrorCode::Unauthorized
    )]
    pub parlay_bet: Account<'info, ParlayBet>,
    #[account(
        seeds = [b"parlay_match", tournament.key().as_ref(), parlay_match.match_id.as_ref()],
        bump
    )]
    pub parlay_match: Account<'info, ParlayMatch>,
    #[account(
        seeds = [b"parlay_tournament", tournament.tournament_id.as_ref()],
        bump
    )]
    pub tournament: Account<'info, ParlayTournament>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ResolveParlayMatch<'info> {
    #[account(
        mut,
        seeds = [b"parlay_match", tournament.key().as_ref(), parlay_match.match_id.as_ref()],
        bump,
        constraint = parlay_match.status == MatchStatus::Scheduled || parlay_match.status == MatchStatus::Live @ ErrorCode::InvalidMatch
    )]
    pub parlay_match: Account<'info, ParlayMatch>,
    #[account(
        seeds = [b"parlay_tournament", tournament.tournament_id.as_ref()],
        bump,
        constraint = tournament.authority == authority.key() @ ErrorCode::Unauthorized
    )]
    pub tournament: Account<'info, ParlayTournament>,
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct ClaimParlayReward<'info> {
    #[account(
        mut,
        seeds = [b"parlay_bet", tournament.key().as_ref(), user.key().as_ref(), parlay_bet.bet_id.as_ref()],
        bump,
        constraint = parlay_bet.user == user.key() @ ErrorCode::Unauthorized,
        constraint = parlay_bet.status == ParlayStatus::Won @ ErrorCode::ParlayNotEligible,
        constraint = !parlay_bet.payout_claimed @ ErrorCode::AlreadyClaimed
    )]
    pub parlay_bet: Account<'info, ParlayBet>,
    #[account(
        seeds = [b"parlay_tournament", tournament.tournament_id.as_ref()],
        bump
    )]
    pub tournament: Account<'info, ParlayTournament>,
    #[account(
        seeds = [b"platform_state"],
        bump,
    )]
    pub platform_state: Account<'info, PlatformState>,
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(
        mut,
        constraint = user_token_account.owner == user.key() @ ErrorCode::Unauthorized,
        constraint = user_token_account.mint == platform_state.token_mint @ ErrorCode::InvalidMint
    )]
    pub user_token_account: Account<'info, TokenAccount>,
    #[account(
        mut,
        seeds = [b"parlay_escrow", parlay_bet.key().as_ref()],
        bump,
    )]
    pub parlay_escrow: Account<'info, TokenAccount>,
    #[account(
        mut,
        constraint = burn_token_account.mint == platform_state.token_mint @ ErrorCode::InvalidMint
    )]
    pub burn_token_account: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
#[instruction(option_index: u8)]
pub struct EmergencyWithdraw<'info> {
    #[account(
        constraint = market.status == MarketStatus::Cancelled @ ErrorCode::MarketNotCancelled
    )]
    pub market: Account<'info, Market>,
    #[account(
        mut,
        seeds = [b"prediction", market.key().as_ref(), user.key().as_ref(), &[option_index]],
        bump,
        constraint = prediction.user == user.key() @ ErrorCode::Unauthorized,
        constraint = !prediction.claimed @ ErrorCode::AlreadyClaimed
    )]
    pub prediction: Account<'info, Prediction>,
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(
        mut,
        constraint = user_token_account.owner == user.key() @ ErrorCode::Unauthorized,
        constraint = user_token_account.mint == market.token_mint @ ErrorCode::InvalidMint
    )]
    pub user_token_account: Account<'info, TokenAccount>,
    #[account(
        mut,
        seeds = [b"market_escrow", market.key().as_ref()],
        bump,
    )]
    pub market_escrow: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[account]
pub struct Market {
    pub authority: Pubkey,
    pub creator: Pubkey,
    pub market_type: MarketType,
    pub question: [u8; 200],        // Fixed 200 bytes for question
    pub question_len: u16,          // Actual length of question
    pub option_1: [u8; 50],         // Fixed size for option 1
    pub option_2: [u8; 50],         // Fixed size for option 2
    pub option_3: [u8; 50],         // Fixed size for option 3 (if needed)
    pub option_4: [u8; 50],         // Fixed size for option 4 (if needed)
    pub option_count: u8,           // Number of options (2-4)
    pub resolution_date: i64,
    pub creator_fee_rate: u64,
    pub min_bet_amount: u64,
    pub token_mint: Pubkey,
    pub status: MarketStatus,
    pub winning_option: Option<u8>,
    pub option_1_pool: u64,         // Pool for option 1
    pub option_2_pool: u64,         // Pool for option 2
    pub option_3_pool: u64,         // Pool for option 3
    pub option_4_pool: u64,         // Pool for option 4
    pub total_pool: u64,
    pub market_id: [u8; 32],        // Fixed size ID
    pub category: [u8; 20],         // Fixed size category
}

impl Market {
    // Fixed size allocation
    pub const LEN: usize = 32 + // authority
                           32 + // creator
                           33 + // market_type (enum with padding)
                           200 + // question
                           2 +  // question_len
                           50 + // option_1
                           50 + // option_2
                           50 + // option_3
                           50 + // option_4
                           1 +  // option_count
                           8 +  // resolution_date
                           8 +  // creator_fee_rate
                           8 +  // min_bet_amount
                           32 + // token_mint
                           33 + // status (enum with padding)
                           2 +  // winning_option (Option<u8>)
                           8 +  // option_1_pool
                           8 +  // option_2_pool
                           8 +  // option_3_pool
                           8 +  // option_4_pool
                           8 +  // total_pool
                           32 + // market_id
                           20;  // category
}

#[account]
pub struct Prediction {
    pub user: Pubkey,
    pub option_index: u8,
    pub amount: u64,
    pub timestamp: i64,
    pub claimed: bool,
}

impl Prediction {
    pub const LEN: usize = 32 + // user
                           1 +  // option_index
                           8 +  // amount
                           8 +  // timestamp
                           1;   // claimed
}

#[account]
pub struct PlatformState {
    pub authority: Pubkey,
    pub token_mint: Pubkey,
    pub treasury: Pubkey,
    pub bet_burn_rate: u64,    // In basis points (1% = 100)
    pub claim_burn_rate: u64,  // In basis points (1% = 100)
    pub platform_fee_rate: u64, // In basis points (1% = 100)
    pub total_burned: u64,
    pub total_volume: u64,
    pub is_paused: bool,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
pub enum MarketType {
    Binary,
    MultiOption,
    Range,
    Timeline,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, Debug)]
pub enum MarketStatus {
    Active,
    Resolved,
    Cancelled,
}

#[program]
pub mod market_system {
    use super::*;
    use anchor_spl::token::{self, Token, TokenAccount, Transfer};
    use anchor_lang::solana_program::program::invoke;
    use anchor_lang::solana_program::system_instruction;

    pub fn initialize(
        ctx: Context<Initialize>,
        bet_burn_rate: u64,
        claim_burn_rate: u64,
        platform_fee_rate: u64,
    ) -> Result<()> {
        let platform_state = &mut ctx.accounts.platform_state;
        
        // Initialize platform state
        platform_state.authority = ctx.accounts.authority.key();
        platform_state.token_mint = ctx.accounts.token_mint.key();
        platform_state.treasury = ctx.accounts.treasury.key();
        platform_state.bet_burn_rate = bet_burn_rate;
        platform_state.claim_burn_rate = claim_burn_rate;
        platform_state.platform_fee_rate = platform_fee_rate;
        platform_state.total_burned = 0;
        platform_state.total_volume = 0;
        platform_state.is_paused = false;
        
        msg!("Platform initialized!");
        msg!("Authority: {}", platform_state.authority);
        msg!("Token mint: {}", platform_state.token_mint);
        msg!("Treasury: {}", platform_state.treasury);
        msg!("Bet burn rate: {}bp", bet_burn_rate);
        msg!("Claim burn rate: {}bp", claim_burn_rate);
        msg!("Platform fee rate: {}bp", platform_fee_rate);
        
        Ok(())
    }

    pub fn initialize_access_control(ctx: Context<InitializeAccessControl>) -> Result<()> {
        let access_control = &mut ctx.accounts.access_control;
        access_control.admin = ctx.accounts.admin.key();
        access_control.market_creators = Vec::new();
        Ok(())
    }

    pub fn add_market_creator(ctx: Context<AddMarketCreator>, new_creator: Pubkey) -> Result<()> {
        let access_control = &mut ctx.accounts.access_control;
        require!(
            access_control.market_creators.len() < AccessControl::MAX_CREATORS,
            ErrorCode::TooManyMarketCreators
        );
        require!(
            !access_control.market_creators.contains(&new_creator),
            ErrorCode::Unauthorized
        );
        access_control.market_creators.push(new_creator);
        Ok(())
    }

    pub fn remove_market_creator(ctx: Context<RemoveMarketCreator>, creator: Pubkey) -> Result<()> {
        let access_control = &mut ctx.accounts.access_control;
        let index = access_control
            .market_creators
            .iter()
            .position(|&x| x == creator)
            .ok_or(ErrorCode::Unauthorized)?;
        access_control.market_creators.remove(index);
        Ok(())
    }

    pub fn create_market(
        ctx: Context<CreateMarket>,
        market_type: MarketType,
        question: [u8; 200],        // Changed from String
        question_len: u16,          // Actual length
        option_1: [u8; 50],         // Changed from Vec<String>
        option_2: [u8; 50],
        option_3: [u8; 50],         // Optional, use empty array if not needed
        option_4: [u8; 50],         // Optional, use empty array if not needed
        option_count: u8,           // Number of actual options (2-4)
        resolution_date: i64,
        creator_fee_rate: u64,
        min_bet_amount: u64,
        market_id: [u8; 32],        // Changed from String
        market_id_len: u8,          // Actual length
        creator_stake_amount: u64,
        category: [u8; 20],         // Changed from String
        category_len: u8,           // Actual length
    ) -> Result<()> {
        let ac = &ctx.accounts.access_control;
        let creator = ctx.accounts.creator.key();
        require!(creator == ac.admin || ac.market_creators.contains(&creator), ErrorCode::Unauthorized);
        
        let market = &mut ctx.accounts.market;
        let platform_state = &ctx.accounts.platform_state;
        let current_time = Clock::get()?.unix_timestamp;
        
        // Security validations
        require!(!platform_state.is_paused, ErrorCode::PlatformPaused);
        require!(option_count >= 2, ErrorCode::InsufficientOptions);
        require!(option_count <= 4, ErrorCode::TooManyOptions);
        
        // Validate market duration
        security_checks::validate_market_duration(resolution_date, current_time)?;
        
        // Validate fee rate
        security_checks::validate_fee_rate(creator_fee_rate)?;
        
        // Validate string lengths
        security_checks::validate_string_length(question_len as usize, 200)?;
        security_checks::validate_string_length(market_id_len as usize, 32)?;
        security_checks::validate_string_length(category_len as usize, 20)?;
        
        // Validate stake amount
        security_checks::validate_bet_amount(creator_stake_amount, min_bet_amount)?;
        
        market.authority = platform_state.authority;
        market.creator = ctx.accounts.creator.key();
        market.market_type = market_type.clone();
        
        // Initialize arrays
        market.question = [0u8; 200];
        market.option_1 = [0u8; 50];
        market.option_2 = [0u8; 50];
        market.option_3 = [0u8; 50];
        market.option_4 = [0u8; 50];
        market.market_id = [0u8; 32];
        market.category = [0u8; 20];
        
        // Copy data
        market.question_len = question_len;
        market.question[..question_len as usize].copy_from_slice(&question[..question_len as usize]);
        
        market.option_count = option_count;
        market.option_1.copy_from_slice(&option_1);
        market.option_2.copy_from_slice(&option_2);
        if option_count > 2 {
            market.option_3.copy_from_slice(&option_3);
        }
        if option_count > 3 {
            market.option_4.copy_from_slice(&option_4);
        }
        
        market.market_id[..market_id_len as usize].copy_from_slice(&market_id[..market_id_len as usize]);
        market.category[..category_len as usize].copy_from_slice(&category[..category_len as usize]);
        
        market.resolution_date = resolution_date;
        market.creator_fee_rate = creator_fee_rate;
        market.min_bet_amount = min_bet_amount;
        market.token_mint = platform_state.token_mint;
        market.status = MarketStatus::Active;
        market.winning_option = None;
        market.total_pool = 0;
        
        // Initialize all pools to 0
        market.option_1_pool = 0;
        market.option_2_pool = 0;
        market.option_3_pool = 0;
        market.option_4_pool = 0;
        let stake_amount = creator_stake_amount;
        let burn_amount = stake_amount
            .checked_mul(50)
            .ok_or(ErrorCode::CalculationError)?
            .checked_div(10000)
            .ok_or(ErrorCode::CalculationError)?;
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.creator_token_account.to_account_info(),
                    to: ctx.accounts.market_escrow.to_account_info(),
                    authority: ctx.accounts.creator.to_account_info(),
                },
            ),
            stake_amount.checked_sub(burn_amount).ok_or(ErrorCode::CalculationError)?,
        )?;
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.creator_token_account.to_account_info(),
                    to: ctx.accounts.burn_token_account.to_account_info(),
                    authority: ctx.accounts.creator.to_account_info(),
                },
            ),
            burn_amount,
        )?;
        
        let market_id_str = String::from_utf8_lossy(&market.market_id);
        msg!("Market created: {}", market_id_str);
        msg!("Market type: {:?}", market_type);
        msg!("Resolution date: {}", resolution_date);
        msg!("Creator fee: {}bp", creator_fee_rate);
        msg!("Stake burn: {} tokens", burn_amount);
        Ok(())
    }

    pub fn place_prediction(
        ctx: Context<PlacePrediction>,
        option_index: u8,
        amount: u64,
    ) -> Result<()> {
        let market = &mut ctx.accounts.market;
        let platform_state = &ctx.accounts.platform_state;
        
        // Security validations
        require!(!platform_state.is_paused, ErrorCode::PlatformPaused);
        require!(market.status == MarketStatus::Active, ErrorCode::MarketNotActive);
        require!(
            Clock::get()?.unix_timestamp < market.resolution_date,
            ErrorCode::MarketClosed
        );
        
        // Validate option index
        security_checks::validate_option_index(option_index, market.option_count)?;
        
        // Validate bet amount
        security_checks::validate_bet_amount(amount, market.min_bet_amount)?;
        
        // Calculate fees using safe math
        let burn_amount = security_checks::safe_div(
            security_checks::safe_mul(amount, platform_state.bet_burn_rate)?,
            10000
        )?;
        
        let platform_fee = security_checks::safe_div(
            security_checks::safe_mul(amount, platform_state.platform_fee_rate)?,
            10000
        )?;
        
        let net_amount = security_checks::safe_sub(
            security_checks::safe_sub(amount, burn_amount)?,
            platform_fee
        )?;
        
        // Validate pool addition before any transfers
        security_checks::validate_pool_addition(market.total_pool, net_amount)?;
        
        // Update the correct option pool based on option_index
        match option_index {
            0 => {
                security_checks::validate_pool_addition(market.option_1_pool, net_amount)?;
                market.option_1_pool = market.option_1_pool
                    .checked_add(net_amount)
                    .ok_or(ErrorCode::CalculationError)?;
            },
            1 => {
                security_checks::validate_pool_addition(market.option_2_pool, net_amount)?;
                market.option_2_pool = market.option_2_pool
                    .checked_add(net_amount)
                    .ok_or(ErrorCode::CalculationError)?;
            },
            2 => {
                security_checks::validate_pool_addition(market.option_3_pool, net_amount)?;
                market.option_3_pool = market.option_3_pool
                    .checked_add(net_amount)
                    .ok_or(ErrorCode::CalculationError)?;
            },
            3 => {
                security_checks::validate_pool_addition(market.option_4_pool, net_amount)?;
                market.option_4_pool = market.option_4_pool
                    .checked_add(net_amount)
                    .ok_or(ErrorCode::CalculationError)?;
            },
            _ => return Err(ErrorCode::InvalidOptionIndex.into()),
        }
        
        // Update total pool
        market.total_pool = market.total_pool
            .checked_add(net_amount)
            .ok_or(ErrorCode::CalculationError)?;
        
        // Ensure total pool doesn't exceed safety cap
        require!(
            market.total_pool <= MAX_POOL_SIZE,
            ErrorCode::PoolOverflow
        );
        
        // Now perform token transfers after all validations pass
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.user_token_account.to_account_info(),
                    to: ctx.accounts.market_escrow.to_account_info(),
                    authority: ctx.accounts.user.to_account_info(),
                },
            ),
            net_amount,
        )?;
        
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.user_token_account.to_account_info(),
                    to: ctx.accounts.burn_token_account.to_account_info(),
                    authority: ctx.accounts.user.to_account_info(),
                },
            ),
            burn_amount,
        )?;
        
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.user_token_account.to_account_info(),
                    to: ctx.accounts.treasury_token_account.to_account_info(),
                    authority: ctx.accounts.user.to_account_info(),
                },
            ),
            platform_fee,
        )?;
        
        let prediction = &mut ctx.accounts.prediction;
        
        // Check if this is an existing prediction
        if prediction.user != Pubkey::default() {
            // Existing prediction - just add to the amount
            prediction.amount = prediction.amount
                .checked_add(net_amount)
                .ok_or(ErrorCode::CalculationError)?;
            
            msg!("Added to existing prediction on market: {}", String::from_utf8_lossy(&market.market_id));
            msg!("Option: {}", option_index);
            msg!("Previous amount: {} tokens", prediction.amount.saturating_sub(net_amount));
            msg!("Additional amount: {} tokens", net_amount);
            msg!("New total amount: {} tokens", prediction.amount);
        } else {
            // New prediction
            prediction.user = ctx.accounts.user.key();
            prediction.option_index = option_index;
            prediction.amount = net_amount;
            prediction.timestamp = Clock::get()?.unix_timestamp;
            prediction.claimed = false;
            
            msg!("New prediction placed on market: {}", String::from_utf8_lossy(&market.market_id));
            msg!("Option index: {}", option_index);
            msg!("Amount: {} tokens", amount);
            msg!("Net amount: {} tokens", net_amount);
        }
        
        msg!("Burn amount: {} tokens", burn_amount);
        msg!("Platform fee: {} tokens", platform_fee);
        Ok(())
    }

    pub fn resolve_market(
        ctx: Context<ResolveMarket>,
        winning_option: u8,
    ) -> Result<()> {
        let market = &mut ctx.accounts.market;
        
        // CRITICAL: Add authority check
        require!(
            ctx.accounts.resolver.key() == market.authority,
            ErrorCode::Unauthorized
        );
        
        // Validate market status
        require!(
            market.status == MarketStatus::Active,
            ErrorCode::MarketNotActive
        );
        
        // Validate winning option
        security_checks::validate_option_index(winning_option, market.option_count)?;
        
        // Update market status
        market.status = MarketStatus::Resolved;
        market.winning_option = Some(winning_option);
        
        msg!("Market resolved with winning option: {}", winning_option);
        Ok(())
    }

    pub fn claim_reward(ctx: Context<ClaimReward>, option_index: u8) -> Result<()> {
        let market = &ctx.accounts.market;
        let prediction = &mut ctx.accounts.prediction;
        let platform_state = &ctx.accounts.platform_state;
        
        // Security validations
        require!(market.status == MarketStatus::Resolved, ErrorCode::MarketNotResolved);
        require!(!prediction.claimed, ErrorCode::AlreadyClaimed);
        
        let winning_option = market.winning_option.ok_or(ErrorCode::MarketNotResolved)?;
        
        // Validate option index
        security_checks::validate_option_index(option_index, market.option_count)?;
        
        // Check if user is a winner
        let is_winner = option_index == winning_option;
        require!(is_winner, ErrorCode::NotWinner);
        
        // Get the winning pool based on winning option with bounds check
        let winning_pool = match winning_option {
            0 => market.option_1_pool,
            1 => market.option_2_pool,
            2 => market.option_3_pool,
            3 => market.option_4_pool,
            _ => return Err(ErrorCode::InvalidOptionIndex.into()),
        };
        
        // Ensure no division by zero
        require!(winning_pool > 0, ErrorCode::DivisionByZero);
        require!(prediction.amount > 0, ErrorCode::InvalidAmount);
        
        // Calculate reward using u128 to prevent overflow
        let total_pool = market.total_pool as u128;
        let user_amount = prediction.amount as u128;
        let win_pool = winning_pool as u128;
        
        // Calculate: (total_pool * user_amount) / winning_pool
        let reward_amount_u128 = total_pool
            .checked_mul(user_amount)
            .ok_or(ErrorCode::CalculationError)?
            .checked_div(win_pool)
            .ok_or(ErrorCode::CalculationError)?;
        
        // Ensure result fits in u64
        let reward_amount = u64::try_from(reward_amount_u128)
            .map_err(|_| ErrorCode::CalculationError)?;
        
        // Calculate fees using safe math
        let creator_fee = security_checks::safe_div(
            security_checks::safe_mul(reward_amount, market.creator_fee_rate)?,
            10000
        )?;
        
        let burn_amount = security_checks::safe_div(
            security_checks::safe_mul(reward_amount, platform_state.claim_burn_rate)?,
            10000
        )?;
        
        let net_reward = security_checks::safe_sub(
            security_checks::safe_sub(reward_amount, creator_fee)?,
            burn_amount
        )?;
        
        // Sanity check - ensure we're not paying out more than available
        let escrow_balance = ctx.accounts.market_escrow.amount;
        require!(
            net_reward + creator_fee + burn_amount <= escrow_balance,
            ErrorCode::InsufficientEscrowBalance
        );
        
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.market_escrow.to_account_info(),
                    to: ctx.accounts.user_token_account.to_account_info(),
                    authority: ctx.accounts.market_escrow.to_account_info(),
                },
                &[&[
                    b"market_escrow",
                    market.key().as_ref(),
                    &[ctx.bumps.market_escrow],
                ]],
            ),
            net_reward,
        )?;
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.market_escrow.to_account_info(),
                    to: ctx.accounts.creator_token_account.to_account_info(),
                    authority: ctx.accounts.market_escrow.to_account_info(),
                },
                &[&[
                    b"market_escrow",
                    market.key().as_ref(),
                    &[ctx.bumps.market_escrow],
                ]],
            ),
            creator_fee,
        )?;
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.market_escrow.to_account_info(),
                    to: ctx.accounts.burn_token_account.to_account_info(),
                    authority: ctx.accounts.market_escrow.to_account_info(),
                },
                &[&[
                    b"market_escrow",
                    market.key().as_ref(),
                    &[ctx.bumps.market_escrow],
                ]],
            ),
            burn_amount,
        )?;
        prediction.claimed = true;
        
        let market_id_str = String::from_utf8_lossy(&market.market_id);
        msg!("Reward claimed for market: {}", market_id_str);
        msg!("User: {}", prediction.user);
        msg!("Reward amount: {} tokens", reward_amount);
        msg!("Creator fee: {} tokens", creator_fee);
        msg!("Burn amount: {} tokens", burn_amount);
        msg!("Net reward: {} tokens", net_reward);
        Ok(())
    }

    pub fn cancel_market(ctx: Context<CancelMarket>) -> Result<()> {
        let market = &mut ctx.accounts.market;
        
        // Authority check is already in the account constraint, but let's be explicit
        require!(
            ctx.accounts.authority.key() == market.authority,
            ErrorCode::Unauthorized
        );
        
        require!(
            market.status == MarketStatus::Active,
            ErrorCode::MarketNotActive
        );
        
        market.status = MarketStatus::Cancelled;
        
        msg!("Market cancelled by authority");
        Ok(())
    }

    pub fn emergency_withdraw(ctx: Context<EmergencyWithdraw>, option_index: u8) -> Result<()> {
        let market = &ctx.accounts.market;
        let prediction = &mut ctx.accounts.prediction;
        
        // Security validations
        require!(market.status == MarketStatus::Cancelled, ErrorCode::MarketNotCancelled);
        require!(!prediction.claimed, ErrorCode::AlreadyClaimed);
        
        // Validate option index matches the prediction
        require!(prediction.option_index == option_index, ErrorCode::InvalidOptionIndex);
        
        // For cancelled markets, users get their original bet back
        let refund_amount = prediction.amount;
        
        // Ensure escrow has enough balance
        let escrow_balance = ctx.accounts.market_escrow.amount;
        require!(
            refund_amount <= escrow_balance,
            ErrorCode::InsufficientEscrowBalance
        );
        
        // Transfer the original bet amount back to the user
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.market_escrow.to_account_info(),
                    to: ctx.accounts.user_token_account.to_account_info(),
                    authority: ctx.accounts.market_escrow.to_account_info(),
                },
                &[&[
                    b"market_escrow",
                    market.key().as_ref(),
                    &[ctx.bumps.market_escrow],
                ]],
            ),
            refund_amount,
        )?;
        
        // Mark as claimed to prevent double withdrawal
        prediction.claimed = true;
        
        msg!("Emergency withdrawal completed");
        msg!("User: {}", prediction.user);
        msg!("Refund amount: {} tokens", refund_amount);
        
        Ok(())
    }

    // ============================================================================
    // PARLAY SYSTEM INSTRUCTIONS
    // ============================================================================

    pub fn create_parlay_tournament(
        ctx: Context<CreateParlayTournament>,
        tournament_id: [u8; 32],
        tournament_id_len: u8,
        name: [u8; 100],
        name_len: u8,
        start_date: i64,
        end_date: i64,
        min_selections: u8,
        max_selections: u8,
        base_multiplier: u64,  // e.g., 1800 = 1.8x
        multiplier_increment: u64, // e.g., 500 = 0.5x
        max_exposure: u64,
    ) -> Result<()> {
        let access_control = &ctx.accounts.access_control;
        let authority = ctx.accounts.authority.key();
        
        // Check authorization - admin or market creator
        require!(
            authority == access_control.admin || access_control.market_creators.contains(&authority),
            ErrorCode::Unauthorized
        );
        
        let tournament = &mut ctx.accounts.tournament;
        let platform_state = &ctx.accounts.platform_state;
        
        // Security validations
        require!(!platform_state.is_paused, ErrorCode::PlatformPaused);
        require!(min_selections >= 2, ErrorCode::InsufficientParlaySelections);
        require!(max_selections <= 10, ErrorCode::InvalidParlaySelections);
        require!(min_selections <= max_selections, ErrorCode::InvalidParlaySelections);
        require!(start_date < end_date, ErrorCode::InvalidResolutionDate);
        require!(base_multiplier >= 1000, ErrorCode::InvalidAmount); // At least 1.0x
        require!(multiplier_increment <= 1000, ErrorCode::InvalidAmount); // Max 1.0x increment
        
        // Validate string lengths
        security_checks::validate_string_length(tournament_id_len as usize, 32)?;
        security_checks::validate_string_length(name_len as usize, 100)?;
        
        // Initialize tournament
        tournament.tournament_id = [0u8; 32];
        tournament.tournament_id[..tournament_id_len as usize].copy_from_slice(&tournament_id[..tournament_id_len as usize]);
        tournament.tournament_id_len = tournament_id_len;
        
        tournament.name = [0u8; 100];
        tournament.name[..name_len as usize].copy_from_slice(&name[..name_len as usize]);
        tournament.name_len = name_len;
        
        tournament.authority = authority;
        tournament.token_mint = platform_state.token_mint;
        tournament.treasury = platform_state.treasury;
        tournament.status = TournamentStatus::Active;
        tournament.start_date = start_date;
        tournament.end_date = end_date;
        tournament.min_selections = min_selections;
        tournament.max_selections = max_selections;
        tournament.base_multiplier = base_multiplier;
        tournament.multiplier_increment = multiplier_increment;
        tournament.total_volume = 0;
        tournament.total_participants = 0;
        tournament.total_parlays = 0;
        tournament.max_exposure = max_exposure;
        tournament.current_exposure = 0;
        
        msg!("Parlay tournament created: {}", String::from_utf8_lossy(&tournament.name[..name_len as usize]));
        msg!("Tournament ID: {}", String::from_utf8_lossy(&tournament.tournament_id[..tournament_id_len as usize]));
        msg!("Base multiplier: {}x", base_multiplier as f64 / 1000.0);
        msg!("Increment: {}x", multiplier_increment as f64 / 1000.0);
        
        Ok(())
    }

    pub fn create_parlay_match(
        ctx: Context<CreateParlayMatch>,
        match_id: [u8; 32],
        match_id_len: u8,
        market_string: [u8; 50],
        market_string_len: u8,
        team_a: [u8; 50],
        team_a_len: u8,
        team_b: [u8; 50],
        team_b_len: u8,
        match_date: i64,
    ) -> Result<()> {
        let parlay_match = &mut ctx.accounts.parlay_match;
        let tournament = &ctx.accounts.tournament;
        
        // Validate string lengths
        security_checks::validate_string_length(match_id_len as usize, 32)?;
        security_checks::validate_string_length(market_string_len as usize, 50)?;
        security_checks::validate_string_length(team_a_len as usize, 50)?;
        security_checks::validate_string_length(team_b_len as usize, 50)?;
        
        // Validate match is within tournament period
        require!(
            match_date >= tournament.start_date && match_date <= tournament.end_date,
            ErrorCode::InvalidResolutionDate
        );
        
        // Initialize match
        parlay_match.tournament_id = tournament.tournament_id;
        
        parlay_match.match_id = [0u8; 32];
        parlay_match.match_id[..match_id_len as usize].copy_from_slice(&match_id[..match_id_len as usize]);
        parlay_match.match_id_len = match_id_len;
        
        parlay_match.market_string = [0u8; 50];
        parlay_match.market_string[..market_string_len as usize].copy_from_slice(&market_string[..market_string_len as usize]);
        parlay_match.market_string_len = market_string_len;
        
        parlay_match.team_a = [0u8; 50];
        parlay_match.team_a[..team_a_len as usize].copy_from_slice(&team_a[..team_a_len as usize]);
        parlay_match.team_a_len = team_a_len;
        
        parlay_match.team_b = [0u8; 50];
        parlay_match.team_b[..team_b_len as usize].copy_from_slice(&team_b[..team_b_len as usize]);
        parlay_match.team_b_len = team_b_len;
        
        parlay_match.match_date = match_date;
        parlay_match.status = MatchStatus::Scheduled;
        parlay_match.winner = None;
        parlay_match.resolution_date = None;
        
        msg!("Parlay match created: {} vs {}", 
             String::from_utf8_lossy(&team_a[..team_a_len as usize]),
             String::from_utf8_lossy(&team_b[..team_b_len as usize]));
        msg!("Match ID: {}", String::from_utf8_lossy(&match_id[..match_id_len as usize]));
        msg!("Market string: {}", String::from_utf8_lossy(&market_string[..market_string_len as usize]));
        
        Ok(())
    }

    pub fn place_parlay_bet(
        ctx: Context<PlaceParlayBet>,
        bet_id: [u8; 32],
        bet_id_len: u8,
        stake_amount: u64,
        selection_count: u8, // Number of selections (will be created separately)
    ) -> Result<()> {
        let parlay_bet = &mut ctx.accounts.parlay_bet;
        let tournament = &mut ctx.accounts.tournament;
        let platform_state = &ctx.accounts.platform_state;
        
        // Security validations
        require!(!platform_state.is_paused, ErrorCode::PlatformPaused);
        require!(tournament.status == TournamentStatus::Active, ErrorCode::TournamentNotActive);
        
        let current_time = Clock::get()?.unix_timestamp;
        require!(current_time >= tournament.start_date, ErrorCode::TournamentNotActive);
        require!(current_time <= tournament.end_date, ErrorCode::TournamentNotActive);
        
        // Validate selections count
        require!(
            selection_count >= tournament.min_selections,
            ErrorCode::InsufficientParlaySelections
        );
        require!(
            selection_count <= tournament.max_selections,
            ErrorCode::InvalidParlaySelections
        );
        
        // Validate bet amount
        security_checks::validate_bet_amount(stake_amount, 10 * 1_000_000)?; // Min 10 APES
        
        // Calculate multiplier using tournament settings
        let total_multiplier = tournament.base_multiplier + 
            (tournament.multiplier_increment * (selection_count.saturating_sub(1)) as u64);
        
        // Calculate potential payout
        let potential_payout = security_checks::safe_mul(stake_amount, total_multiplier)?
            .checked_div(1000)
            .ok_or(ErrorCode::CalculationError)?;
        
        // Check exposure limits
        let new_exposure = tournament.current_exposure
            .checked_add(potential_payout)
            .ok_or(ErrorCode::CalculationError)?;
        require!(new_exposure <= tournament.max_exposure, ErrorCode::PoolOverflow);
        
        // Calculate fees using same rates as regular betting
        let burn_amount = security_checks::safe_div(
            security_checks::safe_mul(stake_amount, platform_state.bet_burn_rate)?,
            10000
        )?;
        
        let platform_fee = security_checks::safe_div(
            security_checks::safe_mul(stake_amount, platform_state.platform_fee_rate)?,
            10000
        )?;
        
        let net_amount = security_checks::safe_sub(
            security_checks::safe_sub(stake_amount, burn_amount)?,
            platform_fee
        )?;
        
        // Transfer tokens
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.user_token_account.to_account_info(),
                    to: ctx.accounts.parlay_escrow.to_account_info(),
                    authority: ctx.accounts.user.to_account_info(),
                },
            ),
            net_amount,
        )?;
        
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.user_token_account.to_account_info(),
                    to: ctx.accounts.burn_token_account.to_account_info(),
                    authority: ctx.accounts.user.to_account_info(),
                },
            ),
            burn_amount,
        )?;
        
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.user_token_account.to_account_info(),
                    to: ctx.accounts.treasury_token_account.to_account_info(),
                    authority: ctx.accounts.user.to_account_info(),
                },
            ),
            platform_fee,
        )?;
        
        // Initialize parlay bet
        parlay_bet.bet_id = [0u8; 32];
        parlay_bet.bet_id[..bet_id_len as usize].copy_from_slice(&bet_id[..bet_id_len as usize]);
        parlay_bet.bet_id_len = bet_id_len;
        parlay_bet.tournament_id = tournament.tournament_id;
        parlay_bet.user = ctx.accounts.user.key();
        parlay_bet.stake_amount = stake_amount;
        parlay_bet.potential_payout = potential_payout;
        parlay_bet.total_multiplier = total_multiplier;
        parlay_bet.selection_count = selection_count;
        parlay_bet.placed_at = current_time;
        parlay_bet.status = ParlayStatus::Pending;
        parlay_bet.resolved_at = None;
        parlay_bet.payout_claimed = false;
        
        // Update tournament stats
        tournament.total_volume = tournament.total_volume
            .checked_add(stake_amount)
            .ok_or(ErrorCode::CalculationError)?;
        tournament.total_parlays = tournament.total_parlays
            .checked_add(1)
            .ok_or(ErrorCode::CalculationError)?;
        tournament.current_exposure = new_exposure;
        
        msg!("Parlay bet placed!");
        msg!("Bet ID: {}", String::from_utf8_lossy(&bet_id[..bet_id_len as usize]));
        msg!("Stake: {} APES", stake_amount as f64 / 1_000_000.0);
        msg!("Selections: {}", selection_count);
        msg!("Multiplier: {}x", total_multiplier as f64 / 1000.0);
        msg!("Potential payout: {} APES", potential_payout as f64 / 1_000_000.0);
        msg!("Burn: {} APES", burn_amount as f64 / 1_000_000.0);
        
        Ok(())
    }

    pub fn resolve_parlay_match(
        ctx: Context<ResolveParlayMatch>,
        winner: u8, // 0 = team_a, 1 = team_b
    ) -> Result<()> {
        let parlay_match = &mut ctx.accounts.parlay_match;
        
        // Validate winner
        require!(winner <= 1, ErrorCode::InvalidOptionIndex);
        
        // Update match status
        parlay_match.status = MatchStatus::Completed;
        parlay_match.winner = Some(winner);
        parlay_match.resolution_date = Some(Clock::get()?.unix_timestamp);
        
        let team_a_str = String::from_utf8_lossy(&parlay_match.team_a[..parlay_match.team_a_len as usize]);
        let team_b_str = String::from_utf8_lossy(&parlay_match.team_b[..parlay_match.team_b_len as usize]);
        let winner_name = if winner == 0 { &team_a_str } else { &team_b_str };
        
        msg!("Match resolved: {} vs {}", team_a_str, team_b_str);
        msg!("Winner: {}", winner_name);
        msg!("Match ID: {}", String::from_utf8_lossy(&parlay_match.match_id[..parlay_match.match_id_len as usize]));
        
        Ok(())
    }

    pub fn claim_parlay_reward(ctx: Context<ClaimParlayReward>) -> Result<()> {
        let parlay_bet = &mut ctx.accounts.parlay_bet;
        let platform_state = &ctx.accounts.platform_state;
        
        // Calculate claim burn fee
        let burn_amount = security_checks::safe_div(
            security_checks::safe_mul(parlay_bet.potential_payout, platform_state.claim_burn_rate)?,
            10000
        )?;
        
        let net_payout = security_checks::safe_sub(parlay_bet.potential_payout, burn_amount)?;
        
        // Ensure escrow has enough balance
        let escrow_balance = ctx.accounts.parlay_escrow.amount;
        require!(
            parlay_bet.potential_payout <= escrow_balance,
            ErrorCode::InsufficientEscrowBalance
        );
        
        // Transfer payout to user
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.parlay_escrow.to_account_info(),
                    to: ctx.accounts.user_token_account.to_account_info(),
                    authority: ctx.accounts.parlay_escrow.to_account_info(),
                },
                &[&[
                    b"parlay_escrow",
                    parlay_bet.key().as_ref(),
                    &[ctx.bumps.parlay_escrow],
                ]],
            ),
            net_payout,
        )?;
        
        // Transfer burn amount
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.parlay_escrow.to_account_info(),
                    to: ctx.accounts.burn_token_account.to_account_info(),
                    authority: ctx.accounts.parlay_escrow.to_account_info(),
                },
                &[&[
                    b"parlay_escrow",
                    parlay_bet.key().as_ref(),
                    &[ctx.bumps.parlay_escrow],
                ]],
            ),
            burn_amount,
        )?;
        
        // Mark as claimed
        parlay_bet.payout_claimed = true;
        
        msg!("Parlay reward claimed!");
        msg!("User: {}", parlay_bet.user);
        msg!("Payout: {} APES", parlay_bet.potential_payout as f64 / 1_000_000.0);
        msg!("Burn: {} APES", burn_amount as f64 / 1_000_000.0);
        msg!("Net payout: {} APES", net_payout as f64 / 1_000_000.0);
        
        Ok(())
    }
}

#[error_code]
pub enum ErrorCode {
    #[msg("Unauthorized access")]
    Unauthorized,
    #[msg("Market is not active")]
    MarketNotActive,
    #[msg("Market is not resolved")]
    MarketNotResolved,
    #[msg("Market is closed for predictions")]
    MarketClosed,
    #[msg("Invalid option index")]
    InvalidOptionIndex,
    #[msg("Bet amount too small")]
    BetTooSmall,
    #[msg("Calculation error")]
    CalculationError,
    #[msg("Platform is paused")]
    PlatformPaused,
    #[msg("Invalid token mint")]
    InvalidMint,
    #[msg("Reward already claimed")]
    AlreadyClaimed,
    #[msg("Not a winning prediction")]
    NotWinner,
    #[msg("Invalid market")]
    InvalidMarket,
    #[msg("Fee too high")]
    FeeTooHigh,
    #[msg("Insufficient options")]
    InsufficientOptions,
    #[msg("Too many options")]
    TooManyOptions,
    #[msg("Invalid resolution date")]
    InvalidResolutionDate,
    #[msg("Too many market creators")]
    TooManyMarketCreators,
    #[msg("Pool overflow")]
    PoolOverflow,
    #[msg("Division by zero")]
    DivisionByZero,
    #[msg("Invalid amount")]
    InvalidAmount,
    #[msg("Insufficient escrow balance")]
    InsufficientEscrowBalance,
    #[msg("Market is not cancelled")]
    MarketNotCancelled,
    #[msg("Tournament not found")]
    TournamentNotFound,
    #[msg("Tournament not active")]
    TournamentNotActive,
    #[msg("Invalid parlay selections")]
    InvalidParlaySelections,
    #[msg("Insufficient selections for parlay")]
    InsufficientParlaySelections,
    #[msg("Parlay already resolved")]
    ParlayAlreadyResolved,
    #[msg("Match not found")]
    MatchNotFound,
    #[msg("Invalid tournament")]
    InvalidTournament,
    #[msg("Parlay not eligible for payout")]
    ParlayNotEligible,
    #[msg("Invalid match")]
    InvalidMatch,
}

// ============================================================================
// PARLAY SYSTEM EXTENSION
// ============================================================================

#[account]
pub struct ParlayTournament {
    pub tournament_id: [u8; 32],        // Tournament identifier
    pub tournament_id_len: u8,          // Actual length
    pub name: [u8; 100],                // Tournament name
    pub name_len: u8,                   // Actual length
    pub authority: Pubkey,              // Tournament authority
    pub token_mint: Pubkey,             // APES token mint
    pub treasury: Pubkey,               // Treasury account
    pub status: TournamentStatus,       // Active/Completed/Cancelled
    pub start_date: i64,                // Tournament start
    pub end_date: i64,                  // Tournament end
    pub min_selections: u8,             // Minimum selections for parlay (default 2)
    pub max_selections: u8,             // Maximum selections for parlay (default 10)
    pub base_multiplier: u64,           // Base multiplier (1.8x = 1800)
    pub multiplier_increment: u64,      // Increment per selection (0.5x = 500)
    pub total_volume: u64,              // Total betting volume
    pub total_participants: u64,        // Total unique bettors
    pub total_parlays: u64,             // Total parlay bets
    pub max_exposure: u64,              // Maximum exposure limit
    pub current_exposure: u64,          // Current exposure
}

impl ParlayTournament {
    pub const LEN: usize = 32 + // tournament_id
                           1 +  // tournament_id_len
                           100 + // name
                           1 +  // name_len
                           32 + // authority
                           32 + // token_mint
                           32 + // treasury
                           33 + // status (enum with padding)
                           8 +  // start_date
                           8 +  // end_date
                           1 +  // min_selections
                           1 +  // max_selections
                           8 +  // base_multiplier
                           8 +  // multiplier_increment
                           8 +  // total_volume
                           8 +  // total_participants
                           8 +  // total_parlays
                           8 +  // max_exposure
                           8;   // current_exposure
}

#[account]
pub struct ParlayMatch {
    pub tournament_id: [u8; 32],        // Parent tournament
    pub match_id: [u8; 32],             // Unique match identifier
    pub match_id_len: u8,               // Actual length
    pub market_string: [u8; 50],        // Market identifier for betting
    pub market_string_len: u8,          // Actual length
    pub team_a: [u8; 50],               // Team A name
    pub team_a_len: u8,                 // Actual length
    pub team_b: [u8; 50],               // Team B name
    pub team_b_len: u8,                 // Actual length
    pub match_date: i64,                // Match date/time
    pub status: MatchStatus,            // Scheduled/Live/Completed
    pub winner: Option<u8>,             // 0 = team_a, 1 = team_b
    pub resolution_date: Option<i64>,   // When match was resolved
}

impl ParlayMatch {
    pub const LEN: usize = 32 + // tournament_id
                           32 + // match_id
                           1 +  // match_id_len
                           50 + // market_string
                           1 +  // market_string_len
                           50 + // team_a
                           1 +  // team_a_len
                           50 + // team_b
                           1 +  // team_b_len
                           8 +  // match_date
                           33 + // status (enum with padding)
                           2 +  // winner (Option<u8>)
                           9;   // resolution_date (Option<i64>)
}

#[account]
pub struct ParlayBet {
    pub bet_id: [u8; 32],               // Unique bet identifier
    pub bet_id_len: u8,                 // Actual length
    pub tournament_id: [u8; 32],        // Parent tournament
    pub user: Pubkey,                   // Bettor
    pub stake_amount: u64,              // Bet amount in APES
    pub potential_payout: u64,          // Potential payout
    pub total_multiplier: u64,          // Total multiplier (e.g., 2800 = 2.8x)
    pub selection_count: u8,            // Number of selections
    pub placed_at: i64,                 // Timestamp
    pub status: ParlayStatus,           // Pending/Won/Lost
    pub resolved_at: Option<i64>,       // When parlay was resolved
    pub payout_claimed: bool,           // Whether payout was claimed
}

impl ParlayBet {
    pub const LEN: usize = 32 + // bet_id
                           1 +  // bet_id_len
                           32 + // tournament_id
                           32 + // user
                           8 +  // stake_amount
                           8 +  // potential_payout
                           8 +  // total_multiplier
                           1 +  // selection_count
                           8 +  // placed_at
                           33 + // status (enum with padding)
                           9 +  // resolved_at (Option<i64>)
                           1;   // payout_claimed
}

#[account]
pub struct ParlaySelection {
    pub bet_id: [u8; 32],               // Parent bet
    pub match_id: [u8; 32],             // Selected match
    pub selected_team: u8,              // 0 = team_a, 1 = team_b
    pub is_correct: Option<bool>,       // Whether selection was correct
}

impl ParlaySelection {
    pub const LEN: usize = 32 + // bet_id
                           32 + // match_id
                           1 +  // selected_team
                           2;   // is_correct (Option<bool>)
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, Debug)]
pub enum TournamentStatus {
    Active,
    Completed,
    Cancelled,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, Debug)]
pub enum MatchStatus {
    Scheduled,
    Live,
    Completed,
    Cancelled,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, Debug)]
pub enum ParlayStatus {
    Pending,
    Won,
    Lost,
}
